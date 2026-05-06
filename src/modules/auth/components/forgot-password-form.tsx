'use client'

import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { requestPasswordReset } from '@/modules/auth/actions/request-password-reset'
import type { AuthState } from '@/modules/auth/types/auth-state'

/**
 * Email input form for requesting a password reset link.
 *
 * Uses the {@link requestPasswordReset} server action via `useActionState`.
 * Surfaces server-returned success and error messages as Sonner toasts.
 */
export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(requestPasswordReset, null)

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
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? 'Sending...' : 'Send reset link'}
      </Button>
    </form>
  )
}
