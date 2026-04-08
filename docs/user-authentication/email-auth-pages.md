# Email Authentication Pages

**Epic:** User Authentication
**Type:** Feature
**Status:** Done

## Summary

Allow users to create an account and log in using email and password through Supabase Auth.

## Acceptance Criteria

- [x] Users can sign up with email and password
- [x] Users can sign in with existing credentials
- [x] Users can sign out
- [x] Auth state persists across page refreshes (SSR-compatible via `@supabase/ssr`)
- [x] Error messages display for invalid credentials or duplicate accounts

## Routes

- `/sign-up` — Registration page
- `/sign-in` — Login page
- `/auth/callback` — Supabase auth callback handler for confirming email/session exchange

## Key Files

| Action | File                              | Description                                       |
| ------ | --------------------------------- | ------------------------------------------------- |
| Create | `app/(auth)/layout.tsx`           | Minimal centered layout for auth pages            |
| Create | `app/(auth)/sign-up/page.tsx`     | Sign up form                                      |
| Create | `app/(auth)/sign-in/page.tsx`     | Sign in form                                      |
| Create | `app/(auth)/actions.ts`           | Server actions for `signUp`, `signIn`, `signOut`  |
| Create | `app/auth/callback/route.ts`      | Auth callback route handler                       |

## Approach

### 1. Auth layout

`app/(auth)/layout.tsx` uses a `(auth)` route group so sign-up/sign-in pages share a minimal layout without the main app navigation. Renders children centered on screen with `flex min-h-screen items-center justify-center`.

### 2. Sign up page

`app/(auth)/sign-up/page.tsx` — Client component (`'use client'`) using React `useActionState` hook bound to the `signUp` server action.

- DaisyUI card layout (`card`, `card-body`, `card-title`) with email and password inputs (`input input-bordered`).
- Password field has `minLength={6}` for client-side validation.
- Submit button shows a DaisyUI loading spinner (`loading loading-spinner`) while `pending`.
- On success, displays a `alert-success` message: "Check your email to confirm your account."
- On error, displays the Supabase error message in an `alert-error` alert.
- Includes a link to `/sign-in` for existing users.

### 3. Sign in page

`app/(auth)/sign-in/page.tsx` — Client component (`'use client'`) using React `useActionState` hook bound to the `signIn` server action.

- Same DaisyUI card layout as the sign-up page, without `minLength` on the password field.
- Submit button shows a loading spinner while `pending`.
- On error, displays the Supabase error message in an `alert-error` alert.
- On success, the server action redirects to `/` (no client-side success message needed).
- Includes a link to `/sign-up` for new users.

### 4. Auth server actions

`app/(auth)/actions.ts` — Marked with `'use server'` directive. Exports three actions: `signUp`, `signIn`, `signOut`.

- Shared `AuthState` type: `{ error?: string; success?: string } | null`.
- `signUp(prevState, formData)` — Calls `supabase.auth.signUp({ email, password })`. Returns `{ success }` on success or `{ error }` on failure. Does not redirect (user stays on page to see the confirmation message).
- `signIn(prevState, formData)` — Calls `supabase.auth.signInWithPassword({ email, password })`. Returns `{ error }` on failure. Calls `redirect('/')` on success.
- `signOut()` — Calls `supabase.auth.signOut()`, then `redirect('/sign-in')`.

### 5. Auth callback route

`app/auth/callback/route.ts` — Next.js route handler (`GET`) that handles the redirect from Supabase email confirmation links.

- Reads `code` and optional `next` (defaults to `/`) query parameters from the URL.
- Calls `supabase.auth.exchangeCodeForSession(code)` to complete email verification.
- On success, redirects to `${origin}${next}`.
- On error (or missing code), redirects to `/sign-in?error=Could not verify your email. Please try again.`.

## Notes

- All auth forms use DaisyUI component classes for styling.
- Server actions are preferred over client-side API calls — form pages invoke them via `useActionState` which handles the pending/error state lifecycle.
