# Social Login (Google & Discord)

**Epic:** User Authentication
**Type:** Feature
**Status:** Todo

## Summary

Allow users to sign in or sign up using their Google or Discord accounts via Supabase OAuth, in addition to the existing email/password flow.

## Acceptance Criteria

- [ ] Users can sign in/sign up with Google
- [ ] Users can sign in/sign up with Discord
- [ ] OAuth users are redirected through `/auth/callback` and session is established
- [ ] New users are redirected to `/profile/setup` via middleware (display name matches `Painter####` pattern)
- [ ] Users who have completed profile setup bypass it and go to `/`
- [ ] OAuth buttons appear on both sign-in and sign-up pages
- [ ] Email/password login continues to work alongside OAuth
- [x] `avatar_url` column exists in `profiles` table (nullable text) — already in current schema
- [x] On user creation, `avatar_url` is populated from provider metadata — `handle_new_user()` trigger already does this
- [ ] Profile setup page pre-fills display name from OAuth provider metadata (`full_name`, `name`, or `custom_username`)
- [ ] If the suggested display name is already taken, a warning is shown on the profile setup page

## Routes

| Route | Type | Description |
| ----- | ---- | ----------- |
| `/auth/callback` | Existing | Exchanges OAuth code for session (no changes needed) |
| `/profile/setup` | **New** | Profile setup page for new users to customize display name |

## Key Files

| Action | File | Description |
| ------ | ---- | ----------- |
| Modify | `src/app/(auth)/sign-in/page.tsx` | Add Google and Discord OAuth buttons |
| Modify | `src/app/(auth)/sign-up/page.tsx` | Add Google and Discord OAuth buttons |
| Modify | `src/app/(auth)/actions.ts` | Add `signInWithGoogle()` and `signInWithDiscord()` server actions |
| Modify | `supabase/config.toml` | Enable Google and Discord providers |
| Create | `src/app/profile/setup/page.tsx` | Profile setup page — reads OAuth metadata, checks name uniqueness |
| Create | `src/app/profile/setup/profile-form.tsx` | Client-side form with pre-filled display name and taken-name warning |
| Create | `src/app/profile/setup/actions.ts` | `completeProfileSetup` server action to update display name |
| Modify | `src/middleware.ts` | Redirect authenticated users with default `Painter####` names to `/profile/setup` |
| Modify | `src/app/auth/callback/route.ts` | Generalize error message for OAuth failures |
| Modify | `.env.example` | Add OAuth client ID and secret placeholders |

## Implementation Plan

### Step 1: Enable OAuth providers in Supabase config

**File:** `supabase/config.toml`

Add Google and Discord provider blocks after the existing `[auth.external.apple]` section. Follow the same structure as the apple block:

```toml
[auth.external.google]
enabled = true
client_id = "env(GOOGLE_CLIENT_ID)"
secret = "env(GOOGLE_CLIENT_SECRET)"
redirect_uri = ""
url = ""
skip_nonce_check = true
email_optional = false

[auth.external.discord]
enabled = true
client_id = "env(DISCORD_CLIENT_ID)"
secret = "env(DISCORD_CLIENT_SECRET)"
redirect_uri = ""
url = ""
skip_nonce_check = false
email_optional = false
```

**File:** `.env.example` — append OAuth credential placeholders:

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
```

### Step 2: Add OAuth server actions

**File:** `src/app/(auth)/actions.ts`

Add `headers` import from `next/headers`. Add two new exported async functions:

- `signInWithGoogle()` — no parameters, no state return
- `signInWithDiscord()` — no parameters, no state return

Both follow the same pattern:
1. Create Supabase server client
2. Read request origin from `(await headers()).get('origin')`
3. Call `supabase.auth.signInWithOAuth({ provider, options: { redirectTo: origin + '/auth/callback' } })`
4. On error, redirect to `/sign-in?error=...`
5. On success, redirect to `data.url` (the provider's OAuth consent screen)

These are simple server actions (not `useActionState` compatible) — they always redirect, never return state.

### Step 3: Add OAuth buttons to sign-in and sign-up pages

**Files:** `src/app/(auth)/sign-in/page.tsx`, `src/app/(auth)/sign-up/page.tsx`

Import `signInWithGoogle` and `signInWithDiscord` from the actions file. Add below the existing email/password `</form>` and before the sign-in/sign-up link paragraph:

1. A DaisyUI divider: `<div className="divider">or</div>`
2. Two `<form>` elements, each wrapping a single submit button:
   - `<form action={signInWithGoogle}>` → `<button className="btn btn-outline w-full">Continue with Google</button>`
   - `<form action={signInWithDiscord}>` → `<button className="btn btn-outline w-full">Continue with Discord</button>`
3. Wrap the two OAuth forms in a `<div className="flex flex-col gap-2">` for spacing

Use inline SVG elements for Google and Discord brand icons inside the buttons (small 20x20 icons before the text).

No `useActionState` needed — these forms just redirect, they don't return state. Plain `<form action={serverAction}>` works in client components.

### Step 4: Update auth callback error message

**File:** `src/app/auth/callback/route.ts`

Change the fallback error redirect from:
```
/sign-in?error=Could not verify your email. Please try again.
```
to:
```
/sign-in?error=Authentication failed. Please try again.
```

The existing `exchangeCodeForSession(code)` logic works for both email confirmation and OAuth code exchange — no other changes needed.

### Step 5: Create profile setup page

**File:** `src/app/profile/setup/page.tsx` (new — server component)

1. Call `getAuthUser({ withProfile: true })`
2. If not authenticated → redirect to `/sign-in`
3. If `profile.display_name` does NOT match `/^Painter\d{4}$/` → redirect to `/` (setup already completed)
4. Read suggested display name from `user.user_metadata`:
   - Try fields in order: `full_name`, `name`, `custom_username`
   - Use the first non-empty value found
5. If a suggested name exists, query profiles to check uniqueness: `supabase.from('profiles').select('id').ilike('display_name', suggestedName).single()`
6. Render a centered layout (matching auth page style) with `<ProfileSetupForm suggestedName={...} nameAlreadyTaken={...} />`

**File:** `src/app/profile/setup/profile-form.tsx` (new — client component)

Props: `suggestedName?: string`, `nameAlreadyTaken?: boolean`

Layout matches the sign-in/sign-up card style:
1. DaisyUI `card` with `card-body`
2. Title: "Set up your profile"
3. If `nameAlreadyTaken`, show `alert alert-warning`: "The name '{suggestedName}' is already taken. Please choose a different one."
4. Display name `input input-bordered` with `defaultValue={suggestedName}`
5. Submit button: `btn btn-primary w-full` → "Continue"
6. Uses `useActionState` with `completeProfileSetup` for error handling

**File:** `src/app/profile/setup/actions.ts` (new — server action)

Export `completeProfileSetup(prevState, formData)`:
1. Get authenticated user via `getAuthUser()`
2. Extract `display_name` from form data
3. Validate: non-empty, 2-30 characters, no leading/trailing whitespace
4. Update profile: `supabase.from('profiles').update({ display_name }).eq('id', user.id)`
5. Handle unique constraint violation (code `23505`) → return `{ error: 'This display name is already taken' }`
6. On success: `revalidatePath('/', 'layout')` then `redirect('/')`

### Step 6: Update middleware for profile setup redirect

**File:** `src/middleware.ts`

After the existing `await supabase.auth.getUser()` call:

1. Extract user: `const { data: { user } } = await supabase.auth.getUser()`
2. Define skip paths: `/profile/setup`, `/auth/`, `/sign-in`, `/sign-up`, `/sign-up/confirm`, `/_next/`
3. If user is authenticated AND current path is not in skip list:
   - Query profile: `supabase.from('profiles').select('display_name').eq('id', user.id).single()`
   - If `display_name` matches `/^Painter\d{4}$/` → redirect to `/profile/setup`
4. If user is NOT authenticated AND path is `/profile/setup` → redirect to `/sign-in`

This adds one DB query per authenticated page load. The query is a PK lookup on profiles (fast). Once the user completes setup, the check passes immediately and no redirect occurs.

### No migration needed

The `avatar_url` column already exists in the `profiles` table (added in `20260408204618_remote_schema.sql`). The `handle_new_user()` trigger already reads `raw_user_meta_data->>'avatar_url'` on INSERT, so OAuth provider avatars are automatically captured when the profile is created.

## Key Design Decisions

- **Server actions for OAuth** — `signInWithOAuth()` returns a redirect URL. The server action performs the redirect, keeping the flow server-side. No client-side JS needed for the OAuth buttons.
- **Avatar sync already handled** — The existing `handle_new_user()` trigger reads `raw_user_meta_data->>'avatar_url'` on INSERT, so OAuth avatars are automatically captured when the profile is created. No new migration needed.
- **Profile setup detection via display name pattern** — New users are auto-assigned `Painter####` names by `generate_painter_name()`. The middleware checks this pattern (`/^Painter\d{4}$/`) to determine if profile setup is needed, avoiding an extra database column.
- **Middleware profile check** — Adds one lightweight DB query (PK lookup) per authenticated request. Once the user completes setup, the regex check passes immediately and no redirect occurs.
- **Reuse existing callback** — The `/auth/callback` route already handles code exchange via `exchangeCodeForSession()`, which works for both email confirmation and OAuth flows.

## Risks & Considerations

- **Google `skip_nonce_check: true`** is required for local development with Google OAuth. In production, configure the Google Cloud Console properly and consider setting to `false`.
- **Google OAuth credentials** must be obtained from Google Cloud Console. Discord credentials already exist in `.env.local`.
- **Redirect URIs** must be registered with each provider: `http://localhost:54321/auth/v1/callback` for local dev, `https://<project>.supabase.co/auth/v1/callback` for production.
- **`email_confirmed_at` for OAuth users** — `getAuthUser()` returns null if `email_confirmed_at` is falsy. Supabase auto-sets this for OAuth users, but verify during testing.
- **Display name uniqueness** — The `UNIQUE` constraint on `display_name` means OAuth-suggested names may conflict. The setup page pre-checks and warns, and the server action handles constraint violations gracefully.
- **Middleware performance** — The profile query runs on every authenticated page load. Monitor and consider a cookie-based flag if latency becomes an issue.

## Notes

- **Google OAuth** requires a Google Cloud Console project with OAuth 2.0 credentials. Authorized redirect URI: `https://<supabase-project>.supabase.co/auth/v1/callback`.
- **Discord OAuth** requires a Discord Developer Application. Redirect URI: `https://<supabase-project>.supabase.co/auth/v1/callback`.
- For local development, redirect URIs must include `http://localhost:54321/auth/v1/callback` (Supabase local auth server).
