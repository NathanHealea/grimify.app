'use client'

import { useActionState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AuthState } from '@/modules/auth/types/auth-state'
import { changePassword } from '@/modules/user/actions/change-password'

/**
 * Password change form for the profile edit page.
 *
 * Uses the {@link changePassword} server action via `useActionState`.
 * Requires two matching password fields with a minimum of 6 characters.
 * Displays success and error feedback from the server.
 */
export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(changePassword, null)

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
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          required
          minLength={6}
          autoComplete="new-password"
        />
      </div>
      <div className="form-item">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="••••••••"
          required
          minLength={6}
          autoComplete="new-password"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? 'Changing...' : 'Change password'}
      </Button>
    </form>
  )
}
