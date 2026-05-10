'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createRecipeService } from '@/modules/recipes/services/recipe-service'

/**
 * Server action that deletes a photo and renumbers its remaining siblings.
 *
 * Verifies ownership through the parent recipe, then delegates to
 * {@link deleteRecipePhoto} which removes the row plus the Storage object.
 * After deletion, fetches the surviving siblings under the same parent
 * (recipe-level or step-level) and renumbers them to a contiguous
 * `0..N-1` range so the grid order stays intact.
 *
 * @param photoId - UUID of the photo to delete.
 * @returns `undefined` on success; `{ error: string }` on failure.
 */
export async function deleteRecipePhoto(
  photoId: string,
): Promise<{ error: string } | undefined> {
  if (!photoId) return { error: 'Photo ID is required.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in to delete photos.' }

  const { data: row, error: ownerError } = await supabase
    .from('recipe_photos')
    .select(
      `
      recipe_id, step_id,
      recipes:recipe_id(id, user_id),
      recipe_steps:step_id(recipe_sections!inner(recipe_id, recipes!inner(user_id)))
    `,
    )
    .eq('id', photoId)
    .maybeSingle()

  if (ownerError) return { error: ownerError.message }
  if (!row) return { error: 'Photo not found.' }

  type RecipeJoin = { id: string; user_id: string } | null
  type StepJoin = {
    recipe_sections: { recipe_id: string; recipes: { user_id: string } | null } | null
  } | null

  const recipeJoin = row.recipes as unknown as RecipeJoin
  const stepJoin = row.recipe_steps as unknown as StepJoin

  const ownerId = recipeJoin?.user_id ?? stepJoin?.recipe_sections?.recipes?.user_id
  const recipeId = recipeJoin?.id ?? stepJoin?.recipe_sections?.recipe_id

  if (!ownerId || ownerId !== user.id || !recipeId) {
    return { error: 'You can only delete photos on your own recipes.' }
  }

  const service = createRecipeService(supabase)

  try {
    const removed = await service.deleteRecipePhoto(photoId)

    const parent = removed.recipeId
      ? ({ kind: 'recipe', recipeId: removed.recipeId } as const)
      : removed.stepId
        ? ({ kind: 'step', stepId: removed.stepId } as const)
        : null

    if (parent) {
      const positionFilter = supabase
        .from('recipe_photos')
        .select('id, position')
        .order('position', { ascending: true })
      const remainingQuery =
        parent.kind === 'recipe'
          ? positionFilter.eq('recipe_id', parent.recipeId)
          : positionFilter.eq('step_id', parent.stepId)

      const { data: remaining, error: remainingError } = await remainingQuery
      if (remainingError) return { error: remainingError.message }

      if (remaining && remaining.length > 0) {
        await service.setRecipePhotos(
          parent,
          remaining.map((r, index) => ({ id: r.id as string, position: index })),
        )
      }
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to delete photo.' }
  }

  revalidatePath(`/user/recipes/${recipeId}/edit`)
  revalidatePath(`/recipes/${recipeId}`)
}
