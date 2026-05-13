'use server'

import { createClient } from '@/lib/supabase/server'
import type { AuthState } from '@/modules/auth/types/auth-state'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

/**
 * Server action that authenticates a user with email and password.
 *
 * Reads `cf-turnstile-response` from the form and passes it to Supabase
 * as `options.captchaToken`. Supabase verifies the token against
 * Cloudflare Turnstile when Captcha Protection is enabled in the project.
 *
 * On success, revalidates the layout cache and redirects to `/`.
 * On failure, returns an {@link AuthState} with the error message.
 */
export async function signIn(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const captchaToken = formData.get('cf-turnstile-response')

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
    options: {
      captchaToken: typeof captchaToken === 'string' ? captchaToken : undefined,
    },
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}
