import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

/** Routes that bypass authentication and profile-setup checks. */
const PUBLIC_ROUTES = ['/sign-in', '/sign-up', '/auth/callback']

/**
 * Next.js middleware that handles Supabase session refresh and profile-setup enforcement.
 *
 * For authenticated users, queries the `profiles` table and:
 * - Redirects to `/profile/setup` if `has_setup_profile` is `false`.
 * - Redirects away from `/profile/setup` if setup is already complete.
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Skip all checks for public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return supabaseResponse
  }

  // No authenticated user — skip profile checks (Protected Routes feature handles auth redirects)
  if (!user) {
    return supabaseResponse
  }

  // Check if the authenticated user has completed profile setup
  const { data: profile } = await supabase.from('profiles').select('has_setup_profile').eq('id', user.id).single()

  const isProfileComplete = profile?.has_setup_profile === true
  const isSetupPage = pathname === '/profile/setup'

  // Incomplete profile and not on setup page — redirect to setup
  if (!isProfileComplete && !isSetupPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/profile/setup'
    return NextResponse.redirect(url)
  }

  // Complete profile but on setup page — redirect to home
  if (isProfileComplete && isSetupPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
