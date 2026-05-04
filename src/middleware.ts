import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

/** Routes that bypass ALL middleware checks (auth flow pages). */
const AUTH_ROUTES = ['/sign-in', '/sign-up', '/auth/callback', '/auth/confirm', '/forgot-password', '/reset-password']

/** Route prefixes accessible without authentication but subject to profile-setup checks for authenticated users. */
const PUBLIC_ROUTES = ['/brands', '/paints', '/hues', '/schemes']

/** Exact routes accessible without authentication but subject to profile-setup checks for authenticated users. */
const PUBLIC_EXACT_ROUTES = ['/']

/** Route prefixes that require the `admin` role. */
const ADMIN_ROUTES = ['/admin']

/**
 * Next.js middleware that handles Supabase session refresh, authentication
 * enforcement, profile-setup enforcement, and admin route protection.
 *
 * @remarks
 * Route handling order:
 * 1. Auth routes — return immediately (no checks at all).
 * 2. Get user via `supabase.auth.getUser()`.
 * 3. No user + public route — allow (unauthenticated browsing).
 * 4. No user + protected route — redirect to `/sign-in?next={pathname}`.
 * 5. User exists — check `has_setup_profile`:
 *    - If `false` and not on `/profile/setup` — redirect to `/profile/setup`.
 *    - If `true` and on `/profile/setup` — redirect to `/`.
 * 6. Admin route — check roles via `get_user_roles` RPC.
 * 7. Return response.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  let supabaseResponse = NextResponse.next({ request })

  // Auth flow routes are fully exempt — no session refresh or checks needed
  if (AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
    return supabaseResponse
  }

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

  const isPublicRoute =
    PUBLIC_ROUTES.some((route) => pathname.startsWith(route)) ||
    PUBLIC_EXACT_ROUTES.some((route) => pathname === route)

  // Unauthenticated user on a public route — allow without profile checks
  if (!user && isPublicRoute) {
    return supabaseResponse
  }

  // Unauthenticated user on a protected route — redirect to sign-in
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/sign-in'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Authenticated user — check profile setup status
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

  // Admin route protection — only fetch roles when path requires it
  const isAdminRoute = ADMIN_ROUTES.some((route) => pathname.startsWith(route))

  if (isAdminRoute) {
    const { data } = await supabase.rpc('get_user_roles', { user_uuid: user.id })
    const roles: string[] = data ?? []

    if (!roles.includes('admin')) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
