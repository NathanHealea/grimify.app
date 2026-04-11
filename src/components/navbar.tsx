import Link from 'next/link'

import { signOut } from '@/modules/auth/actions/sign-out'
import { createClient } from '@/lib/supabase/server'

/**
 * Top-level navigation bar (server component).
 *
 * Shows the brand link and auth-state-dependent actions:
 * sign-in/sign-up links for guests, sign-out button for authenticated users.
 */
export async function Navbar() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <nav className="navbar">
      <div className="navbar-start">
        <Link href="/" className="navbar-brand">
          Grimify
        </Link>
      </div>
      <div className="navbar-end">
        {user ? (
          <form action={signOut}>
            <button type="submit" className="btn btn-ghost btn-sm">
              Sign Out
            </button>
          </form>
        ) : (
          <>
            <Link href="/sign-in" className="btn btn-ghost btn-sm">
              Sign In
            </Link>
            <Link href="/sign-up" className="btn btn-primary btn-sm">
              Sign Up
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}
