# Social Media Login (Google & Discord)

**Epic:** Authentication & User Accounts
**Type:** Feature
**Status:** Todo

## Summary

Allow users to sign in or sign up using their Google or Discord accounts via Supabase OAuth, in addition to the existing email/password flow.

## Acceptance Criteria

- [ ] Users can sign in/sign up with Google
- [ ] Users can sign in/sign up with Discord
- [ ] OAuth users are redirected through `/auth/callback` and session is established
- [ ] New OAuth users are redirected to `/profile/setup` (existing middleware handles this)
- [ ] Existing OAuth users bypass setup and go to `/`
- [ ] OAuth buttons appear on both sign-in and sign-up pages
- [ ] Email/password login continues to work alongside OAuth
- [ ] `avatar_url` is populated from the OAuth provider's profile picture on first login
- [ ] Profile setup page pre-fills display name from OAuth provider metadata
- [ ] If the suggested display name is already taken, a warning is shown
- [ ] `npm run build` and `npm run lint` pass with no errors

## Key Files

| Action   | File                                                     | Description                                                       |
| -------- | -------------------------------------------------------- | ----------------------------------------------------------------- |
| Modify   | `src/app/(auth)/sign-in/page.tsx`                        | Add Google and Discord OAuth buttons                              |
| Modify   | `src/app/(auth)/sign-up/page.tsx`                        | Add Google and Discord OAuth buttons                              |
| Modify   | `src/app/(auth)/actions.ts`                              | Add `signInWithGoogle()` and `signInWithDiscord()` server actions |
| Existing | `src/app/auth/callback/route.ts`                         | Handles code exchange for OAuth redirect                          |
| Modify   | `supabase/config.toml`                                   | Enable Google and Discord providers                               |
| Create   | `supabase/migrations/XXXXXX_add_avatar_sync_trigger.sql` | Trigger to sync avatar from OAuth provider                        |
| Modify   | `src/app/profile/setup/page.tsx`                         | Fetch OAuth display name, check uniqueness                        |
| Modify   | `src/app/profile/setup/profile-form.tsx`                 | Accept `suggestedName` and `nameAlreadyTaken` props               |

## Prerequisites

This feature depends on:

- **User Profile Creation on First Login** — The `profiles` table, `/profile/setup` page, and middleware redirect must exist before this feature can add avatar sync and display name pre-fill.
- **Protected Routes** — Middleware must already enforce auth checks so OAuth users hit the same redirect flow.

## Implementation

### 1. Enable OAuth providers in Supabase config

**File:** `supabase/config.toml`

Add `[auth.external.google]` and `[auth.external.discord]` sections after the existing `[auth.external.apple]` block. Both use `env()` references for secrets so credentials stay out of version control.

```toml
[auth.external.google]
enabled = true
client_id = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)"
secret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET)"
redirect_uri = ""
url = ""
skip_nonce_check = true

[auth.external.discord]
enabled = true
client_id = "env(SUPABASE_AUTH_EXTERNAL_DISCORD_CLIENT_ID)"
secret = "env(SUPABASE_AUTH_EXTERNAL_DISCORD_SECRET)"
redirect_uri = ""
url = ""
```

- `skip_nonce_check = true` on Google is required for local development with Supabase's auth server.
- `redirect_uri` is left empty to use the Supabase default (`<supabase-url>/auth/v1/callback`).

### 2. Add OAuth server actions

**File:** `src/app/(auth)/actions.ts`

Add two new exported async functions: `signInWithGoogle()` and `signInWithDiscord()`. These are standalone server actions (not form actions), so they take no parameters and return no state.

Each action:
1. Creates a Supabase server client.
2. Calls `supabase.auth.signInWithOAuth()` with the provider name and `redirectTo` set to `${origin}/auth/callback` (using the existing `getSiteUrl()` helper or request origin).
3. If the call returns a URL, redirects to it via `redirect()`.
4. If it returns an error, redirects to `/sign-in?error=<message>`.

Since `signInWithOAuth()` returns a redirect URL (not a session), the server action performs the redirect server-side. These actions are invoked directly from button `onClick` handlers via `useTransition`, not through `useActionState` forms.

### 3. Add OAuth buttons to auth pages

**Files:** `src/app/(auth)/sign-in/page.tsx`, `src/app/(auth)/sign-up/page.tsx`

On both pages, add a visual divider and two OAuth buttons below the existing email/password form, inside the `<CardContent>`:

1. **Divider** — A horizontal rule with "or" text centered, using a `<div>` with `flex items-center gap-3` containing two `<hr>` elements and a `<span>` with "or" text.

2. **OAuth buttons** — Two buttons styled with `btn btn-outline btn-block`:
   - "Continue with Google" with an inline Google SVG icon (20×20).
   - "Continue with Discord" with an inline Discord SVG icon (20×20).

Each button calls the corresponding server action via `startTransition(() => signInWithGoogle())` from a `useTransition` hook. Both buttons are disabled while any transition is pending.

Import the new actions at the top of each file. Since these pages are already `'use client'`, add `useTransition` to the React import.

### 4. Avatar sync trigger migration

**File:** `supabase/migrations/<timestamp>_add_avatar_sync_trigger.sql`

Create a database trigger function and trigger on the `profiles` table that runs on INSERT. The function:

1. Reads `avatar_url` from `auth.users.raw_user_meta_data` for the newly inserted row's `id`.
2. If `NEW.avatar_url` is null and the metadata contains an `avatar_url`, sets `NEW.avatar_url` to the metadata value.
3. Returns `NEW`.

The function uses `SECURITY DEFINER` to access `auth.users` (which RLS would otherwise block). The trigger fires `BEFORE INSERT` so the avatar URL is set in the same transaction as the profile creation.

This ensures:
- OAuth users get their provider profile picture automatically.
- Email/password users (who have no metadata avatar) are unaffected.
- If a user has already set an avatar (non-null), it is never overwritten.

### 5. Pre-fill display name on profile setup

**File:** `src/app/profile/setup/page.tsx`

In the server component, after fetching the authenticated user:

1. Read `user.user_metadata` and extract a suggested display name by checking (in order): `full_name`, `name`, `custom_username`, `preferred_username`, `user_name`.
2. If a suggested name is found, query the `profiles` table for an existing row with the same `display_name` (case-insensitive via `ilike`).
3. Pass `suggestedName` and `nameAlreadyTaken` (boolean) as props to the `ProfileForm` client component.

**File:** `src/app/profile/setup/profile-form.tsx`

Accept optional `suggestedName?: string` and `nameAlreadyTaken?: boolean` props:

1. If `suggestedName` is provided, use it as the initial value for the display name input.
2. If `nameAlreadyTaken` is true, render a warning message below the input: "The name '{suggestedName}' is already taken. Please choose a different name."
3. The user can always change the pre-filled value before submitting.

### 6. Reuse existing auth callback

**File:** `src/app/auth/callback/route.ts` — **No changes needed.**

The existing route handler calls `supabase.auth.exchangeCodeForSession(code)` which works for both email confirmation and OAuth code exchange. After a successful exchange, the user is redirected to `/` (or the `next` query param). The middleware then handles redirecting profile-less users to `/profile/setup`.

### 7. Verify build and lint

Run `npm run build` and `npm run lint` to confirm no errors are introduced.

## Key Design Decisions

- **Server actions for OAuth** — `signInWithOAuth()` returns a redirect URL; the server action performs the redirect server-side.
- **Avatar sync via database trigger** — Keeps logic in Supabase, never overwrites user-set avatars, uses `security definer` to read `auth.users`.
- **Shared callback route** — Both email confirmation and OAuth use `/auth/callback`.
- **Display name pre-fill** — Server-side check at page load so the uniqueness warning appears immediately.

## Notes

- Google OAuth requires a Google Cloud Console project with OAuth 2.0 credentials.
- Discord OAuth requires a Discord Developer Application.
- For local development, redirect URIs must include `http://localhost:54321/auth/v1/callback`.
