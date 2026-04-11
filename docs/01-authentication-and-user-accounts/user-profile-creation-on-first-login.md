# User Profile Creation on First Login

**Epic:** Authentication & User Accounts
**Type:** Feature
**Status:** Completed

## Summary

When a user signs up or logs in, a profile record is automatically created via database triggers. The profile is assigned a random display name in the format `ProfileDDDD` (e.g. `Painter#4821`) and a `has_setup_profile` flag set to `false`. The user is redirected to a profile setup page where they can choose their own display name. Submitting the form sets `has_setup_profile` to `true`, granting access to all authenticated routes.

## User Flow

```
Sign Up / Sign In
       │
       ▼
┌──────────────────────────────────┐
│  Database trigger fires          │
│  • on_auth_user_created (INSERT) │
│  • on_auth_user_login (UPDATE)   │
│                                  │
│  Creates profile row with:       │
│  • display_name = ProfileDDDD   │
│  • has_setup_profile = false     │
└──────────────┬───────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│  Middleware checks profile       │
│  SELECT has_setup_profile        │
│  FROM profiles WHERE id = user   │
└──────────────┬───────────────────┘
               │
       ┌───────┴───────┐
       │               │
  has_setup_profile  has_setup_profile
  = false            = true
       │               │
       ▼               ▼
┌─────────────┐  ┌────────────┐
│  Redirect   │  │  Allow     │
│  to         │  │  access to │
│  /profile/  │  │  requested │
│  setup      │  │  route     │
└──────┬──────┘  └────────────┘
       │
       ▼
┌──────────────────────────────────┐
│  Profile Setup Page              │
│                                  │
│  • Form pre-populated with       │
│    auto-generated ProfileDDDD   │
│  • User chooses a display name   │
│  • Validates: 2-50 chars,        │
│    [a-zA-Z0-9_-] only            │
│  • Checks uniqueness (case-      │
│    insensitive)                   │
└──────────────┬───────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│  setupProfile server action      │
│                                  │
│  UPDATE profiles SET             │
│    display_name = <user input>,  │
│    has_setup_profile = true      │
│  WHERE id = user.id              │
└──────────────┬───────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│  Redirect to /                   │
│  Middleware now sees              │
│  has_setup_profile = true        │
│  → full access granted           │
└──────────────────────────────────┘
```

## Acceptance Criteria

- [x] A profile record is automatically created when a new auth user is created (database trigger)
- [x] A profile record is created on login if missing (login trigger with backfill)
- [x] New profiles are assigned an auto-generated `ProfileDDDD` display name
- [x] New profiles have `has_setup_profile = false`
- [x] Users with `has_setup_profile = false` are redirected to `/profile/setup`
- [x] The setup form is pre-populated with the auto-generated display name
- [x] Submitting the setup form sets `has_setup_profile = true`
- [x] Returning users with `has_setup_profile = true` skip setup and go directly to the app
- [x] Display names are unique (case-insensitive)
- [x] The setup page updates the existing profile record (not insert)
- [x] `npm run build` and `npm run lint` pass with no errors

## Routes

| Route            | Description                                |
| ---------------- | ------------------------------------------ |
| `/profile/setup` | Profile setup form (display name required) |

## Key Files

| Action | File                                                           | Description                                    |
| ------ | -------------------------------------------------------------- | ---------------------------------------------- |
| Create | `src/app/profile/setup/page.tsx`                               | Setup page (card layout, renders ProfileForm)  |
| Create | `src/modules/profile/components/profile-form.tsx`              | Client component with display name form        |
| Create | `src/modules/profile/actions/setup-profile.ts`                 | `setupProfile` server action                   |
| Create | `src/modules/profile/types/profile-form-state.ts`              | `ProfileFormState` type                        |
| Create | `src/modules/profile/validation.ts`                            | Shared validation logic                        |
| Modify | `src/middleware.ts`                                            | Redirect users with `has_setup_profile = false` |
| Create | `supabase/migrations/20260410000000_create_profiles_table.sql` | Profiles table, RLS, triggers, backfill        |

## Database

### `profiles` Table

| Column              | Type          | Constraints                                      |
| ------------------- | ------------- | ------------------------------------------------ |
| `id`                | `uuid`        | PK, FK to `auth.users.id` on delete cascade      |
| `display_name`      | `text`        | Nullable, unique (case-insensitive partial index) |
| `bio`               | `text`        | Nullable                                          |
| `avatar_url`        | `text`        | Nullable                                          |
| `has_setup_profile` | `boolean`     | Not null, default `false`                         |
| `created_at`        | `timestamptz` | Not null, default `now()`                         |
| `updated_at`        | `timestamptz` | Not null, default `now()`                         |

A profile is considered "complete" when `has_setup_profile = true`.

### Database Functions

| Function                  | Purpose                                                  |
| ------------------------- | -------------------------------------------------------- |
| `generate_profile_name()` | Returns a unique `ProfileDDDD` string (retries on collision) |
| `handle_new_user()`       | Creates a profile with auto-generated name on user signup |
| `handle_user_login()`     | Creates or backfills a profile on user login             |

### Triggers

| Trigger                | Fires on                              | Function             |
| ---------------------- | ------------------------------------- | -------------------- |
| `on_auth_user_created` | `AFTER INSERT` on `auth.users`        | `handle_new_user()`  |
| `on_auth_user_login`   | `AFTER UPDATE OF last_sign_in_at` on `auth.users` | `handle_user_login()` |

### Row Level Security

- **SELECT**: All authenticated users can read all profiles
- **INSERT**: Service role only (triggers handle creation via `SECURITY DEFINER`)
- **UPDATE**: Users can update their own profile (`auth.uid() = id`)

## Notes

- Display names are unique (case-insensitive) — "Ragnar" and "ragnar" are treated as the same name.
- Display names cannot contain spaces — only letters, numbers, hyphens, and underscores.
- Auto-generated `ProfileDDDD` names match the form validation pattern (`[a-zA-Z0-9_-]+`), so users can keep them or choose their own.
- The profile setup flow is enforced at the middleware level, so no authenticated route can be accessed until `has_setup_profile` is `true`.
- The auto-create trigger means profile rows always exist for authenticated users — the setup page updates rather than inserts.
- The partial unique index on `display_name` allows multiple NULL values (incomplete profiles) without violating uniqueness.
- The login trigger uses `ON CONFLICT ... DO UPDATE` to backfill a display name for profiles that exist but have `display_name IS NULL`.
