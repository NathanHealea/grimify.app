'use client'

import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updatePassword } from '@/modules/auth/actions/update-password'
import type { AuthState } from '@/modules/auth/types/auth-state'

/**
 * New password form for the password reset flow.
 *
 * Uses the {@link updatePassword} server action via `useActionState`.
 * Requires two matching password fields with a minimum of 6 characters.
 * Surfaces server-returned errors (e.g. expired token, validation errors)
 * as a Sonner toast; successful reset redirects server-side, so no success
 * toast fires here.
 */
export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(updatePassword, null)

  useEffect(() => {
    if (!state) return
    if (state.error) {
      toast.error(state.error)
    }
  }, [state])

  return (
    <form action={formAction} className="flex flex-col gap-4">
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
        {pending ? 'Resetting...' : 'Reset password'}
      </Button>
    </form>
  )
}
