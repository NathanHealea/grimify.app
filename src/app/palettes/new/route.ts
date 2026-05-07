import { NextResponse, type NextRequest } from 'next/server'

/**
 * Legacy POST endpoint — forwards to {@link /user/palettes/new}.
 *
 * Kept as a 308 redirect so external `<form>` submissions and bookmarks made
 * before the route move don't break. Safe to delete once analytics confirm
 * no traffic hits this path.
 */
export function POST(request: NextRequest) {
  return NextResponse.redirect(new URL('/user/palettes/new', request.url), 308)
}
