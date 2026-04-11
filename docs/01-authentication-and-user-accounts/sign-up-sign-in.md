# Sign Up / Sign In via Supabase Auth

**Epic:** Authentication & User Accounts
**Type:** Feature
**Status:** Done
**Branch:** `v1/feature/sign-up-sign-in`

## Summary

Allow users to create an account and log in using email and password through Supabase Auth.

## Acceptance Criteria

- [x] Users can sign up with email and password
- [x] Users can sign in with existing credentials
- [x] Users can sign out
- [x] Auth state persists across page refreshes (SSR-compatible via `@supabase/ssr`)
- [x] Error messages display for invalid credentials or duplicate accounts
- [x] `npm run build` and `npm run lint` pass with no errors

## Routes

| Route            | Description                                                          |
| ---------------- | -------------------------------------------------------------------- |
| `/sign-up`       | Registration page                                                    |
| `/sign-in`       | Login page                                                           |
| `/auth/callback` | Supabase auth callback handler for confirming email/session exchange |

## Key Files

| Action | File                              | Description                                      |
| ------ | --------------------------------- | ------------------------------------------------ |
| Create | `src/lib/supabase/client.ts`      | Browser Supabase client                          |
| Create | `src/lib/supabase/server.ts`      | Server-side Supabase client (cookies-based)      |
| Create | `src/middleware.ts`               | Auth session refresh middleware                  |
| Create | `src/app/(auth)/layout.tsx`       | Minimal centered layout for auth pages           |
| Create | `src/app/(auth)/sign-up/page.tsx` | Sign up form                                     |
| Create | `src/app/(auth)/sign-in/page.tsx` | Sign in form                                     |
| Create | `src/app/(auth)/actions.ts`       | Server actions for `signUp`, `signIn`, `signOut` |
| Create | `src/app/auth/callback/route.ts`  | Auth callback route handler                      |
| Create | `.env.local`                      | Supabase environment variables                   |

## Implementation

### Step 1: Install Supabase packages

```bash
npm install @supabase/supabase-js @supabase/ssr
```

### Step 2: Install shadcn/ui components needed for auth forms

```bash
npx shadcn@latest add card input label
```

These provide the form structure. The existing `Button` component is already available.

### Step 2A: Add daisyUI-style CSS for card, input, label, and form

Create CSS files in `src/styles/` using `@layer components` with daisyUI naming conventions, adapted from the duckling project's styling patterns. Import them in `src/app/globals.css`.

**File:** `src/styles/card.css`

Card classes: `.card`, `.card-body`, `.card-title`, `.card-description`, `.card-footer`. Sizes: `.card-compact`, `.card-normal`. Variants: `.card-bordered`.

```css
@layer components {
  .card {
    @apply border-border bg-card text-card-foreground rounded-xl border shadow-sm;
  }

  .card-body {
    @apply flex flex-col gap-4 p-6;
  }

  .card-compact .card-body {
    @apply gap-3 p-4;
  }

  .card-title {
    @apply text-lg leading-none font-semibold tracking-tight;
  }

  .card-description {
    @apply text-muted-foreground text-sm;
  }

  .card-footer {
    @apply flex items-center p-6 pt-0;
  }

  .card-bordered {
    @apply border-2;
  }
}
```

**File:** `src/styles/input.css`

Input classes: `.input` (base), sizes (`.input-xs`, `.input-sm`, `.input-md`, `.input-lg`), colors (`.input-primary`, `.input-secondary`, `.input-accent`, `.input-error`), states (`.input-disabled`, `.input-ghost`). Also includes `.textarea` base and sizes.

```css
@layer components {
  .input {
    @apply border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 h-9 w-full min-w-0 rounded-lg border bg-transparent px-3 py-1.5 text-sm transition-colors outline-none focus-visible:ring-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3;
  }

  .input-xs {
    @apply h-6 px-2 py-0.5 text-xs;
  }
  .input-sm {
    @apply h-7 px-2.5 py-1 text-xs;
  }
  .input-md {
    @apply h-9 px-3 py-1.5 text-sm;
  }
  .input-lg {
    @apply h-11 px-4 py-2.5 text-base;
  }

  .input-primary {
    @apply border-primary focus-visible:border-primary focus-visible:ring-primary/50;
  }
  .input-secondary {
    @apply border-secondary focus-visible:border-secondary focus-visible:ring-secondary/50;
  }
  .input-accent {
    @apply border-accent focus-visible:border-accent focus-visible:ring-accent/50;
  }
  .input-error {
    @apply border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20;
  }

  .input-disabled {
    @apply pointer-events-none cursor-not-allowed opacity-50;
  }
  .input-ghost {
    @apply focus-visible:border-ring border-transparent bg-transparent focus-visible:bg-transparent;
  }

  .textarea {
    @apply border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 field-sizing-content w-full min-w-0 rounded-lg border bg-transparent px-3 py-2 text-sm transition-colors outline-none focus-visible:ring-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3;
    min-height: 5rem;
    resize: vertical;
  }

  .textarea-xs {
    @apply px-2 py-1 text-xs;
    min-height: 3rem;
  }
  .textarea-sm {
    @apply px-2.5 py-1.5 text-xs;
    min-height: 4rem;
  }
  .textarea-md {
    @apply px-3 py-2 text-sm;
    min-height: 5rem;
  }
  .textarea-lg {
    @apply px-4 py-3 text-base;
    min-height: 7rem;
  }
}
```

**File:** `src/styles/label.css`

Label classes: `.label`, `.label-text`, `.label-text-alt`.

```css
@layer components {
  .label {
    @apply flex items-center gap-2 text-sm leading-none font-medium select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50;
  }

  .label-text {
    @apply text-foreground text-sm font-medium;
  }
  .label-text-alt {
    @apply text-muted-foreground text-xs font-normal;
  }
}
```

**File:** `src/styles/form.css`

Form layout classes: `.form-control`, `.form-item`, `.form-label`, `.form-message`, `.form-description`.

```css
@layer components {
  .form-control {
    @apply flex w-full flex-col gap-5;
  }
  .form-item {
    @apply flex w-full flex-col gap-2;
  }
  .form-label {
    @apply text-sm leading-none font-medium select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50;
  }
  .form-message {
    @apply text-destructive text-sm font-normal;
  }
  .form-description {
    @apply text-muted-foreground text-sm;
  }
}
```

**Update:** `src/app/globals.css` — add imports after the existing tailwind imports:

```css
@import '../styles/card.css';
@import '../styles/input.css';
@import '../styles/label.css';
@import '../styles/form.css';
```

### Step 3: Create `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=<supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
```

### Step 4: Create browser Supabase client

**File:** `src/lib/supabase/client.ts`

```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}
```

### Step 5: Create server Supabase client

**File:** `src/lib/supabase/server.ts`

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Called from a Server Component where cookies are read-only.
          // Middleware handles the session refresh in this case.
        }
      },
    },
  })
}
```

### Step 6: Create middleware

**File:** `src/middleware.ts`

Session-refresh-only middleware. Does **not** handle route protection or profile checks — those are separate features ([protected-routes.md](./protected-routes.md)).

- Creates an inline `createServerClient` using request/response cookie accessors
- Calls `supabase.auth.getUser()` to refresh expired tokens into response cookies
- Matcher excludes static assets: `_next/static`, `_next/image`, `favicon.ico`, and image extensions

```ts
import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  await supabase.auth.getUser()

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

### Step 7: Create auth layout

**File:** `src/app/(auth)/layout.tsx`

Uses a `(auth)` route group so sign-up/sign-in pages share a minimal centered layout without the main app navigation.

```tsx
export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="flex min-h-screen w-full items-center justify-center px-4 py-24">{children}</div>
}
```

### Step 8: Create auth server actions

**File:** `src/app/(auth)/actions.ts`

Three actions: `signUp`, `signIn`, `signOut`. Uses `getSiteUrl()` helper for email redirect URL (supports localhost, Vercel preview, and production).

- `signUp(prevState, formData)` — calls `supabase.auth.signUp({ email, password })` with `emailRedirectTo` pointing to `/auth/callback`. Returns `{ success }` or `{ error }`.
- `signIn(prevState, formData)` — calls `supabase.auth.signInWithPassword()`. Calls `revalidatePath('/', 'layout')` then `redirect('/')` on success.
- `signOut()` — calls `supabase.auth.signOut()`, revalidates, redirects to `/`.

Shared type: `AuthState = { error?: string; success?: string } | null`.

### Step 9: Create sign-up page

**File:** `src/app/(auth)/sign-up/page.tsx`

- Client component (`'use client'`) using `useActionState` bound to `signUp` action
- shadcn/ui `Card` with `CardHeader`, `CardContent`, `CardFooter`
- `Label` + `Input` for email and password fields
- Password field has `minLength={6}`
- `Button` with loading state via `useFormStatus` or pending from `useActionState`
- Success alert: "Check your email to confirm your account."
- Error alert with Supabase error message
- Link to `/sign-in` for existing users

### Step 10: Create sign-in page

**File:** `src/app/(auth)/sign-in/page.tsx`

- Same structure as sign-up, bound to `signIn` action
- No `minLength` on password field
- No success state needed (redirects on success)
- Error alert with Supabase error message
- Link to `/sign-up` for new users

### Step 11: Create auth callback route

**File:** `src/app/auth/callback/route.ts`

- Next.js route handler (`GET`)
- Reads `code` and optional `next` (defaults to `/`) from URL search params
- Calls `supabase.auth.exchangeCodeForSession(code)` to complete email verification
- On success: `revalidatePath('/', 'layout')` then redirect to `${origin}${next}`
- On error or missing code: redirect to `/sign-in?error=Could not verify your email. Please try again.`

### Step 12: Verify

1. Run `npm run build` — must pass with no errors
2. Run `npm run lint` — must pass with no errors
3. Run `npm run prettify` — format all new files

## Notes

- Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- This feature uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` (standard Supabase naming) rather than the grimdark project's `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`.
- UI uses shadcn/ui Card, Input, Label, and Button components with daisyUI-style utility classes for additional styling.
- Server actions are preferred over client-side API calls — form pages invoke them via `useActionState`.
- The middleware in this feature only refreshes sessions. Route protection and profile checks will be added by the [protected routes](./protected-routes.md) and [user profile creation](./user-profile-creation-on-first-login.md) features.
