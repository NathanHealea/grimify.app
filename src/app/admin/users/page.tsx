import { createClient } from '@/lib/supabase/server'
import { AdminUsersTable } from '@/modules/user/components/admin-users-table'
import type { Role } from '@/modules/user/types/role'
import type { UserWithRoles } from '@/modules/user/types/user-with-roles'

export default async function AdminUsersPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Middleware guarantees an authenticated admin, but guard defensively
  if (!user) {
    return null
  }

  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, user_roles(roles(name))')
    .order('display_name')

  const users: UserWithRoles[] = (data ?? []).map((profile) => ({
    id: profile.id,
    display_name: profile.display_name,
    avatar_url: profile.avatar_url,
    roles: (
      (profile.user_roles as unknown as { roles: { name: string } }[]) ?? []
    )
      .map((ur) => ur.roles?.name)
      .filter((name): name is Role => name === 'user' || name === 'admin'),
  }))

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-sm text-muted-foreground">
          Manage user roles. Grant or revoke admin access.
        </p>
      </div>
      <AdminUsersTable users={users} currentUserId={user.id} />
    </div>
  )
}
