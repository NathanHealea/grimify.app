'use client'

import { useActionState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { requestPasswordReset } from '@/modules/auth/actions/request-password-reset'
import type { AuthState } from '@/modules/auth/types/auth-state'

/**
 * Email input form for requesting a password reset link.
 *
 * Uses the {@link requestPasswordReset} server action via `useActionState`.
 * Displays success (check your email) and error feedback from the server.
 */
export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(requestPasswordReset, null)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state?.success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          {state.success}
        </div>
      )}
      {state?.error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {state.error}
        </div>
      )}
      <div className="form-item">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? 'Sending...' : 'Send reset link'}
      </Button>
    </form>
  )
}
