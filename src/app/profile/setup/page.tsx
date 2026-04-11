import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { ProfileForm } from '@/modules/profile/components/profile-form'
import { redirect } from 'next/navigation'

export default async function ProfileSetupPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, has_setup_profile')
    .eq('id', user.id)
    .single()

  // If profile setup is already complete, redirect to home
  if (profile?.has_setup_profile) {
    redirect('/')
  }

  // Edge case: trigger failed and no profile row exists — create a skeleton row
  if (!profile) {
    await supabase.from('profiles').insert({ id: user.id })
  }

  // Extract a suggested display name from OAuth provider metadata
  const meta = user.user_metadata ?? {}
  const suggestedName =
    (meta.full_name as string) ||
    (meta.name as string) ||
    (meta.custom_username as string) ||
    (meta.preferred_username as string) ||
    (meta.user_name as string) ||
    null

  // Check if the suggested name is already taken by another user
  let nameAlreadyTaken = false
  if (suggestedName) {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .ilike('display_name', suggestedName)
      .neq('id', user.id)
      .limit(1)

    nameAlreadyTaken = (existing?.length ?? 0) > 0
  }

  const displayName = suggestedName ?? profile?.display_name ?? ''

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4 py-24">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Complete your profile</CardTitle>
          <CardDescription>Choose a display name to get started.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            defaultValues={{ display_name: displayName }}
            submitLabel="Complete setup"
            suggestedName={suggestedName}
            nameAlreadyTaken={nameAlreadyTaken}
          />
        </CardContent>
      </Card>
    </div>
  )
}
