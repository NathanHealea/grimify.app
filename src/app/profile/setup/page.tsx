import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

import { ProfileForm } from './profile-form'

export default async function ProfileSetupPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', user.id).single()

  // If profile already has a display name, redirect to home (already complete)
  if (profile?.display_name) {
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
          <ProfileForm />
        </CardContent>
      </Card>
    </div>
  )
}
