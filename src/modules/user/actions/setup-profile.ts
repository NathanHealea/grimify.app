'use server'

import { createClient } from '@/lib/supabase/server'
import type { ProfileFormState } from '@/modules/user/types/profile-form-state'
import { validateDisplayName } from '@/modules/user/validation'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

/**
 * Server action that saves the user's display name and marks profile setup as complete.
 *
 * Validates the display name, updates the `profiles` row, and sets
 * `has_setup_profile` to `true`. Handles unique constraint violations
 * (duplicate display names) with a user-friendly error.
 *
 * On success, revalidates the layout cache and redirects to `/`.
 */
export async function setupProfile(_prevState: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in to complete your profile.' }
  }

  const displayName = (formData.get('display_name') as string) ?? ''
  const validationError = validateDisplayName(displayName)

  if (validationError) {
    return { errors: { display_name: validationError } }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: displayName.trim(),
      has_setup_profile: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) {
    // Handle unique constraint violation (display name already taken)
    if (error.code === '23505') {
      return { errors: { display_name: 'Display name is already taken.' } }
    }
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}
