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

| Action | File | Description |
|---|---|---|
| Modify | `src/app/(auth)/sign-in/page.tsx` | Add Google and Discord OAuth buttons |
| Modify | `src/app/(auth)/sign-up/page.tsx` | Add Google and Discord OAuth buttons |
| Modify | `src/app/(auth)/actions.ts` | Add `signInWithGoogle()` and `signInWithDiscord()` server actions |
| Existing | `src/app/auth/callback/route.ts` | Handles code exchange for OAuth redirect |
| Modify | `supabase/config.toml` | Enable Google and Discord providers |
| Create | `supabase/migrations/XXXXXX_add_avatar_sync_trigger.sql` | Trigger to sync avatar from OAuth provider |
| Modify | `src/app/profile/setup/page.tsx` | Fetch OAuth display name, check uniqueness |
| Modify | `src/app/profile/setup/profile-form.tsx` | Accept `suggestedName` and `nameAlreadyTaken` props |

## Implementation

### 1. Enable OAuth providers in Supabase

Update `supabase/config.toml` to enable Google and Discord with environment variable references for client IDs and secrets.

### 2. Add OAuth server actions

Add `signInWithGoogle()` and `signInWithDiscord()` to `src/app/(auth)/actions.ts`. Both call `supabase.auth.signInWithOAuth()` with a redirect URL pointing to `/auth/callback`.

### 3. Add OAuth buttons to auth pages

Add "Continue with Google" and "Continue with Discord" buttons to both sign-in and sign-up pages, separated from the email/password form by a divider.

### 4. Avatar sync trigger

Create a database trigger on `profiles` that populates `avatar_url` from `auth.users.raw_user_meta_data->>'avatar_url'` when `avatar_url` is null. Only writes when empty so user-set avatars are never overwritten.

### 5. Pre-fill display name on profile setup

When an OAuth user lands on `/profile/setup`, read the user's metadata (`full_name`, `name`, or `custom_username`) and pass it to the form as a suggested name. Check uniqueness and show a warning if taken.

### 6. Reuse existing auth callback

The existing `/auth/callback` route handler works for both email confirmation and OAuth flows — no changes needed.

## Key Design Decisions

- **Server actions for OAuth** — `signInWithOAuth()` returns a redirect URL; the server action performs the redirect server-side.
- **Avatar sync via database trigger** — Keeps logic in Supabase, never overwrites user-set avatars, uses `security definer` to read `auth.users`.
- **Shared callback route** — Both email confirmation and OAuth use `/auth/callback`.
- **Display name pre-fill** — Server-side check at page load so the uniqueness warning appears immediately.

## Notes

- Google OAuth requires a Google Cloud Console project with OAuth 2.0 credentials.
- Discord OAuth requires a Discord Developer Application.
- For local development, redirect URIs must include `http://localhost:54321/auth/v1/callback`.
