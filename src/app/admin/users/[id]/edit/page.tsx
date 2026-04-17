import { notFound } from 'next/navigation'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { AdminEditProfileForm } from '@/modules/user/components/admin-edit-profile-form'

export default async function AdminEditUserPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, bio')
    .eq('id', id)
    .single()

  if (!profile) {
    notFound()
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Edit User</h1>
        <p className="text-sm text-muted-foreground">
          Update this user&apos;s public profile details.
        </p>
      </div>

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
    </div>
  )
}
