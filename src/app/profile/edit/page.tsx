import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { ChangePasswordForm } from '@/modules/user/components/change-password-form'

export default async function ProfileEditPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Check if the user has an email identity (password-based account)
  const hasEmailIdentity = user?.identities?.some((identity) => identity.provider === 'email') ?? false

  return (
    <div className="flex min-h-screen w-full justify-center px-4 py-24">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-2xl font-bold">Edit Profile</h1>

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

        {!hasEmailIdentity && (
          <Card>
            <CardHeader>
              <CardTitle>Edit Profile</CardTitle>
              <CardDescription>
                Your account is linked to an external provider. Password management is not available.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  )
}
