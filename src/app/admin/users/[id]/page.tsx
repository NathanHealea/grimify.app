import Link from 'next/link'
import { notFound } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import type { AuthInfo } from '@/modules/user/components/user-detail'
import { UserDetail } from '@/modules/user/components/user-detail'
import { getAuthUser } from '@/modules/user/services/auth-user-service'
import { getProfileById } from '@/modules/user/services/profile-service'
import { getUserRoles } from '@/modules/user/services/user-roles-service'

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  if (!currentUser) {
    return null
  }

  // Fetch profile, roles, and auth metadata in parallel
  const [profile, roles, authUser] = await Promise.all([
    getProfileById(id),
    getUserRoles(id),
    getAuthUser(id),
  ])

  if (!profile) {
    notFound()
  }

  // Extract only the fields needed by the UI into a plain serializable object.
  // Avoids passing the full Supabase User type (which contains complex metadata)
  // across the server → client component boundary.
  const authInfo: AuthInfo = authUser
    ? {
        email: authUser.email ?? null,
        providers:
          authUser.identities?.map((identity) => identity.provider) ?? [],
        lastSignInAt: authUser.last_sign_in_at ?? null,
        bannedUntil: authUser.banned_until ?? null,
      }
    : null

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/admin/users"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to users
        </Link>
        <Link
          href={`/admin/users/${id}/collection`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          View collection →
        </Link>
      </div>

      <UserDetail
        profile={profile}
        roles={roles}
        authInfo={authInfo}
        currentUserId={currentUser.id}
      />
    </div>
  )
}
