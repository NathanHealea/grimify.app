import { Main } from '@/components/main'
import { PageHeader, PageTitle } from '@/components/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'
import { ChangePasswordForm } from '@/modules/user/components/change-password-form'
import { EditAvatarForm } from '@/modules/user/components/edit-avatar-form'
import { EditProfileForm } from '@/modules/user/components/edit-profile-form'
import { getProfileById } from '@/modules/user/services/profile-service'

export const metadata = pageMetadata({
  title: 'Edit profile',
  description: 'Update your Grimify account settings.',
  path: '/profile/edit',
  noindex: true,
})

export default async function ProfileEditPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const hasEmailIdentity = user?.identities?.some((identity) => identity.provider === 'email') ?? false
  const profile = user ? await getProfileById(user.id) : null

  return (
    <Main>
      <div className="w-full max-w-md space-y-6">
        <PageHeader>
          <PageTitle size="md">Edit Profile</PageTitle>
        </PageHeader>

        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your display name and bio.</CardDescription>
          </CardHeader>
          <CardContent>
            <EditProfileForm
              defaultValues={{
                display_name: profile?.display_name ?? '',
                bio: profile?.bio ?? '',
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Avatar</CardTitle>
            <CardDescription>Upload a profile picture.</CardDescription>
          </CardHeader>
          <CardContent>
            <EditAvatarForm
              currentAvatarUrl={profile?.avatar_url ?? null}
              displayName={profile?.display_name ?? ''}
            />
          </CardContent>
        </Card>

        {hasEmailIdentity && (
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your account password.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChangePasswordForm />
            </CardContent>
          </Card>
        )}
      </div>
    </Main>
  )
}
