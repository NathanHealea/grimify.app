'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createRecipeService } from '@/modules/recipes/services/recipe-service'

/**
 * Server action that deletes a note and renumbers its remaining siblings.
 *
 * Verifies ownership through the parent recipe, then delegates to
 * {@link createRecipeService.deleteNote}. After deletion, fetches the
 * surviving siblings under the same parent (recipe-level or step-level)
 * and renumbers them to a contiguous `0..N-1` range so the list order
 * stays intact.
 *
 * @param noteId - UUID of the note to delete.
 * @returns `undefined` on success; `{ error: string }` on failure.
 */
export async function deleteRecipeNote(
  noteId: string,
): Promise<{ error: string } | undefined> {
  if (!noteId) return { error: 'Note ID is required.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in to delete notes.' }

  const { data: row, error: ownerError } = await supabase
    .from('recipe_notes')
    .select(
      `
      recipe_id, step_id,
      recipes:recipe_id(id, user_id),
      recipe_steps:step_id(recipe_sections!inner(recipe_id, recipes!inner(user_id)))
    `,
    )
    .eq('id', noteId)
    .maybeSingle()

  if (ownerError) return { error: ownerError.message }
  if (!row) return { error: 'Note not found.' }

  type RecipeJoin = { id: string; user_id: string } | null
  type StepJoin = {
    recipe_sections: { recipe_id: string; recipes: { user_id: string } | null } | null
  } | null

  const recipeJoin = row.recipes as unknown as RecipeJoin
  const stepJoin = row.recipe_steps as unknown as StepJoin

  const ownerId = recipeJoin?.user_id ?? stepJoin?.recipe_sections?.recipes?.user_id
  const recipeId = recipeJoin?.id ?? stepJoin?.recipe_sections?.recipe_id

  if (!ownerId || ownerId !== user.id || !recipeId) {
    return { error: 'You can only delete notes on your own recipes.' }
  }

  const service = createRecipeService(supabase)

  try {
    const removed = await service.deleteNote(noteId)

    const parent = removed.recipeId
      ? ({ kind: 'recipe', recipeId: removed.recipeId } as const)
      : removed.stepId
        ? ({ kind: 'step', stepId: removed.stepId } as const)
        : null

    if (parent) {
      const positionFilter = supabase
        .from('recipe_notes')
        .select('id, position')
        .order('position', { ascending: true })
      const remainingQuery =
        parent.kind === 'recipe'
          ? positionFilter.eq('recipe_id', parent.recipeId)
          : positionFilter.eq('step_id', parent.stepId)

      const { data: remaining, error: remainingError } = await remainingQuery
      if (remainingError) return { error: remainingError.message }

      if (remaining && remaining.length > 0) {
        await service.setRecipeNotes(
          parent,
          remaining.map((r, index) => ({ id: r.id as string, position: index })),
        )
      }
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to delete note.' }
  }

  revalidatePath(`/user/recipes/${recipeId}/edit`)
  revalidatePath(`/recipes/${recipeId}`)
}
