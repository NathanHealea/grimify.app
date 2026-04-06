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

Update **`supabase/config.toml`** to enable Google and Discord providers:

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

For hosted Supabase, configure providers in the Supabase dashboard under Authentication > Providers.

### Step 2: Add environment variables

Update **`.env.example`**:

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
```

These are server-only variables (no `NEXT_PUBLIC_` prefix) — OAuth client secrets must never be exposed to the browser. The actual OAuth flow is handled server-side by Supabase.

### Step 3: Add OAuth server actions

Add to **`src/app/(auth)/actions.ts`** (alongside existing signUp/signIn/signOut):

```typescript
export async function signInWithGoogle() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${getSiteUrl()}/auth/callback`,
    },
  })

  if (error || !data.url) {
    redirect('/sign-in?error=Could not connect to Google. Please try again.')
  }

  redirect(data.url)
}

export async function signInWithDiscord() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: {
      redirectTo: `${getSiteUrl()}/auth/callback`,
    },
  })

  if (error || !data.url) {
    redirect('/sign-in?error=Could not connect to Discord. Please try again.')
  }

  redirect(data.url)
}
```

Each action initiates the OAuth flow by getting a redirect URL from Supabase, then redirecting the browser to the provider's consent screen. After the user authorizes, Supabase redirects back to `/auth/callback` which exchanges the code for a session.

### Step 4: Add OAuth buttons to auth pages

Update **`src/app/(auth)/sign-in/page.tsx`** and **`src/app/(auth)/sign-up/page.tsx`** to include OAuth buttons below the email/password form:

```tsx
<div className="divider">OR</div>

<form action={signInWithGoogle}>
  <button type="submit" className="btn btn-outline w-full">
    {/* Google SVG icon */}
    Continue with Google
  </button>
</form>

<form action={signInWithDiscord}>
  <button type="submit" className="btn btn-outline w-full">
    {/* Discord SVG icon */}
    Continue with Discord
  </button>
</form>
```

Each OAuth button is wrapped in its own `<form>` with the server action, so clicking submits directly to the action without JavaScript. Use inline SVG icons for Google and Discord branding (no additional icon library needed).

Reference: `grimdark.nathanhealea.com/src/app/(auth)/sign-in/page.tsx` for exact SVG icons and DaisyUI button styling.

### Step 5: Verify callback route handles OAuth

The `/auth/callback` route created in the Email Auth Pages feature already handles OAuth code exchange via `supabase.auth.exchangeCodeForSession(code)`. No changes needed — the same flow works for both email confirmation and OAuth callbacks.

### Affected Files

| File | Changes |
|------|---------|
| `supabase/config.toml` | Enable Google and Discord OAuth providers |
| `.env.example` | Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` |
| `src/app/(auth)/actions.ts` | Add `signInWithGoogle`, `signInWithDiscord` server actions |
| `src/app/(auth)/sign-in/page.tsx` | Add OAuth buttons below email form |
| `src/app/(auth)/sign-up/page.tsx` | Add OAuth buttons below email form |

### Dependencies

- [Supabase Setup](./supabase-setup.md) — Supabase client and middleware
- [Email Auth Pages](./email-auth-pages.md) — auth route group, `actions.ts` file, `/auth/callback` route

### Risks & Considerations

- Google and Discord OAuth require creating developer applications on each platform and configuring redirect URIs. For production, the redirect URI must point to the hosted Supabase project (not localhost).
- For local development with `supabase start`, OAuth redirects go through the local Supabase instance at `localhost:54321`.
- The `handle_new_user()` trigger from the User Profiles migration should extract the display name from `raw_user_meta_data` for OAuth users (e.g., `raw_user_meta_data->>'full_name'` for Google, `raw_user_meta_data->>'custom_claims'->'global_name'` for Discord).
- OAuth buttons use `<form action={serverAction}>` which works without JavaScript — the server action receives the form submission and redirects the browser. This is the same pattern used in the grimdark reference project.
