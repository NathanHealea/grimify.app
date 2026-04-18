'use server'

import { createClient } from '@/lib/supabase/server'
import { validateDisplayName } from '@/modules/user/validation'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

/**
 * Server action state for the admin profile edit form.
 *
 * - `errors` — field-level validation errors.
 * - `error` — a general error message.
 * - `null` — initial state.
 */
export type AdminEditProfileState = {
  errors?: { display_name?: string; bio?: string }
  error?: string
} | null

/**
 * Admin-only server action that updates another user's `display_name` and `bio`.
 *
 * Authorization is enforced by the "Admins can update any profile" RLS policy.
 * Validates the display name, handles unique constraint violations, and on
 * success revalidates `/admin/users` and redirects back to it.
 *
 * @param userId - UUID of the profile being edited (bound via form hidden field or closure).
 * @param _prev - Previous form state (unused).
 * @param formData - Form data containing `display_name` and `bio` fields.
 */
export async function updateProfileAsAdmin(
  userId: string,
  _prev: AdminEditProfileState,
  formData: FormData,
): Promise<AdminEditProfileState> {
  const supabase = await createClient()

  // Block editing the owner account
  const { data: targetRoles } = await supabase
    .from('user_roles')
    .select('roles(name)')
    .eq('user_id', userId)

  const targetRoleNames = (
    (targetRoles ?? []) as unknown as { roles: { name: string } | null }[]
  )
    .map((r) => r.roles?.name)
    .filter((n): n is string => typeof n === 'string')

  if (targetRoleNames.includes('owner')) {
    return { error: 'The owner account cannot be edited.' }
  }

  const displayName = (formData.get('display_name') as string) ?? ''
  const bio = ((formData.get('bio') as string) ?? '').trim()

  const displayNameError = validateDisplayName(displayName)
  if (displayNameError) {
    return { errors: { display_name: displayNameError } }
  }

  if (bio.length > 500) {
    return { errors: { bio: 'Bio must be 500 characters or fewer.' } }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: displayName.trim(),
      bio: bio || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (error) {
    if (error.code === '23505') {
      return { errors: { display_name: 'Display name is already taken.' } }
    }
    return { error: error.message }
  }

  revalidatePath('/admin/users')
  revalidatePath(`/users/${userId}`)
  redirect('/admin/users')
}
