'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createRecipeService } from '@/modules/recipes/services/recipe-service'

/**
 * Server action that hard-deletes a recipe and all its child rows.
 *
 * Cascades through `recipe_sections`, `recipe_steps`, `recipe_step_paints`,
 * `recipe_notes`, and `recipe_photos`. The service collects every
 * `storage_path` under the recipe before the cascade runs and batch-removes
 * the Storage objects after, so no orphaned blobs are left behind.
 *
 * On success, revalidates `/user/recipes` and `/recipes` and redirects to
 * `/user/recipes`. On auth failure or a missing ID, returns an error object
 * without redirecting.
 *
 * @param id - The UUID of the recipe to delete.
 * @returns `undefined` on success (redirect fires); `{ error: string }` on failure.
 */
export async function deleteRecipe(id: string): Promise<{ error: string } | undefined> {
  if (!id) return { error: 'Recipe ID is required.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in to delete a recipe.' }

  const service = createRecipeService(supabase)

  try {
    await service.deleteRecipe(id)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete recipe.'
    return { error: message }
  }

  revalidatePath('/user/recipes')
  revalidatePath('/recipes')
  redirect('/user/recipes')
}
