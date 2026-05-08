'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createRecipeService } from '@/modules/recipes/services/recipe-service'
import { validateRecipeForm } from '@/modules/recipes/validation'
import type { RecipeFormState } from '@/modules/recipes/types/recipe-form-state'

const DEFAULT_STATE: RecipeFormState = {
  values: { title: '', summary: '', isPublic: false, paletteId: null },
  errors: {},
}

/**
 * Server action that creates a new empty recipe for the authenticated user.
 *
 * Intended for use with React 19's `useActionState`. On success, revalidates
 * `/user/recipes` and `/recipes` then redirects to `/recipes/{id}/edit`. On
 * validation or auth failure, returns a {@link RecipeFormState} with error
 * messages.
 *
 * Default recipe title is `"Untitled recipe"` when the field is left blank.
 *
 * @param _prevState - Previous action state (required by `useActionState`).
 * @param formData - Form data submitted by the user.
 * @returns {@link RecipeFormState} on failure; redirects on success.
 */
export async function createRecipe(
  _prevState: RecipeFormState,
  formData: FormData,
): Promise<RecipeFormState> {
  const rawTitle = (formData.get('title') as string | null) ?? ''
  const rawSummary = (formData.get('summary') as string | null) ?? ''
  const rawPaletteId = (formData.get('paletteId') as string | null) ?? ''
  const isPublic = formData.get('isPublic') === 'true'

  const title = rawTitle.trim() || 'Untitled recipe'
  const summary = rawSummary.trim()
  const paletteId = rawPaletteId.trim() || null

  const values: RecipeFormState['values'] = { title, summary, isPublic, paletteId }

  const fieldErrors = validateRecipeForm({ title, summary })
  if (Object.keys(fieldErrors).length > 0) {
    return { values, errors: fieldErrors }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ...DEFAULT_STATE, errors: { form: 'You must be signed in to create a recipe.' } }
  }

  const service = createRecipeService(supabase)

  let recipe
  try {
    recipe = await service.createRecipe({
      userId: user.id,
      title,
      summary: summary || null,
      paletteId,
      isPublic,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create recipe.'
    return { values, errors: { form: message } }
  }

  revalidatePath('/user/recipes')
  revalidatePath('/recipes')
  redirect(`/recipes/${recipe.id}/edit`)
}
