'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createRecipeService } from '@/modules/recipes/services/recipe-service'
import { validateRecipeForm } from '@/modules/recipes/validation'
import type { RecipeFormState } from '@/modules/recipes/types/recipe-form-state'

/**
 * Server action that updates an existing recipe's metadata fields.
 *
 * Intended for use with React 19's `useActionState`. Updates title, summary,
 * visibility, and palette pin. Cover photo and `coverPhotoId` are managed by
 * a separate photo-management action (see `03-recipe-photos`). On success,
 * revalidates `/user/recipes`, `/recipes`, `/recipes/{id}`, and
 * `/recipes/{id}/edit`, then returns a success state.
 *
 * @param _prevState - Previous action state (required by `useActionState`).
 * @param formData - Form data submitted by the user. Must include `id`.
 * @returns {@link RecipeFormState} reflecting success or failure.
 */
export async function updateRecipe(
  _prevState: RecipeFormState,
  formData: FormData,
): Promise<RecipeFormState> {
  const id = (formData.get('id') as string | null) ?? ''
  const title = ((formData.get('title') as string | null) ?? '').trim()
  const summary = ((formData.get('summary') as string | null) ?? '').trim()
  const rawPaletteId = ((formData.get('paletteId') as string | null) ?? '').trim()
  const paletteId = rawPaletteId || null
  const isPublic = formData.get('isPublic') === 'true'

  const values: RecipeFormState['values'] = { title, summary, isPublic, paletteId }

  if (!id) {
    return { values, errors: { form: 'Recipe ID is required.' } }
  }

  const fieldErrors = validateRecipeForm({ title, summary })
  if (Object.keys(fieldErrors).length > 0) {
    return { values, errors: fieldErrors }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { values, errors: { form: 'You must be signed in to update a recipe.' } }
  }

  const service = createRecipeService(supabase)

  try {
    await service.updateRecipe(id, {
      title,
      summary: summary || null,
      paletteId,
      isPublic,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update recipe.'
    return { values, errors: { form: message } }
  }

  revalidatePath('/user/recipes')
  revalidatePath('/recipes')
  revalidatePath(`/recipes/${id}`)
  revalidatePath(`/recipes/${id}/edit`)

  return { values, errors: {}, success: true }
}
