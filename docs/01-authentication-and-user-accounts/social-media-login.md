# Social Media Login (Google & Discord)

**Epic:** Authentication & User Accounts
**Type:** Feature
**Status:** Done

## Summary

Allow users to sign in or sign up using their Google or Discord accounts via Supabase OAuth, in addition to the existing email/password flow.

## Acceptance Criteria

- [x] Users can sign in/sign up with Google
- [x] Users can sign in/sign up with Discord
- [x] OAuth users are redirected through `/auth/callback` and session is established
- [x] New OAuth users are redirected to `/profile/setup` (existing middleware handles this)
- [x] Existing OAuth users bypass setup and go to `/`
- [x] OAuth buttons appear on both sign-in and sign-up pages
- [x] Email/password login continues to work alongside OAuth
- [x] `avatar_url` is populated from the OAuth provider's profile picture on first login
- [x] Profile setup page pre-fills display name from OAuth provider metadata
- [x] If the suggested display name is already taken, a warning is shown
- [x] `npm run build` and `npm run lint` pass with no errors

## Key Files

| Action   | File                                                              | Description                                          |
| -------- | ----------------------------------------------------------------- | ---------------------------------------------------- |
| Modify   | `supabase/config.toml`                                            | Enable Google and Discord providers                   |
| Create   | `src/modules/auth/actions/sign-in-with-google.ts`                 | Server action for Google OAuth                        |
| Create   | `src/modules/auth/actions/sign-in-with-discord.ts`                | Server action for Discord OAuth                       |
| Create   | `src/modules/auth/components/oauth-buttons.tsx`                   | Client component with OAuth buttons and divider       |
| Modify   | `src/app/(auth)/sign-in/page.tsx`                                 | Add `OAuthButtons` below sign-in form                 |
| Modify   | `src/app/(auth)/sign-up/page.tsx`                                 | Add `OAuthButtons` below sign-up form                 |
| Existing | `src/app/auth/callback/route.ts`                                  | Handles code exchange for OAuth redirect (no changes) |
| Create   | `supabase/migrations/20260411000000_add_avatar_sync_trigger.sql`  | Trigger to sync avatar from OAuth provider            |
| Modify   | `src/app/profile/setup/page.tsx`                                  | Extract OAuth display name, check uniqueness          |
| Modify   | `src/modules/profile/components/profile-form.tsx`                 | Accept `suggestedName` and `nameAlreadyTaken` props   |

## Prerequisites

This feature depends on:

- **User Profile Creation on First Login** — The `profiles` table, `/profile/setup` page, and middleware redirect must exist before this feature can add avatar sync and display name pre-fill.
- **Protected Routes** — Middleware must already enforce auth checks so OAuth users hit the same redirect flow.

## Implementation

### 1. Enable OAuth providers in Supabase config

**File:** `supabase/config.toml`

Add `[auth.external.google]` and `[auth.external.discord]` sections after the existing `[auth.external.apple]` block (before `[auth.web3.solana]`). Both use `env()` references for secrets so credentials stay out of version control.

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

**Create:** `src/modules/auth/actions/sign-in-with-google.ts`
**Create:** `src/modules/auth/actions/sign-in-with-discord.ts`

Follow the existing one-file-per-action pattern in `src/modules/auth/actions/`. Each action is a standalone `'use server'` function (not a form action) that takes no parameters and returns no state.

Each action:
1. Creates a Supabase server client via `createClient()` from `@/lib/supabase/server`.
2. Gets the origin from `headers()`, falling back to `getSiteUrl()` from `@/modules/auth/utils/get-site-url`.
3. Calls `supabase.auth.signInWithOAuth()` with the provider name and `redirectTo` set to `${origin}/auth/callback`.
4. If the call returns a URL, redirects to it via `redirect()`.
5. If it returns an error, redirects to `/sign-in?error=<encoded message>`.

Since `signInWithOAuth()` returns a redirect URL (not a session), the server action performs the redirect server-side. These actions are invoked from button `onClick` handlers via `useTransition` in the client component.

### 3. Create OAuth buttons client component

**Create:** `src/modules/auth/components/oauth-buttons.tsx`

The sign-in and sign-up pages are **server components** that render client form components. OAuth buttons need interactivity (`useTransition`), so create a dedicated `'use client'` component:

1. **Divider** — A `<div>` with `flex items-center gap-3` containing two `<hr>` elements and a centered `<span>` with "or" text.
2. **OAuth buttons** — Two `<Button>` components styled with `btn btn-outline btn-block`:
   - "Continue with Google" with an inline Google SVG icon (multicolor brand logo).
   - "Continue with Discord" with an inline Discord SVG icon (`fill="currentColor"`).
3. Uses `useTransition` — each button calls its server action via `startTransition`.
4. Both buttons are disabled while any transition is pending.
5. Outer wrapper has `mt-6` for spacing between the form and the divider.

### 4. Add OAuth buttons to auth pages

**Modify:** `src/app/(auth)/sign-in/page.tsx`
**Modify:** `src/app/(auth)/sign-up/page.tsx`

Import `OAuthButtons` from `@/modules/auth/components/oauth-buttons` and render it inside `<CardContent>` below the existing form component. Pages remain server components — all interactivity is encapsulated in the `OAuthButtons` client component.

### 5. Avatar sync trigger migration

**Create:** `supabase/migrations/20260411000000_add_avatar_sync_trigger.sql`

Create a `sync_avatar_from_auth()` trigger function and `on_profile_sync_avatar` trigger on the `profiles` table that runs `BEFORE INSERT FOR EACH ROW`. The function:

1. Short-circuits if `NEW.avatar_url` is not null (never overwrites user-set avatars).
2. Reads `avatar_url` from `auth.users.raw_user_meta_data` for the newly inserted row's `id`.
3. If the metadata contains a non-empty `avatar_url`, sets `NEW.avatar_url` to that value.
4. Returns `NEW`.

The function uses `SECURITY DEFINER` with `set search_path = ''` to safely access `auth.users` (which RLS would otherwise block). The trigger fires `BEFORE INSERT` so the avatar URL is set in the same transaction as the profile creation.

This ensures:
- OAuth users get their provider profile picture automatically.
- Email/password users (who have no metadata avatar) are unaffected.
- If a user has already set an avatar (non-null), it is never overwritten.

### 6. Pre-fill display name on profile setup

**Modify:** `src/app/profile/setup/page.tsx`

In the server component, after fetching the authenticated user and profile:

1. Read `user.user_metadata` and extract a suggested display name by checking (in order): `full_name`, `name`, `custom_username`, `preferred_username`, `user_name`.
2. If a suggested name is found, query the `profiles` table for an existing row with a matching `display_name` (case-insensitive via `ilike`), excluding the current user.
3. Use the suggested name as the display name default value (overriding the auto-generated `ProfileXXXX` name).
4. Pass `suggestedName` and `nameAlreadyTaken` (boolean) as new props to the `ProfileForm` client component.

**Modify:** `src/modules/profile/components/profile-form.tsx`

Add optional props `suggestedName?: string | null` and `nameAlreadyTaken?: boolean`:

1. If `suggestedName` is provided, it's already used as the `defaultValues.display_name` from the page.
2. If `nameAlreadyTaken` is true and `suggestedName` is set, render a warning message below the input: "The name '{suggestedName}' is already taken. Please choose a different name." (using `text-warning` styling).
3. The warning appears in the same slot as the helper text / error message (mutually exclusive with validation errors).
4. The user can always change the pre-filled value before submitting.

### 7. Reuse existing auth callback

**File:** `src/app/auth/callback/route.ts` — **No changes needed.**

The existing route handler calls `supabase.auth.exchangeCodeForSession(code)` which works for both email confirmation and OAuth code exchange. After a successful exchange, the user is redirected to `/` (or the `next` query param). The middleware then handles redirecting profile-less users to `/profile/setup`.

### 8. Verify build and lint

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
