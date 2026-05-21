import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Main } from '@/components/main'
import { PageHeader, PageSubtitle, PageTitle } from '@/components/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { listRoles } from '@/modules/admin/services/role-service'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'
import { updateAvatarAsAdmin } from '@/modules/user/actions/update-avatar-as-admin'
import { updateProfileAsAdmin } from '@/modules/user/actions/update-profile-as-admin'
import { AdminDeleteUserSection } from '@/modules/user/components/admin-delete-user-section'
import { AdminUserRolesEditor } from '@/modules/user/components/admin-user-roles-editor'
import { EditProfileForm } from '@/modules/user/components/edit-profile-form'
import { getProfileById } from '@/modules/user/services/profile-service'
import { getUserRoles } from '@/modules/user/services/user-roles-service'

export const metadata = pageMetadata({
  title: 'Edit user',
  description: 'Edit user profile and roles.',
  noindex: true,
})

export default async function AdminEditUserPage({
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

  const [profile, assignedRoles, allRoles] = await Promise.all([
    getProfileById(id),
    getUserRoles(id),
    listRoles(),
  ])

  if (!profile) {
    notFound()
  }

  const isOwner = assignedRoles.some((r) => r.name === 'owner')
  const isSelf = id === currentUser.id

  if (isOwner && !isSelf) {
    notFound()
  }

  const profileAction = updateProfileAsAdmin.bind(null, id)
  const avatarAction = updateAvatarAsAdmin.bind(null, id)

  return (
    <Main as="div">
      <div className="mb-6">
        <Link
          href={`/admin/users/${id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to user
        </Link>
      </div>

      <PageHeader>
        <PageTitle>Edit User</PageTitle>
        <PageSubtitle>
          Update profile details, manage roles, or delete the account.
        </PageSubtitle>
      </PageHeader>

      <div className="space-y-6">
        {/* Profile + Avatar */}
        <EditProfileForm
          defaultValues={{
            display_name: profile.display_name ?? '',
            bio: profile.bio ?? '',
          }}
          currentAvatarUrl={profile.avatar_url ?? null}
          displayName={profile.display_name ?? ''}
          hasEmailIdentity={false}
          profileAction={profileAction}
          avatarAction={avatarAction}
        />

        {/* Roles */}
        <Card>
          <CardHeader>
            <CardTitle>Roles</CardTitle>
            <CardDescription>
              Role changes take effect immediately — no need to save the profile.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdminUserRolesEditor
              userId={profile.id}
              initialAssigned={assignedRoles}
              allRoles={allRoles}
            />
          </CardContent>
        </Card>

        {/* Danger zone — hidden when editing own account */}
        {!isSelf && (
          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle>Danger Zone</CardTitle>
              <CardDescription>
                Permanently deletes the account, profile, and all associated data.
                This cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AdminDeleteUserSection
                userId={profile.id}
                displayName={profile.display_name ?? 'this user'}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </Main>
  )
}
