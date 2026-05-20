import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { Main } from '@/components/main'
import { PageHeader, PageTitle } from '@/components/page-header'
import { createClient } from '@/lib/supabase/server'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'
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
    </Main>
  )
}
