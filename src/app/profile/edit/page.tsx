import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { Main } from '@/components/main'
import { PageHeader, PageTitle } from '@/components/page-header'
import { createClient } from '@/lib/supabase/server'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'
import { DangerZone } from '@/modules/user/components/danger-zone'
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

  const [profile, userRolesResult] = await Promise.all([
    user ? getProfileById(user.id) : Promise.resolve(null),
    user
      ? supabase
          .from('user_roles')
          .select('roles(name)')
          .eq('user_id', user.id)
      : Promise.resolve({ data: null }),
  ])

  const isAdmin = (
    (userRolesResult.data as { roles: { name: string } | null }[] | null) ?? []
  ).some((ur) => ur.roles?.name === 'admin')

  return (
    <Main>
      {user && (
        <Link
          href={`/users/${user.id}`}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to profile
        </Link>
      )}

      <PageHeader>
        <PageTitle size="md">Edit Profile</PageTitle>
      </PageHeader>

      <EditProfileForm
        defaultValues={{
          display_name: profile?.display_name ?? '',
          bio: profile?.bio ?? '',
        }}
        currentAvatarUrl={profile?.avatar_url ?? null}
        displayName={profile?.display_name ?? ''}
        hasEmailIdentity={hasEmailIdentity}
      />

      {user && (
        <div className="mt-8">
          <DangerZone
            displayName={profile?.display_name ?? 'your account'}
            isAdmin={isAdmin}
          />
        </div>
      )}
    </Main>
  )
}
