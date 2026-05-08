import { Main } from '@/components/main'
import { createClient } from '@/lib/supabase/server'
import { CreateRoleForm } from '@/modules/admin/components/create-role-form'
import { RoleListTable } from '@/modules/admin/components/role-list-table'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'

export const metadata = pageMetadata({
  title: 'Role management',
  description: 'Admin: manage Grimify roles.',
  path: '/admin/roles',
  noindex: true,
})

export default async function AdminRolesPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('roles')
    .select('id, name, builtin, user_roles(count)')
    .order('builtin', { ascending: false })
    .order('name')

  const roles = (data ?? []).map((role) => ({
    id: role.id,
    name: role.name,
    builtin: role.builtin,
    userCount:
      (role.user_roles as unknown as { count: number }[])?.[0]?.count ?? 0,
  }))

  return (
    <Main as="div" width="4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Role Management</h1>
        <p className="text-sm text-muted-foreground">
          Create, rename, and delete roles. Assign roles to users from the role
          detail page.
        </p>
      </div>

      <div className="mb-6">
        <CreateRoleForm />
      </div>

      <RoleListTable roles={roles} />
    </Main>
  )
}
