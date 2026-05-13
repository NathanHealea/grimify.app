'use client'

import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { requestPasswordReset } from '@/modules/auth/actions/request-password-reset'
import { useTurnstile } from '@/modules/auth/components/turnstile-provider'
import { TurnstileWidget } from '@/modules/auth/components/turnstile-widget'
import type { AuthState } from '@/modules/auth/types/auth-state'

/**
 * Email input form for requesting a password reset link.
 *
 * Uses the {@link requestPasswordReset} server action via `useActionState`.
 * Reads the Cloudflare Turnstile token from the surrounding `TurnstileProvider`
 * and submits it as a hidden field so Supabase Captcha Protection accepts the
 * `resetPasswordForEmail` call. Surfaces server-returned success and error
 * messages as Sonner toasts; the widget is reset after each submission so
 * retries get a fresh single-use token.
 */
export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(requestPasswordReset, null)
  const { token, reset } = useTurnstile()

  useEffect(() => {
    if (!state) return
    if (state.error) {
      toast.error(state.error)
    } else if (state.success) {
      toast.success(state.success)
    }
    reset()
  }, [state, reset])

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="form-item">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
      </div>
      <TurnstileWidget />
      <input type="hidden" name="cf-turnstile-response" value={token} />
      <Button type="submit" disabled={pending}>
        {pending ? 'Sending...' : 'Send reset link'}
      </Button>
    </form>
  )
}
