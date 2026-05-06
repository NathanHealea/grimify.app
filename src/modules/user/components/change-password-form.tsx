'use client'

import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'

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
 * Surfaces server-returned success and error messages as Sonner toasts.
 */
export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(changePassword, null)

  useEffect(() => {
    if (!state) return
    if (state.error) {
      toast.error(state.error)
    } else if (state.success) {
      toast.success(state.success)
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
        {pending ? 'Changing...' : 'Change password'}
      </Button>
    </form>
  )
}
