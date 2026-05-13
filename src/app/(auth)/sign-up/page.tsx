import Link from 'next/link'

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { OAuthButtons } from '@/modules/auth/components/oauth-buttons'
import { SignUpForm } from '@/modules/auth/components/sign-up-form'
import { TurnstileProvider } from '@/modules/auth/components/turnstile-provider'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'

export const metadata = pageMetadata({
  title: 'Create an account',
  description: 'Sign up for Grimify to build your paint collection, palettes, and recipes.',
  path: '/sign-up',
})

export default function SignUpPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>Enter your email and password to get started.</CardDescription>
      </CardHeader>
      <CardContent>
        <TurnstileProvider>
          <SignUpForm />
        </TurnstileProvider>
        <OAuthButtons />
        <p className="mt-4 text-center text-xs text-muted-foreground">
          By signing up, you agree to our{' '}
          <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">
            Terms of Use
          </Link>{' '}
          and{' '}
          <Link
            href="/code-of-conduct"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Code of Conduct
          </Link>
          .
        </p>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/sign-in" className="text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
