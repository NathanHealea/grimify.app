import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Main } from '@/components/main'
import { createClient } from '@/lib/supabase/server'
import { AssignRoleForm } from '@/modules/admin/components/assign-role-form'
import { RoleDetailCard } from '@/modules/admin/components/role-detail-card'
import { RoleUsersTable } from '@/modules/admin/components/role-users-table'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'

export const metadata = pageMetadata({
  title: 'Role detail',
  description: 'Admin role detail.',
  noindex: true,
})

export default async function AdminRoleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch role
  const { data: role, error: roleError } = await supabase
    .from('roles')
    .select('id, name, builtin')
    .eq('id', id)
    .single()

  if (roleError || !role) {
    notFound()
  }

  // Fetch assigned users
  const { data: assignments } = await supabase
    .from('user_roles')
    .select('profiles(id, display_name, avatar_url)')
    .eq('role_id', id)

  const assignedUsers = (assignments ?? [])
    .map(
      (a) =>
        a.profiles as unknown as {
          id: string
          display_name: string | null
          avatar_url: string | null
        }
    )
    .filter(Boolean)

  const assignedUserIds = new Set(assignedUsers.map((u) => u.id))

  // Fetch all profiles for the assign picker (exclude already assigned)
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, display_name')
    .order('display_name')

  const availableUsers = (allProfiles ?? []).filter(
    (p) => !assignedUserIds.has(p.id)
  )

  return (
    <Main as="div">
      <div className="mb-6">
        <Link
          href="/admin/roles"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back to roles
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">Role Detail</h1>
      </div>

      <div className="space-y-8">
        <RoleDetailCard role={role} />

        <div>
          <h3 className="mb-4 text-lg font-semibold">Assigned Users</h3>
          <RoleUsersTable
            roleId={role.id}
            roleName={role.name}
            users={assignedUsers}
          />
        </div>

        <div>
          <h3 className="mb-4 text-lg font-semibold">Assign Role</h3>
          <AssignRoleForm roleId={role.id} availableUsers={availableUsers} />
        </div>
      </div>
    </Main>
  )
}
