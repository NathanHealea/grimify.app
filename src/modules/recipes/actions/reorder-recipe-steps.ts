'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createRecipeService } from '@/modules/recipes/services/recipe-service'

/**
 * Server action that persists a new step order for a section.
 *
 * Verifies ownership through `recipe_sections → recipes` and that the
 * provided list is a permutation of the section's existing steps. Writes
 * via {@link setSteps}, two-phase negative-offset update to respect the
 * `(section_id, position)` unique constraint.
 *
 * Cross-section moves are out of scope for this action; the caller should
 * delete + re-add to relocate.
 *
 * @param sectionId - UUID of the parent section.
 * @param orderedStepIds - Step UUIDs in the desired order, head first.
 * @returns `undefined` on success; `{ error: string }` on failure.
 */
export async function reorderRecipeSteps(
  sectionId: string,
  orderedStepIds: string[],
): Promise<{ error: string } | undefined> {
  if (!sectionId || !Array.isArray(orderedStepIds)) {
    return { error: 'Invalid reorder request.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in to reorder a recipe.' }

  const { data: row, error: ownerError } = await supabase
    .from('recipe_sections')
    .select('recipe_id, recipes!inner(user_id)')
    .eq('id', sectionId)
    .maybeSingle()

  if (ownerError) return { error: ownerError.message }
  if (!row) return { error: 'Section not found.' }

  const ownerId = (row.recipes as unknown as { user_id: string } | null)?.user_id
  const recipeId = row.recipe_id as string
  if (!ownerId || ownerId !== user.id) {
    return { error: 'You can only reorder recipes you own.' }
  }

  const { data: existing, error: existingError } = await supabase
    .from('recipe_steps')
    .select('id')
    .eq('section_id', sectionId)

  if (existingError) return { error: existingError.message }

  const existingIds = new Set((existing ?? []).map((r) => r.id as string))
  if (existingIds.size !== orderedStepIds.length) {
    return { error: 'Reorder list does not match section steps.' }
  }
  for (const id of orderedStepIds) {
    if (!existingIds.has(id)) {
      return { error: 'Reorder list does not match section steps.' }
    }
  }

  const service = createRecipeService(supabase)
  try {
    await service.setSteps(
      sectionId,
      orderedStepIds.map((id, index) => ({ id, position: index })),
    )
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to reorder steps.' }
  }

  revalidatePath(`/user/recipes/${recipeId}/edit`)
  revalidatePath(`/recipes/${recipeId}`)
}
