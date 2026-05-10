'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createRecipeService } from '@/modules/recipes/services/recipe-service'
import type { RecipeNote } from '@/modules/recipes/types/recipe-note'
import type { RecipeNoteParent } from '@/modules/recipes/types/recipe-note-parent'

const NOTE_BODY_MAX = 5000

/**
 * Server action that appends a new note to a recipe-level or step-level parent.
 *
 * Verifies ownership of the parent recipe (directly when `parent.kind === 'recipe'`,
 * or transitively via `step → section → recipe` when `parent.kind === 'step'`).
 * Trims the body and rejects empties or values longer than 5000 chars before
 * delegating to {@link createRecipeService.addNote}. Revalidates the builder
 * and detail routes so the new note appears immediately.
 *
 * @param parent - Discriminated union identifying the note's parent.
 * @param body - Markdown body (1–5000 chars after trim).
 * @returns The created {@link RecipeNote} on success; `{ error: string }` on failure.
 */
export async function addRecipeNote(
  parent: RecipeNoteParent,
  body: string,
): Promise<{ note: RecipeNote } | { error: string }> {
  if (!parent) return { error: 'Parent reference is required.' }

  const trimmed = (body ?? '').trim()
  if (trimmed.length === 0) return { error: 'Note body is required.' }
  if (trimmed.length > NOTE_BODY_MAX) {
    return { error: `Note body must be ${NOTE_BODY_MAX} characters or fewer.` }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in to add notes.' }

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
      return { error: 'You can only edit recipes you own.' }
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
      return { error: 'You can only edit recipes you own.' }
    }
    recipeId = section.recipe_id
  }

  const service = createRecipeService(supabase)

  let note: RecipeNote
  try {
    note = await service.addNote(parent, trimmed)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to add note.' }
  }

  revalidatePath(`/user/recipes/${recipeId}/edit`)
  revalidatePath(`/recipes/${recipeId}`)
  return { note }
}
