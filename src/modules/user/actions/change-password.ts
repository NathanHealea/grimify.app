'use server'

import { createClient } from '@/lib/supabase/server'
import type { AuthState } from '@/modules/auth/types/auth-state'

/**
 * Server action that changes the password for the currently authenticated user.
 *
 * Validates that both passwords match and meet the minimum length requirement
 * (6 characters). Unlike {@link updatePassword}, this action does not sign the
 * user out — they remain logged in after the password change.
 *
 * @remarks Intended for the profile edit page, not the password reset flow.
 */
export async function changePassword(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient()

  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters.' }
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' }
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { error: error.message }
  }

  return { success: 'Password changed successfully.' }
}
