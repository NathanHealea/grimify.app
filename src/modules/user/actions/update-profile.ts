'use server'

import { createClient } from '@/lib/supabase/server'
import type { UpdateProfileFormState } from '@/modules/user/types/update-profile-form-state'
import { validateBio, validateDisplayName } from '@/modules/user/validation'
import { revalidatePath } from 'next/cache'

/**
 * Server action that updates the authenticated user's display name and bio.
 *
 * Validates both fields, then writes them to the `profiles` table. Handles
 * unique constraint violations on `display_name` with a field-level error.
 *
 * On success, revalidates the layout cache and the user's public profile page,
 * then returns `{ success: true }`.
 *
 * @param _prevState - Previous form state (unused, required by `useActionState`).
 * @param formData - FormData containing `display_name` and `bio`.
 * @returns Updated {@link UpdateProfileFormState} with errors or `{ success: true }`.
 */
export async function updateProfile(
  _prevState: UpdateProfileFormState,
  formData: FormData,
): Promise<UpdateProfileFormState> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in to update your profile.' }
  }

  const displayName = (formData.get('display_name') as string) ?? ''
  const bio = (formData.get('bio') as string) ?? ''

  const displayNameError = validateDisplayName(displayName)
  const bioError = validateBio(bio)

  if (displayNameError || bioError) {
    return {
      errors: {
        ...(displayNameError ? { display_name: displayNameError } : {}),
        ...(bioError ? { bio: bioError } : {}),
      },
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: displayName.trim(),
      bio,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) {
    if (error.code === '23505') {
      return { errors: { display_name: 'Display name is already taken.' } }
    }
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  revalidatePath('/users/' + user.id)

  return { success: true }
}
