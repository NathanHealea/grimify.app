'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createPaletteService } from '@/modules/palettes/services/palette-service'
import { validatePaletteForm } from '@/modules/palettes/validation'
import type { PaletteFormState } from '@/modules/palettes/types/palette-form-state'

/**
 * Server action that updates an existing palette's name, description, or
 * visibility.
 *
 * Intended for use with React 19's `useActionState`. On success, revalidates
 * `/palettes` and the palette detail path, then returns a success state. On
 * failure, returns a {@link PaletteFormState} with error messages.
 *
 * @param _prevState - Previous action state (required by `useActionState`).
 * @param formData - Form data submitted by the user. Must include `id`.
 * @returns {@link PaletteFormState} reflecting success or failure.
 */
export async function updatePalette(
  _prevState: PaletteFormState,
  formData: FormData,
): Promise<PaletteFormState> {
  const id = (formData.get('id') as string | null) ?? ''
  const name = ((formData.get('name') as string | null) ?? '').trim()
  const description = ((formData.get('description') as string | null) ?? '').trim()
  const isPublic = formData.get('isPublic') === 'true'

  const values: PaletteFormState['values'] = { name, description, isPublic }

  if (!id) {
    return { values, errors: { form: 'Palette ID is required.' } }
  }

  const fieldErrors = validatePaletteForm({ name, description })
  if (Object.keys(fieldErrors).length > 0) {
    return { values, errors: fieldErrors }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { values, errors: { form: 'You must be signed in to update a palette.' } }
  }

  const service = createPaletteService(supabase)

  try {
    await service.updatePalette(id, {
      name,
      description: description || null,
      isPublic,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update palette.'
    return { values, errors: { form: message } }
  }

  revalidatePath('/palettes')
  revalidatePath(`/palettes/${id}`)

  return { values, errors: {}, success: true }
}
