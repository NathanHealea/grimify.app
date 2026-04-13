'use server'

import { createClient } from '@/lib/supabase/server'
import type { AuthState } from '@/modules/auth/types/auth-state'
import { redirect } from 'next/navigation'

/**
 * Server action that sets a new password for the currently authenticated user
 * during the password reset flow.
 *
 * Validates that both passwords match and meet the minimum length requirement
 * (6 characters). On success, signs the user out and redirects to `/sign-in`
 * with a success message so they can log in with the new password.
 *
 * @remarks Requires an active session established by the `/auth/confirm` PKCE
 * token verification step.
 */
export async function updatePassword(_prevState: AuthState, formData: FormData): Promise<AuthState> {
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

  await supabase.auth.signOut()
  redirect('/sign-in?message=Password updated successfully. Please sign in with your new password.')
}
