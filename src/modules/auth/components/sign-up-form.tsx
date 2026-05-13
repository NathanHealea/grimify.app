'use client'

import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signUp } from '@/modules/auth/actions/sign-up'
import { useTurnstile } from '@/modules/auth/components/turnstile-provider'
import { TurnstileWidget } from '@/modules/auth/components/turnstile-widget'
import type { AuthState } from '@/modules/auth/types/auth-state'

/**
 * Email and password sign-up form.
 *
 * Uses the {@link signUp} server action via `useActionState`. The Cloudflare
 * Turnstile token is provided by the surrounding `TurnstileProvider` so it
 * can also be consumed by the OAuth buttons on the same page. Surfaces
 * server-returned success and error messages as Sonner toasts. The widget is
 * reset after each submission so retries get a fresh single-use token.
 */
export function SignUpForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(signUp, null)
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
      <TurnstileWidget />
      <input type="hidden" name="cf-turnstile-response" value={token} />
      <Button type="submit" disabled={pending}>
        {pending ? 'Creating account...' : 'Sign up'}
      </Button>
    </form>
  )
}
