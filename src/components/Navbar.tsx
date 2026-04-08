import Link from 'next/link'

import SearchBar from '@/components/SearchBar'
import SidebarToggleButton from '@/components/SidebarToggleButton'
import UserMenu from '@/components/UserMenu'
import { getAuthUser } from '@/lib/supabase/auth'
import { hasRole } from '@/lib/supabase/roles'
import { signOut } from '@/app/(auth)/actions'

export default async function Navbar() {
  const authResult = await getAuthUser({ withProfile: true })

  let isAdmin = false
  if (authResult) {
    isAdmin = await hasRole(authResult.user.id, 'admin').catch(() => false)
  }

  const displayName = authResult?.profile?.display_name ?? authResult?.user.email ?? 'User'

  return (
    <nav className='navbar min-h-0 border-b border-base-300 bg-base-200 px-2 py-4'>
      <div className='navbar-start w-auto shrink-0'>
        <SidebarToggleButton />
      </div>

      <div className='navbar-center flex-1 px-3'>
        <SearchBar />
      </div>

      <div className='navbar-end w-auto shrink-0'>
        {authResult ? (
          <UserMenu
            displayName={displayName}
            avatarUrl={authResult.profile?.avatar_url}
            signOutAction={signOut}
            isAdmin={isAdmin}
          />
        ) : (
          <div className='flex items-center gap-2'>
            <Link href='/sign-in' className='btn btn-ghost btn-sm hidden sm:flex'>
              Sign In
            </Link>
            <Link href='/sign-up' className='btn btn-primary btn-sm'>
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}
