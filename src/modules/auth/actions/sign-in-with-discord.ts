'use server'

import { createClient } from '@/lib/supabase/server'
import { getSiteUrl } from '@/modules/auth/utils/get-site-url'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

/**
 * Server action that initiates Discord OAuth sign-in.
 *
 * Calls `signInWithOAuth` to obtain a redirect URL from Supabase,
 * then performs a server-side redirect. On failure, redirects to
 * `/sign-in` with an encoded error message.
 */
export async function signInWithDiscord() {
  const supabase = await createClient()

  const headersList = await headers()
  const origin = headersList.get('origin') ?? getSiteUrl()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    redirect(`/sign-in?error=${encodeURIComponent(error.message)}`)
  }

  if (data.url) {
    redirect(data.url)
  }

  redirect('/sign-in?error=Could+not+initiate+Discord+sign-in')
}
