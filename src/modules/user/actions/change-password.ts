'use server'

import { createClient } from '@/lib/supabase/server'
import type { AuthState } from '@/modules/auth/types/auth-state'

/**
 * Server action that changes the password for the currently authenticated user.
 *
 * Requires the user's current password for verification — it is checked against
 * Supabase Auth before the new password is applied. Validates that the new
 * password is at least 6 characters and matches the confirmation field.
 *
 * @remarks Intended for the profile edit page. The user remains signed in after
 * the change. The `currentPassword` field in formData must be present and correct
 * or the action returns an error without updating anything.
 */
export async function changePassword(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return { error: 'You must be signed in to change your password.' }
  }

  const currentPassword = (formData.get('currentPassword') as string) ?? ''
  const password = (formData.get('password') as string) ?? ''
  const confirmPassword = (formData.get('confirmPassword') as string) ?? ''

  if (!currentPassword) {
    return { error: 'Current password is required.' }
  }

  if (password.length < 6) {
    return { error: 'New password must be at least 6 characters.' }
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' }
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  })

  if (signInError) {
    return { error: 'Current password is incorrect.' }
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { error: error.message }
  }

  return { success: 'Password changed successfully.' }
}
