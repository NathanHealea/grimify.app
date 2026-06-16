import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

/** Routes that bypass ALL middleware checks (auth flow pages). */
const AUTH_ROUTES = ['/sign-in', '/sign-up', '/auth/callback', '/auth/confirm', '/forgot-password', '/reset-password']

/** Legal pages that bypass ALL middleware checks — must be readable signed-out, signed-in, or with an incomplete profile. */
const LEGAL_ROUTES = ['/terms', '/code-of-conduct']

/** Public API routes that serve open content and must bypass all middleware checks (e.g. OG image renderers). */
const PUBLIC_API_ROUTES = ['/api/og']

/** Route prefixes accessible without authentication but subject to profile-setup checks for authenticated users. */
const PUBLIC_ROUTES = ['/brands', '/paints', '/hues', '/schemes', '/palettes']

/** Exact routes accessible without authentication but subject to profile-setup checks for authenticated users. */
const PUBLIC_EXACT_ROUTES = ['/']

/** Route prefixes that require the `admin` role. */
const ADMIN_ROUTES = ['/admin']

/**
 * Inventory of every real top-level route prefix the app serves.
 *
 * @remarks
 * Used to distinguish protected-but-real routes from genuinely non-existent
 * paths. An unauthenticated request to a path matching none of these falls
 * through to the public 404 page instead of being redirected to sign-in.
 * Add new top-level routes here so signed-out visitors are still gated on them.
 */
const KNOWN_ROUTES = [
  '/admin',
  '/api',
  '/auth',
  '/brands',
  '/code-of-conduct',
  '/collection',
  '/compare',
  '/discontinued',
  '/forgot-password',
  '/hues',
  '/paints',
  '/palettes',
  '/profile',
  '/recipes',
  '/reset-password',
  '/schemes',
  '/sign-in',
  '/sign-up',
  '/terms',
  '/user',
  '/users',
]

/**
 * Next.js middleware that handles Supabase session refresh, authentication
 * enforcement, profile-setup enforcement, and admin route protection.
 *
 * @remarks
 * Route handling order:
 * 1. Stray OAuth code — if `?code=` arrives outside `/auth/*`, forward to
 *    `/auth/callback` so the session still establishes when Supabase falls
 *    back to the Site URL instead of honoring `redirectTo`.
 * 2. Auth routes — return immediately (no checks at all).
 * 3. Get user via `supabase.auth.getUser()`.
 * 4. No user + public route — allow (unauthenticated browsing).
 * 5. No user + unknown (non-existent) route — allow through so the public
 *    404 page renders instead of redirecting to sign-in.
 * 6. No user + known protected route — redirect to `/sign-in?next={pathname}`.
 * 7. User exists — check `has_setup_profile`:
 *    - If `false` and not on `/profile/setup` — redirect to `/profile/setup`.
 *    - If `true` and on `/profile/setup` — redirect to `/`.
 * 8. Admin route — check roles via `get_user_roles` RPC.
 * 9. Return response.
 */
export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  // OAuth code recovery — if Supabase falls back to its Site URL (because the
  // requested redirectTo isn't in the Redirect URLs allow-list), the auth code
  // ends up at the root with `?code=...` instead of at `/auth/callback`.
  // Forward any such request to the callback handler so the session still
  // establishes. Skip when already under `/auth/` — both `/auth/callback`
  // (OAuth) and `/auth/confirm` (email flows) legitimately receive `?code=`.
  const code = searchParams.get('code')
  if (code && !pathname.startsWith('/auth/')) {
    const callbackUrl = request.nextUrl.clone()
    callbackUrl.pathname = '/auth/callback'
    callbackUrl.searchParams.set('code', code)
    callbackUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(callbackUrl)
  }

  let supabaseResponse = NextResponse.next({ request })

  // Auth flow, legal, and public API routes are fully exempt — no session refresh or checks needed
  if (
    AUTH_ROUTES.some((route) => pathname.startsWith(route)) ||
    LEGAL_ROUTES.some((route) => pathname.startsWith(route)) ||
    PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route))
  ) {
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

  const isKnownRoute = KNOWN_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))

  // Unauthenticated user on a public route — allow without profile checks
  if (!user && isPublicRoute) {
    return supabaseResponse
  }

  // Unauthenticated user on a non-existent path — allow through so Next.js
  // renders the public 404 page rather than redirecting to sign-in for a
  // page that doesn't exist.
  if (!user && !isKnownRoute) {
    return supabaseResponse
  }

  // Unauthenticated user on a known protected route — redirect to sign-in
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
