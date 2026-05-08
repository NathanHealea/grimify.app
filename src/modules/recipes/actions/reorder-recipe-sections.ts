'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createRecipeService } from '@/modules/recipes/services/recipe-service'

/**
 * Server action that persists a new section order for a recipe.
 *
 * Verifies the caller owns the recipe and that `orderedSectionIds` is a
 * permutation of the recipe's existing sections (set check by id). Writes
 * via {@link setSections}, which performs a two-phase negative-offset
 * update so the unique constraint on `(recipe_id, position)` is respected.
 *
 * @param recipeId - UUID of the parent recipe.
 * @param orderedSectionIds - Section UUIDs in the desired order, head first.
 * @returns `undefined` on success; `{ error: string }` on failure.
 */
export async function reorderRecipeSections(
  recipeId: string,
  orderedSectionIds: string[],
): Promise<{ error: string } | undefined> {
  if (!recipeId || !Array.isArray(orderedSectionIds)) {
    return { error: 'Invalid reorder request.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in to reorder a recipe.' }

  const { data: recipe, error: ownerError } = await supabase
    .from('recipes')
    .select('user_id')
    .eq('id', recipeId)
    .maybeSingle()

  if (ownerError) return { error: ownerError.message }
  if (!recipe) return { error: 'Recipe not found.' }
  if (recipe.user_id !== user.id) {
    return { error: 'You can only reorder recipes you own.' }
  }

  const { data: existing, error: existingError } = await supabase
    .from('recipe_sections')
    .select('id')
    .eq('recipe_id', recipeId)

  if (existingError) return { error: existingError.message }

  const existingIds = new Set((existing ?? []).map((row) => row.id as string))
  if (existingIds.size !== orderedSectionIds.length) {
    return { error: 'Reorder list does not match recipe sections.' }
  }
  for (const id of orderedSectionIds) {
    if (!existingIds.has(id)) {
      return { error: 'Reorder list does not match recipe sections.' }
    }
  }

  const service = createRecipeService(supabase)
  try {
    await service.setSections(
      recipeId,
      orderedSectionIds.map((id, index) => ({ id, position: index })),
    )
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to reorder sections.' }
  }

  revalidatePath(`/user/recipes/${recipeId}/edit`)
  revalidatePath(`/recipes/${recipeId}`)
}
