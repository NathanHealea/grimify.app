import Link from 'next/link'

import { createClient } from '@/lib/supabase/server'
import { UserMenu } from '@/modules/user/components/user-menu'
import { getUserRoles } from '@/modules/user/utils/roles'

/**
 * Top-level navigation bar (server component).
 *
 * Shows the brand link and auth-state-dependent actions:
 * sign-in/sign-up links for guests, user avatar dropdown for authenticated users.
 */
export async function Navbar() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let displayName: string | null = null
  let avatarUrl: string | null = null
  let isAdmin = false

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('id', user.id)
      .single()

    displayName = profile?.display_name ?? null
    avatarUrl = profile?.avatar_url ?? null

    const roles = await getUserRoles(user.id)
    isAdmin = roles.includes('admin')
  }

  return (
    <nav className="navbar sticky top-0 z-50 gap-2 bg-background">
      <div className="navbar-start gap-2">
        <Link href="/" className="navbar-brand">
          Grimify
        </Link>
      </div>
      <div className="navbar-center grow justify-center align-center gap-2">
        <Link href="/paints" className="btn btn-ghost btn-sm">
          Paints
        </Link>
        <Link href="/brands" className="btn btn-ghost btn-sm">
          Brands
        </Link>
        {user && (
          <Link href="/collection" className="btn btn-ghost btn-sm">
            Collection
          </Link>
        )}
      </div>
      <div className="navbar-end gap-2">
        {isAdmin && (
          <Link href="/admin" className="btn btn-ghost btn-sm">
            Admin
          </Link>
        )}
        {user && displayName ? (
          <UserMenu userId={user.id} displayName={displayName} avatarUrl={avatarUrl} />
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
