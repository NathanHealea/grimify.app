'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createRecipeService } from '@/modules/recipes/services/recipe-service'
import type { RecipeNoteParent } from '@/modules/recipes/types/recipe-note-parent'

/**
 * Server action that persists a new order for a parent's notes.
 *
 * Works for both recipe-level (`parent.kind === 'recipe'`) and step-level
 * (`parent.kind === 'step'`) note lists. Validates that `orderedNoteIds`
 * is a permutation of the parent's existing notes — cross-parent moves
 * are rejected. Verifies ownership through the parent's recipe.
 *
 * @param parent - Discriminated union identifying the note list's parent.
 * @param orderedNoteIds - Note UUIDs in the desired order, head first.
 * @returns `undefined` on success; `{ error: string }` on failure.
 */
export async function reorderRecipeNotes(
  parent: RecipeNoteParent,
  orderedNoteIds: string[],
): Promise<{ error: string } | undefined> {
  if (!parent || !Array.isArray(orderedNoteIds)) {
    return { error: 'Invalid reorder request.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in to reorder notes.' }

  let recipeId: string
  if (parent.kind === 'recipe') {
    const { data, error } = await supabase
      .from('recipes')
      .select('id, user_id')
      .eq('id', parent.recipeId)
      .maybeSingle()
    if (error) return { error: error.message }
    if (!data) return { error: 'Recipe not found.' }
    if (data.user_id !== user.id) {
      return { error: 'You can only reorder notes on your own recipes.' }
    }
    recipeId = data.id as string
  } else {
    const { data, error } = await supabase
      .from('recipe_steps')
      .select('recipe_sections!inner(recipe_id, recipes!inner(user_id))')
      .eq('id', parent.stepId)
      .maybeSingle()
    if (error) return { error: error.message }
    if (!data) return { error: 'Step not found.' }
    const section = data.recipe_sections as unknown as
      | { recipe_id: string; recipes: { user_id: string } | null }
      | null
    if (!section?.recipe_id || section.recipes?.user_id !== user.id) {
      return { error: 'You can only reorder notes on your own recipes.' }
    }
    recipeId = section.recipe_id
  }

  const existingFilter = supabase.from('recipe_notes').select('id')
  const existingQuery =
    parent.kind === 'recipe'
      ? existingFilter.eq('recipe_id', parent.recipeId)
      : existingFilter.eq('step_id', parent.stepId)

  const { data: existing, error: existingError } = await existingQuery
  if (existingError) return { error: existingError.message }

  const existingIds = new Set((existing ?? []).map((r) => r.id as string))
  if (existingIds.size !== orderedNoteIds.length) {
    return { error: "Reorder list does not match the parent's notes." }
  }
  for (const id of orderedNoteIds) {
    if (!existingIds.has(id)) {
      return { error: "Reorder list does not match the parent's notes." }
    }
  }

  const service = createRecipeService(supabase)
  try {
    await service.setRecipeNotes(
      parent,
      orderedNoteIds.map((id, index) => ({ id, position: index })),
    )
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to reorder notes.' }
  }

  revalidatePath(`/user/recipes/${recipeId}/edit`)
  revalidatePath(`/recipes/${recipeId}`)
}
