# Email Authentication Pages

**Epic:** User Authentication
**Type:** Feature
**Status:** Todo

## Summary

Create sign-up and sign-in pages with email/password authentication using Supabase Auth. Includes server actions for form handling, email confirmation flow, and auth callback route.

## Acceptance Criteria

- [ ] Sign-up page at `/sign-up` with email and password fields
- [ ] Sign-in page at `/sign-in` with email and password fields
- [ ] Server actions for `signUp`, `signIn`, and `signOut` in `(auth)/actions.ts`
- [ ] Auth callback route at `/auth/callback` handles OAuth and PKCE code exchange
- [ ] Auth confirm route at `/auth/confirm` handles email confirmation links
- [ ] Email confirmation required for new sign-ups
- [ ] Error and success messages displayed on forms
- [ ] Minimum password length of 6 characters enforced
- [ ] Redirect to home page after successful sign-in
- [ ] Links between sign-up and sign-in pages

## Implementation Plan

### Step 1: Create auth route group and server actions

**`src/app/(auth)/actions.ts`** — Server actions using Supabase Auth API. This file consolidates all auth-related server actions. Uses `useActionState`-compatible signatures (`prevState, formData`) for progressive enhancement.

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

function getSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

type AuthState = { error?: string; success?: string } | null

export async function signUp(prevState: AuthState, formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
    },
  })

  if (error) return { error: error.message }
  return { success: 'Check your email to confirm your account.' }
}

export async function signIn(prevState: AuthState, formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}
```

The `getSiteUrl()` helper resolves the site URL for email redirect links, supporting local dev, Vercel preview, and production environments.

### Step 2: Create sign-up page

**`src/app/(auth)/sign-up/page.tsx`** — Client component with email/password form using `useActionState` for progressive enhancement. DaisyUI card + form styling.

- Email input (required)
- Password input (required, `minLength={6}`)
- Submit button with loading spinner
- Success state shows "Check your email to confirm your account"
- Error state shows error message in alert
- Link to sign-in page: "Already have an account? Sign in"
- Divider and OAuth buttons placeholder (populated by Social Login feature)

Reference: `grimdark.nathanhealea.com/src/app/(auth)/sign-up/page.tsx`

### Step 3: Create sign-in page

**`src/app/(auth)/sign-in/page.tsx`** — Client component with email/password form using `useActionState`.

- Email input (required)
- Password input (required)
- Submit button with loading spinner
- Error display for invalid credentials (from form state and URL query params)
- Success/message display from URL query params (e.g., post-password-reset redirect)
- Uses `useSearchParams` wrapped in `Suspense` for reading URL params
- "Forgot your password?" link to `/forgot-password`
- Link to sign-up page: "Don't have an account? Sign up"
- Divider and OAuth buttons placeholder (populated by Social Login feature)

Reference: `grimdark.nathanhealea.com/src/app/(auth)/sign-in/page.tsx`

### Step 4: Create auth callback route

**`src/app/auth/callback/route.ts`** — Handles OAuth redirects and email confirmation PKCE code exchange:

```typescript
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      revalidatePath('/', 'layout')
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/sign-in?error=Could not verify your email. Please try again.`)
}
```

This is a simplified version — the grimdark reference includes Discord profile auto-linking logic that isn't needed for colorwheel.

### Step 5: Create auth confirm route

**`src/app/auth/confirm/route.ts`** — Handles email confirmation token verification and password reset token verification. Supports both PKCE flow (`code` param) and legacy flow (`token_hash` + `type` params):

```typescript
import { createClient } from '@/lib/supabase/server'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as 'recovery' | 'signup' | 'email'
  const next = searchParams.get('next') ?? '/'

  const supabase = await createClient()

  // PKCE flow
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  }

  // Fallback: direct token_hash verification (non-PKCE)
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  }

  return NextResponse.redirect(
    `${origin}/sign-in?error=${encodeURIComponent('Your verification link is invalid or has expired. Please try again.')}`
  )
}
```

### Affected Files

| File | Changes |
|------|---------|
| `src/app/(auth)/actions.ts` | New — server actions for signUp, signIn, signOut |
| `src/app/(auth)/sign-up/page.tsx` | New — sign-up form page |
| `src/app/(auth)/sign-in/page.tsx` | New — sign-in form page |
| `src/app/auth/callback/route.ts` | New — OAuth/PKCE callback handler |
| `src/app/auth/confirm/route.ts` | New — email/password reset confirmation handler |

### Dependencies

- [Supabase Setup](./supabase-setup.md) — `createClient` from `src/lib/supabase/server.ts`

### Risks & Considerations

- Email confirmation requires a working SMTP setup in Supabase (built-in for hosted projects, configure for local dev via `supabase/config.toml`).
- Forms use `useActionState` (React 19) — Next.js 16 with React 19 supports this natively.
- The `(auth)` route group keeps auth pages in a separate layout segment. These pages don't need the main app's sidebar/header chrome.
- The `getSiteUrl()` helper is critical for email redirect links working in all environments (local, preview, production).
- Reference `grimdark.nathanhealea.com/src/app/(auth)/` for the exact form patterns and DaisyUI styling.
