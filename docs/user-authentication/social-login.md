# Social Login (Google & Discord)

**Epic:** User Authentication
**Type:** Feature
**Status:** Todo

## Summary

Add Google and Discord OAuth login options to the sign-in and sign-up pages. Users can authenticate via their Google or Discord accounts as an alternative to email/password.

## Acceptance Criteria

- [ ] Google OAuth login button on sign-in and sign-up pages
- [ ] Discord OAuth login button on sign-in and sign-up pages
- [ ] OAuth redirects handled by existing `/auth/callback` route
- [ ] Profile auto-created for OAuth users (using display name from provider)
- [ ] OAuth providers configured in `supabase/config.toml`
- [ ] Environment variables for provider client IDs and secrets documented
- [ ] Users who sign up via OAuth can still set a password later (optional)

## Implementation Plan

### Step 1: Configure OAuth providers in Supabase

Update **`supabase/config.toml`** to enable Google and Discord:

```toml
[auth.external.google]
enabled = true
client_id = "env(GOOGLE_CLIENT_ID)"
secret = "env(GOOGLE_CLIENT_SECRET)"
redirect_uri = "http://localhost:54321/auth/v1/callback"

[auth.external.discord]
enabled = true
client_id = "env(DISCORD_CLIENT_ID)"
secret = "env(DISCORD_CLIENT_SECRET)"
redirect_uri = "http://localhost:54321/auth/v1/callback"
```

### Step 2: Add environment variables

Update `.env.example` and `.env.local` with:
```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
```

### Step 3: Create server actions for OAuth

Add to **`src/app/(auth)/actions.ts`**:
- `signInWithGoogle()` — `supabase.auth.signInWithOAuth({ provider: 'google' })`
- `signInWithDiscord()` — `supabase.auth.signInWithOAuth({ provider: 'discord' })`

Both redirect to the provider, then back to `/auth/callback`.

Reference: `grimdark.nathanhealea.com/src/app/(auth)/actions.ts` — `signInWithDiscord()`

### Step 4: Add OAuth buttons to auth pages

Update sign-in and sign-up pages to include:
- A divider ("or continue with")
- Google button with brand icon
- Discord button with brand icon

Use DaisyUI button styling with provider brand colors.

### Step 5: Ensure callback handles OAuth

The `/auth/callback` route created in the Email Auth Pages feature should already handle OAuth code exchange. Verify it works for Google and Discord redirects.

### Affected Files

| File | Changes |
|------|---------|
| `supabase/config.toml` | Enable Google and Discord OAuth providers |
| `.env.example` | Add OAuth client ID/secret vars |
| `src/app/(auth)/actions.ts` | Add `signInWithGoogle`, `signInWithDiscord` actions |
| `src/app/(auth)/sign-in/page.tsx` | Add OAuth buttons |
| `src/app/(auth)/sign-up/page.tsx` | Add OAuth buttons |

### Risks & Considerations

- Google and Discord OAuth require creating developer applications on each platform and configuring redirect URIs.
- For local development, Supabase local auth handles OAuth redirects via the local Supabase instance.
- The `handle_new_user()` trigger from the profiles migration should extract the display name from `raw_user_meta_data` for OAuth users.
