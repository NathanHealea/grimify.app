# OAuth Users Not Redirected to Profile Setup After First Login

**Epic:** Authentication & User Accounts
**Type:** Bug
**Status:** Todo
**Branch:** `bug/oauth-profile-setup-redirect`
**Merge into:** `v1/main`

## Summary

After signing in with Google or Discord for the first time, users are redirected to `/` (a public route) instead of `/profile/setup`. The middleware profile-setup enforcement only runs on protected routes — public routes (`/`, `/brands`, `/paints`, `/hues`) skip all checks, so first-time OAuth users can browse the app indefinitely with an auto-generated "Profile####" display name and `has_setup_profile = false`.

Additionally, the `handle_new_user()` DB trigger ignores OAuth metadata when generating the initial display name. Even though the `/profile/setup` page reads OAuth metadata for suggestions, the user never reaches that page, and the navbar shows the generic name.

## Expected Behavior

1. After first OAuth login, the user is redirected to `/profile/setup` regardless of whether the landing route is public or protected.
2. The profile setup form pre-populates with the user's OAuth display name (already implemented on the setup page).
3. The initial `display_name` set by the DB trigger uses the OAuth provider's name when available, so even before setup completion the navbar shows a meaningful name.

## Actual Behavior

1. After OAuth login, `auth/callback` redirects to `/`. Middleware sees a public route and skips profile-setup enforcement. User is never prompted.
2. The `handle_new_user()` trigger always generates `ProfileDDDD` — OAuth metadata is ignored.
3. User sees "Profile4287" (or similar) in the navbar indefinitely.

## Root Cause

**Middleware** (`src/middleware.ts:48-54`): Public routes return early before the authenticated-user profile check:

```ts
if (
  PUBLIC_ROUTES.some((route) => pathname.startsWith(route)) ||
  PUBLIC_EXACT_ROUTES.some((route) => pathname === route)
) {
  return supabaseResponse  // ← skips profile setup check for authenticated users
}
```

**DB trigger** (`supabase/migrations/20260410000000_create_profiles_table.sql:75-76`): `handle_new_user()` never reads `NEW.raw_user_meta_data`:

```sql
INSERT INTO public.profiles (id, display_name, has_setup_profile)
VALUES (NEW.id, public.generate_profile_name(), false);
```

## Acceptance Criteria

- [ ] Authenticated users with `has_setup_profile = false` are redirected to `/profile/setup` on ANY route (public or protected), except auth flow routes
- [ ] Auth flow routes (`/sign-in`, `/sign-up`, `/auth/callback`, `/auth/confirm`, `/forgot-password`, `/reset-password`) remain fully exempt from profile-setup checks
- [ ] Unauthenticated users can still access public routes without being redirected to profile setup
- [ ] The `handle_new_user()` trigger uses the OAuth provider's name (from `raw_user_meta_data`) as `display_name` when available, falling back to `generate_profile_name()` on conflict or absence
- [ ] Existing profiles are not affected by the trigger change (migration is additive)
- [ ] `npm run build` and `npm run lint` pass with no errors

## Key Files

| Action | File                                                              | Description                                                  |
| ------ | ----------------------------------------------------------------- | ------------------------------------------------------------ |
| Modify | `src/middleware.ts`                                               | Restructure to check profile setup for authenticated users on public routes |
| Create | `supabase/migrations/20260416000000_fix_profile_display_name.sql` | Update `handle_new_user()` to read OAuth metadata            |

## Implementation

### Step 1: Restructure middleware to enforce profile setup on public routes

Modify `src/middleware.ts` to separate auth-flow routes (fully exempt) from public-browse routes (allow unauthenticated, but enforce profile setup for authenticated users).

**Current route categories:**

```ts
const PUBLIC_ROUTES = ['/sign-in', '/sign-up', '/auth/callback', '/auth/confirm',
                       '/forgot-password', '/reset-password', '/brands', '/paints', '/hues']
const PUBLIC_EXACT_ROUTES = ['/']
```

**New route categories:**

```ts
/** Routes that bypass ALL middleware checks (auth flow pages). */
const AUTH_ROUTES = ['/sign-in', '/sign-up', '/auth/callback', '/auth/confirm',
                     '/forgot-password', '/reset-password']

/** Route prefixes accessible without authentication but subject to profile-setup checks for authenticated users. */
const PUBLIC_ROUTES = ['/brands', '/paints', '/hues']

/** Exact routes accessible without authentication but subject to profile-setup checks for authenticated users. */
const PUBLIC_EXACT_ROUTES = ['/']

/** Route prefixes that require the `admin` role. */
const ADMIN_ROUTES = ['/admin']
```

**New middleware flow:**

1. **Auth routes** → return immediately (no checks at all).
2. **Get user** via `supabase.auth.getUser()`.
3. **No user + public route** → allow (unauthenticated browsing).
4. **No user + protected route** → redirect to `/sign-in?next={pathname}`.
5. **User exists** → check `has_setup_profile`:
   - If `false` and not on `/profile/setup` → redirect to `/profile/setup`.
   - If `true` and on `/profile/setup` → redirect to `/`.
6. **Admin route** → check roles via `get_user_roles` RPC.
7. Return response.

Key changes from the current implementation:
- `getUser()` now runs for public routes too (only when not an auth route). This is a minor cost but necessary — the session cookie refresh in the Supabase client setup already runs for all routes.
- Profile query (`has_setup_profile`) only runs when the user is authenticated, not for anonymous visitors.
- The profile setup redirect now applies universally for authenticated users, not just on protected routes.

Commit: `fix(auth): enforce profile setup redirect on public routes`

### Step 2: Update `handle_new_user()` trigger to use OAuth display name

Create `supabase/migrations/20260416000000_fix_profile_display_name.sql`:

Replace the `handle_new_user()` function to extract a display name from `raw_user_meta_data` when available:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  oauth_name text;
  chosen_name text;
BEGIN
  -- Try to extract a display name from OAuth provider metadata
  oauth_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'custom_username'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'preferred_username'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'user_name'), '')
  );

  -- Use the OAuth name if available and not already taken
  IF oauth_name IS NOT NULL THEN
    BEGIN
      INSERT INTO public.profiles (id, display_name, has_setup_profile)
      VALUES (NEW.id, oauth_name, false);
      RETURN NEW;
    EXCEPTION WHEN unique_violation THEN
      -- Name already taken — fall through to generated name
      NULL;
    END;
  END IF;

  -- Fallback: auto-generated name
  chosen_name := public.generate_profile_name();
  INSERT INTO public.profiles (id, display_name, has_setup_profile)
  VALUES (NEW.id, chosen_name, false);

  RETURN NEW;
END;
$$;
```

Key points:
- Reads the same metadata fields that `/profile/setup` checks, in the same priority order.
- Uses `NULLIF(TRIM(...), '')` to skip empty strings.
- Handles unique constraint violations gracefully — if the OAuth name is taken, falls back to `ProfileDDDD`.
- `has_setup_profile` remains `false` — the user is still prompted to confirm/change their name on the setup page.
- The `SECURITY DEFINER` and `SET search_path = ''` attributes are preserved.
- This is a `CREATE OR REPLACE`, so it safely updates the existing function without dropping triggers.

Commit: `fix(auth): use OAuth display name in profile trigger`

### Step 3: Build and verify

1. Run `npm run build` and `npm run lint` to confirm no regressions.
2. Test scenarios:
   - **New OAuth user**: Sign in with Google → should be redirected to `/profile/setup`, form pre-populated with Google name.
   - **Unauthenticated user**: Visit `/`, `/paints`, `/brands` → should work normally, no redirects.
   - **Existing user with completed profile**: Visit any route → no profile setup redirect.
   - **Existing user with incomplete profile**: Visit `/` → redirected to `/profile/setup`.
   - **Auth flow routes**: Visit `/sign-in`, `/sign-up` → no profile setup redirect even if authenticated with incomplete profile.

### Risks & Considerations

- **Performance**: `getUser()` now runs on public routes for authenticated users. The Supabase middleware client already refreshes the session on every request, so the auth call is largely cached. The profile query (`has_setup_profile`) only fires for authenticated users, not anonymous visitors.
- **Existing users**: Any users who signed up via OAuth and never completed profile setup will now be redirected to `/profile/setup` on their next visit. This is the desired behavior.
- **Migration safety**: The `CREATE OR REPLACE FUNCTION` approach updates the trigger function in place. No data is modified; the change only affects future user signups.
