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

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4 py-24">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Complete your profile</CardTitle>
          <CardDescription>Choose a display name to get started.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm defaultValues={{ display_name: profile?.display_name ?? '' }} submitLabel="Complete setup" />
        </CardContent>
      </Card>
    </div>
  )
}
