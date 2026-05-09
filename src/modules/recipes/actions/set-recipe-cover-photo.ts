'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createRecipeService } from '@/modules/recipes/services/recipe-service'

/**
 * Server action that sets (or clears) a recipe's cover photo.
 *
 * Verifies the caller owns the recipe, then delegates to
 * {@link setCoverPhoto} which validates that the chosen photo (when not
 * null) is a recipe-level photo whose `recipe_id` matches the target
 * recipe — step-level photos cannot be covers. The cover surfaces on the
 * dashboard card and at the top of the read view.
 *
 * @param recipeId - The recipe UUID.
 * @param photoId - Photo UUID to make the cover, or `null` to clear.
 * @returns `undefined` on success; `{ error: string }` on failure.
 */
export async function setRecipeCoverPhoto(
  recipeId: string,
  photoId: string | null,
): Promise<{ error: string } | undefined> {
  if (!recipeId) return { error: 'Recipe ID is required.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in to update the cover photo.' }

  const { data: recipe, error: ownerError } = await supabase
    .from('recipes')
    .select('id, user_id')
    .eq('id', recipeId)
    .maybeSingle()

  if (ownerError) return { error: ownerError.message }
  if (!recipe) return { error: 'Recipe not found.' }
  if (recipe.user_id !== user.id) {
    return { error: 'You can only edit recipes you own.' }
  }

  const service = createRecipeService(supabase)
  try {
    await service.setCoverPhoto(recipeId, photoId)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to set cover photo.' }
  }

  revalidatePath('/user/recipes')
  revalidatePath('/recipes')
  revalidatePath(`/user/recipes/${recipeId}/edit`)
  revalidatePath(`/recipes/${recipeId}`)
}
