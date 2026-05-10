import { createClient } from '@/lib/supabase/server'

import { createRecipeService } from '@/modules/recipes/services/recipe-service'

/**
 * Creates a recipe service using the server-side Supabase client.
 *
 * Use in route loaders and server actions.
 *
 * @returns A {@link RecipeService} instance bound to the server client.
 */
export async function getRecipeService() {
  const supabase = await createClient()
  return createRecipeService(supabase)
}
