'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createRecipeService } from '@/modules/recipes/services/recipe-service'
import type { RecipeSection } from '@/modules/recipes/types/recipe-section'

/**
 * Server action that appends a new section to a recipe.
 *
 * Verifies the caller owns the parent recipe, then inserts at `position =
 * max + 1`. Revalidates the builder and public detail pages on success.
 * Validation: title trimmed, 1–120 chars.
 *
 * @param recipeId - UUID of the parent recipe.
 * @param title - Section heading (1–120 chars after trim).
 * @returns The created section on success; `{ error: string }` on failure.
 */
export async function addRecipeSection(
  recipeId: string,
  title: string,
): Promise<{ section: RecipeSection } | { error: string }> {
  if (!recipeId) return { error: 'Recipe ID is required.' }

  const trimmed = title.trim()
  if (!trimmed) return { error: 'Section title is required.' }
  if (trimmed.length > 120) return { error: 'Section title must be 120 characters or fewer.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in to edit a recipe.' }

  const { data: recipe, error: ownerError } = await supabase
    .from('recipes')
    .select('user_id')
    .eq('id', recipeId)
    .maybeSingle()

  if (ownerError) return { error: ownerError.message }
  if (!recipe) return { error: 'Recipe not found.' }
  if (recipe.user_id !== user.id) {
    return { error: 'You can only edit recipes you own.' }
  }

  const service = createRecipeService(supabase)

  let section: RecipeSection
  try {
    section = await service.addSection(recipeId, trimmed)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to add section.' }
  }

  revalidatePath(`/user/recipes/${recipeId}/edit`)
  revalidatePath(`/recipes/${recipeId}`)

  return { section }
}
