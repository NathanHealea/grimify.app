# User Profile Creation on First Login

**Epic:** Authentication & User Accounts
**Type:** Feature
**Status:** Todo

## Summary

Automatically prompt new users to create their profile after their first successful login.

## Acceptance Criteria

- [ ] After first login, user is redirected to a profile setup flow
- [ ] User must provide required profile fields before accessing authenticated features
- [ ] Profile record is created in the database linked to the Supabase auth user
- [ ] Returning users skip the setup flow and go directly to the app
- [ ] Display names are unique (case-insensitive)
- [ ] `npm run build` and `npm run lint` pass with no errors

## Routes

| Route | Description |
|---|---|
| `/profile/setup` | Profile setup form (display name required) |

## Key Files

| Action | File | Description |
|---|---|---|
| Create | `src/app/profile/setup/page.tsx` | Setup page (renders ProfileForm component) |
| Create | `src/app/profile/setup/profile-form.tsx` | Client component with display name form |
| Create | `src/app/profile/setup/actions.ts` | `setupProfile` server action |
| Create | `src/modules/profile/validation.ts` | Shared validation logic and `ProfileFormState` type |
| Modify | `src/middleware.ts` | Redirect authenticated users without a profile to `/profile/setup` |
| Create | `supabase/migrations/XXXXXX_create_profiles_table.sql` | Creates profiles table with RLS policies |

## Database

### `profiles` Table

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, FK to `auth.users.id` on delete cascade |
| `display_name` | `text` | Not null, unique (case-insensitive index) |
| `bio` | `text` | Nullable |
| `avatar_url` | `text` | Nullable |
| `created_at` | `timestamptz` | Not null, default `now()` |
| `updated_at` | `timestamptz` | Not null, default `now()` |

### Row Level Security

- **SELECT**: All authenticated users can read all profiles
- **INSERT**: Authenticated users can insert their own profile (`auth.uid() = id`)
- **UPDATE**: Users can update their own profile (`auth.uid() = id`)

## Implementation

### 1. Profiles table migration

Create a migration that:

1. Creates the `profiles` table with the schema above.
2. Adds a case-insensitive unique index on `display_name`.
3. Enables RLS with the policies described above.

### 2. Middleware redirect

After refreshing the auth session, middleware checks if the authenticated user has a profile. If not, redirects to `/profile/setup`. If they already have a profile and visit `/profile/setup`, redirects to `/`. Public routes (`/sign-in`, `/sign-up`, `/auth/callback`) skip this check.

### 3. Profile form

Client component using `useActionState` with the `setupProfile` server action. Runs client-side validation from shared `validateDisplayName` before submitting. Displays field-level errors below the input.

### 4. Server action

Validates display name (required, 2-50 chars, alphanumeric/hyphens/underscores only), checks for existing display name (case-insensitive via `ilike`), inserts profile, and redirects to `/`. Handles duplicate constraint violation (`23505`) as a fallback for race conditions.

## Notes

- Display names are unique (case-insensitive) — "Ragnar" and "ragnar" are treated as the same name.
- Display names cannot contain spaces — only letters, numbers, hyphens, and underscores.
- The profile setup flow is enforced at the middleware level, so no authenticated route can be accessed without a profile.
