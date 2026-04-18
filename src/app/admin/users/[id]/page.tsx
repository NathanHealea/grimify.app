import Link from 'next/link'
import { notFound } from 'next/navigation'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { UserDetail } from '@/modules/user/components/user-detail'

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const adminClient = createAdminClient()

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  if (!currentUser) {
    return null
  }

  // Fetch profile and roles in parallel with auth user info
  const [profileResult, rolesResult, authResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', id).single(),
    supabase
      .from('user_roles')
      .select('role_id, roles(id, name)')
      .eq('user_id', id),
    adminClient.auth.admin.getUserById(id),
  ])

  if (profileResult.error || !profileResult.data) {
    notFound()
  }

  const profile = profileResult.data
  const roles = (
    (rolesResult.data ?? []) as unknown as {
      role_id: string
      roles: { id: string; name: string } | null
    }[]
  )
    .map((r) => r.roles)
    .filter((r): r is { id: string; name: string } => r !== null)

  const authUser = authResult.data?.user ?? null

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
