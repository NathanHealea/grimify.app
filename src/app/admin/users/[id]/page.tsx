import Link from 'next/link'
import { notFound } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
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

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <div className="mb-6">
        <Link
          href="/admin/users"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to users
        </Link>
      </div>

      <UserDetail
        profile={profile}
        roles={roles}
        authUser={authUser}
        currentUserId={currentUser.id}
      />
    </div>
  )
}
