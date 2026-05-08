import { createClient } from '@/lib/supabase/client'

import { createRecipeService } from '@/modules/recipes/services/recipe-service'

/**
 * Creates a recipe service using the browser-side Supabase client.
 *
 * Use in client components when direct data access is needed without a
 * server action round-trip.
 *
 * @returns A {@link RecipeService} instance bound to the browser client.
 */
export function getRecipeService() {
  return createRecipeService(createClient())
}
