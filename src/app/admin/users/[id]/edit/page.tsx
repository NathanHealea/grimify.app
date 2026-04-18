import Link from 'next/link'
import { notFound } from 'next/navigation'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { listRoles } from '@/modules/admin/services/role-service'
import { AdminDeleteUserSection } from '@/modules/user/components/admin-delete-user-section'
import { AdminEditProfileForm } from '@/modules/user/components/admin-edit-profile-form'
import { AdminUserRolesEditor } from '@/modules/user/components/admin-user-roles-editor'
import { getProfileById } from '@/modules/user/services/profile-service'
import { getUserRoles } from '@/modules/user/services/user-roles-service'

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

  // Fetch profile, user's assigned roles, and all available roles in parallel
  const [profile, assignedRoles, allRoles] = await Promise.all([
    getProfileById(id),
    getUserRoles(id),
    listRoles(),
  ])

  if (!profile) {
    notFound()
  }

  // Protect the owner account from edits
  const isOwner = assignedRoles.some((r) => r.name === 'owner')
  const isSelf = id === currentUser.id

  if (isOwner) {
    notFound()
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <div className="mb-6">
        <Link
          href={`/admin/users/${id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to user
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">Edit User</h1>
        <p className="text-sm text-muted-foreground">
          Update profile details, manage roles, or delete the account.
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              Avatars are synced from the user&apos;s OAuth provider.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdminEditProfileForm
              userId={profile.id}
              initialDisplayName={profile.display_name}
              initialBio={profile.bio}
            />
          </CardContent>
        </Card>

        {/* Roles — hidden when editing own account */}
        {!isSelf && (
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
        )}

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
    </div>
  )
}
