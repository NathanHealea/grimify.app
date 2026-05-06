'use client'

import Link from 'next/link'
import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signIn } from '@/modules/auth/actions/sign-in'
import type { AuthState } from '@/modules/auth/types/auth-state'

/**
 * Email and password sign-in form.
 *
 * Uses the {@link signIn} server action via `useActionState`.
 * Surfaces server-returned errors as a Sonner toast; successful sign-in
 * redirects server-side, so no success toast fires here.
 */
export function SignInForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(signIn, null)

  useEffect(() => {
    if (!state) return
    if (state.error) {
      toast.error(state.error)
    }
  }, [state])

  return (
    <form action={formAction} className="flex flex-col gap-4">
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
