'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createRecipeService } from '@/modules/recipes/services/recipe-service'
import type { RecipePhoto } from '@/modules/recipes/types/recipe-photo'

/**
 * Server action that updates a photo's caption.
 *
 * Verifies ownership through the photo's parent recipe (either directly via
 * `recipe_id` or transitively via `step → section → recipe`). Pass an empty
 * string to clear the caption. Captions are limited to 200 characters after
 * trim.
 *
 * @param photoId - The photo UUID.
 * @param patch.caption - New caption value (≤200 chars; `''`/whitespace clears).
 * @returns The updated {@link RecipePhoto} on success; `{ error: string }` on failure.
 */
export async function updateRecipePhoto(
  photoId: string,
  patch: { caption?: string | null },
): Promise<{ photo: RecipePhoto } | { error: string }> {
  if (!photoId) return { error: 'Photo ID is required.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in to edit photos.' }

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
    return { error: 'You can only edit photos on your own recipes.' }
  }

  let caption: string | null | undefined
  if (patch.caption !== undefined) {
    if (patch.caption === null) {
      caption = null
    } else {
      const trimmed = patch.caption.trim()
      if (trimmed.length > 200) {
        return { error: 'Caption must be 200 characters or fewer.' }
      }
      caption = trimmed.length === 0 ? null : trimmed
    }
  }

  const service = createRecipeService(supabase)
  let photo: RecipePhoto
  try {
    photo = await service.updateRecipePhoto(photoId, { caption })
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to update photo.' }
  }

  revalidatePath(`/user/recipes/${recipeId}/edit`)
  revalidatePath(`/recipes/${recipeId}`)
  return { photo }
}
