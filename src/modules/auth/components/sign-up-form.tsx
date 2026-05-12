'use client'

import { useActionState, useEffect, useRef } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signUp } from '@/modules/auth/actions/sign-up'
import { TurnstileWidget, type TurnstileWidgetHandle } from '@/modules/auth/components/turnstile-widget'
import type { AuthState } from '@/modules/auth/types/auth-state'

/**
 * Email and password sign-up form.
 *
 * Uses the {@link signUp} server action via `useActionState`.
 * Surfaces server-returned success and error messages as Sonner toasts.
 * The Cloudflare Turnstile widget is reset after each submission so retries
 * get a fresh single-use token.
 */
export function SignUpForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(signUp, null)
  const turnstileRef = useRef<TurnstileWidgetHandle>(null)

  useEffect(() => {
    if (!state) return
    if (state.error) {
      toast.error(state.error)
    } else if (state.success) {
      toast.success(state.success)
    }
    turnstileRef.current?.reset()
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
          minLength={6}
          autoComplete="new-password"
        />
      </div>
      <TurnstileWidget ref={turnstileRef} />
      <Button type="submit" disabled={pending}>
        {pending ? 'Creating account...' : 'Sign up'}
      </Button>
    </form>
  )
}
