import Link from 'next/link'

import { Logo } from '@/components/logo'
import { NavbarMobileMenu } from '@/components/navbar-mobile-menu'
import { createClient } from '@/lib/supabase/server'
import { UserMenu } from '@/modules/user/components/user-menu'
import { getUserRoles } from '@/modules/user/utils/roles'

/**
 * Top-level navigation bar (server component).
 *
 * Above the `lg` breakpoint, renders the brand link, center navigation
 * cluster, and auth-state-dependent right cluster (sign-in/up for guests,
 * avatar dropdown for authenticated users).
 *
 * Below `lg`, renders the brand link plus a hamburger trigger that opens
 * a side-sheet drawer containing every navigation link and the auth section.
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

  const viewer =
    user && displayName
      ? ({
          kind: 'user' as const,
          userId: user.id,
          displayName,
          avatarUrl,
          isAdmin,
        })
      : ({ kind: 'guest' as const })

  return (
    <nav className="navbar sticky top-0 z-50 gap-2 bg-background">
      <div className="navbar-start gap-2">
        <Link href="/" className="navbar-brand inline-flex items-center" aria-label="Grimify home">
          <Logo size="md" />
        </Link>
      </div>
      <div className="navbar-center hidden grow justify-center align-center gap-2 lg:flex">
        <Link href="/paints" className="btn btn-ghost btn-sm">
          Paints
        </Link>
        <Link href="/brands" className="btn btn-ghost btn-sm">
          Brands
        </Link>
        <Link href="/schemes" className="btn btn-ghost btn-sm">
          Schemes
        </Link>
        <Link href="/palettes" className="btn btn-ghost btn-sm">
          Palettes
        </Link>
      </div>
      <div className="navbar-end hidden gap-2 lg:flex">
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
      <div className="ml-auto flex items-center lg:hidden">
        <NavbarMobileMenu viewer={viewer} />
      </div>
    </nav>
  )
}
