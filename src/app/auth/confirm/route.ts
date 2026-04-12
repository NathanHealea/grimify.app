import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * PKCE code exchange endpoint for email-based auth flows (e.g. password reset).
 *
 * Supabase email links using `{{ .ConfirmationURL }}` first verify the token on
 * Supabase's server, then redirect here with a `code` query param. This route
 * exchanges that code for a session and redirects to the specified `next` URL.
 *
 * On failure, redirects to `/sign-in` with an error query param.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      revalidatePath('/', 'layout')
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(
    `${request.nextUrl.origin}/sign-in?error=Could not verify your request. Please try again.`
  )
}
