'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createPaletteService } from '@/modules/palettes/services/palette-service'
import { validatePaletteForm } from '@/modules/palettes/validation'
import type { PaletteFormState } from '@/modules/palettes/types/palette-form-state'

const DEFAULT_STATE: PaletteFormState = {
  values: { name: '', description: '', isPublic: false },
  errors: {},
}

/**
 * Server action that creates a new palette for the authenticated user.
 *
 * Intended for use with React 19's `useActionState`. On success, revalidates
 * `/palettes` and redirects to `/palettes/{id}/edit`. On validation or auth
 * failure, returns a {@link PaletteFormState} with error messages.
 *
 * Default palette name is `"Untitled palette"` when the field is left blank.
 *
 * @param _prevState - Previous action state (required by `useActionState`).
 * @param formData - Form data submitted by the user.
 * @returns {@link PaletteFormState} on failure; redirects on success.
 */
export async function createPalette(
  _prevState: PaletteFormState,
  formData: FormData,
): Promise<PaletteFormState> {
  const rawName = (formData.get('name') as string | null) ?? ''
  const rawDescription = (formData.get('description') as string | null) ?? ''
  const isPublic = formData.get('isPublic') === 'true'

  const name = rawName.trim() || 'Untitled palette'
  const description = rawDescription.trim()

  const values: PaletteFormState['values'] = { name, description, isPublic }

  const fieldErrors = validatePaletteForm({ name, description })
  if (Object.keys(fieldErrors).length > 0) {
    return { values, errors: fieldErrors }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ...DEFAULT_STATE, errors: { form: 'You must be signed in to create a palette.' } }
  }

  const service = createPaletteService(supabase)

  let palette
  try {
    palette = await service.createPalette({
      userId: user.id,
      name,
      description: description || null,
      isPublic,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create palette.'
    return { values, errors: { form: message } }
  }

  revalidatePath('/palettes')
  redirect(`/palettes/${palette.id}/edit`)
}
