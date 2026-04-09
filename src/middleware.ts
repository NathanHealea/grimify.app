import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

const PUBLIC_ROUTES = ['/sign-in', '/sign-up', '/auth/callback', '/auth/confirm'];
const PROFILE_SETUP_ROUTE = '/profile/setup';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    },
  );

  // Refresh the auth session to keep it alive
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Skip profile check for public/auth routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return supabaseResponse;
  }

  // No profile check needed for unauthenticated users
  if (!user) {
    return supabaseResponse;
  }

  // Check if authenticated user has a profile
  const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).single();

  // Already has profile but visiting setup page — redirect to home
  if (pathname === PROFILE_SETUP_ROUTE && profile) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // No profile and not on setup page — redirect to setup
  if (pathname !== PROFILE_SETUP_ROUTE && !profile) {
    const url = request.nextUrl.clone();
    url.pathname = PROFILE_SETUP_ROUTE;
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
