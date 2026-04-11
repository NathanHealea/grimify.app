'use server'

import { createClient } from '@/lib/supabase/server'
import type { AuthState } from '@/modules/auth/types/auth-state'
import { getSiteUrl } from '@/modules/auth/utils/get-site-url'
import { headers } from 'next/headers'

/**
 * Server action that registers a new user with email and password.
 *
 * Sends a confirmation email with a redirect to `/auth/callback`.
 * On success, returns an {@link AuthState} with a success message.
 * On failure, returns an {@link AuthState} with the error message.
 */
export async function signUp(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const headersList = await headers()
  const origin = headersList.get('origin') ?? getSiteUrl()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { success: 'Check your email to confirm your account.' }
}
