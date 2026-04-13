'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signIn } from '@/modules/auth/actions/sign-in'
import type { AuthState } from '@/modules/auth/types/auth-state'

/**
 * Email and password sign-in form.
 *
 * Uses the {@link signIn} server action via `useActionState`.
 * Displays field-level error feedback from the server.
 */
export function SignInForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(signIn, null)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state?.error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {state.error}
        </div>
      )}
      <div className="form-item">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
      </div>
      <div className="form-item">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          required
          autoComplete="current-password"
        />
      </div>
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
          Forgot your password?
        </Link>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? 'Signing in...' : 'Sign in'}
      </Button>
    </form>
  )
}
