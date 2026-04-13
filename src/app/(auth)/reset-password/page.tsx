import Link from 'next/link'

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ResetPasswordForm } from '@/modules/auth/components/reset-password-form'

export default function ResetPasswordPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>Enter your new password below.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResetPasswordForm />
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          <Link href="/sign-in" className="text-primary underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
