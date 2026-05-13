'use server'

import { createClient } from '@/lib/supabase/server'
import type { AuthState } from '@/modules/auth/types/auth-state'
import { getSiteUrl } from '@/modules/auth/utils/get-site-url'
import { headers } from 'next/headers'

/**
 * Server action that sends a password reset email to the provided address.
 *
 * Always returns a success message regardless of whether the email exists
 * in order to prevent email enumeration attacks. Reads `cf-turnstile-response`
 * from the form and passes it to Supabase as `captchaToken`; Supabase verifies
 * the Turnstile token when Captcha Protection is enabled on the project.
 *
 * The reset link directs the user through `/auth/confirm` (PKCE token
 * verification) which then redirects to `/reset-password`.
 */
export async function requestPasswordReset(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const captchaToken = formData.get('cf-turnstile-response')

  const headersList = await headers()
  const origin = headersList.get('origin') ?? getSiteUrl()

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/reset-password`,
    captchaToken: typeof captchaToken === 'string' ? captchaToken : undefined,
  })

  return { success: 'If an account exists with that email, you will receive a password reset link.' }
}
