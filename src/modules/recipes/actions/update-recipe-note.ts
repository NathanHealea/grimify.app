'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createRecipeService } from '@/modules/recipes/services/recipe-service'
import type { RecipeNote } from '@/modules/recipes/types/recipe-note'

const NOTE_BODY_MAX = 5000

/**
 * Server action that patches a note's mutable fields. Currently only `body`
 * is editable.
 *
 * Verifies ownership through the note's parent (either directly via
 * `recipe_id` or transitively via `step → section → recipe`). Trims the
 * body and rejects empties (callers should send a delete instead) or
 * values longer than 5000 chars before delegating to the service.
 *
 * @param noteId - The note UUID.
 * @param patch.body - New markdown body (1–5000 chars after trim).
 * @returns The updated {@link RecipeNote} on success; `{ error: string }` on failure.
 */
export async function updateRecipeNote(
  noteId: string,
  patch: { body?: string },
): Promise<{ note: RecipeNote } | { error: string }> {
  if (!noteId) return { error: 'Note ID is required.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in to edit notes.' }

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
    return { error: 'You can only edit notes on your own recipes.' }
  }

  let body: string | undefined
  if (patch.body !== undefined) {
    const trimmed = patch.body.trim()
    if (trimmed.length === 0) {
      return { error: 'Note body is required. Delete the note instead.' }
    }
    if (trimmed.length > NOTE_BODY_MAX) {
      return { error: `Note body must be ${NOTE_BODY_MAX} characters or fewer.` }
    }
    body = trimmed
  }

  const service = createRecipeService(supabase)
  let note: RecipeNote
  try {
    note = await service.updateNote(noteId, { body })
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to update note.' }
  }

  revalidatePath(`/user/recipes/${recipeId}/edit`)
  revalidatePath(`/recipes/${recipeId}`)
  return { note }
}
