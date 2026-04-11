# User Roles

**Epic:** Authentication & User Accounts
**Type:** Feature
**Status:** Todo

## Summary

Assign roles to user accounts to control access levels across the application. Users can hold **multiple roles** simultaneously. Two roles exist at launch:

- **user** — default role assigned to every account on sign-up. Grants basic access (browse paints, search, view color wheel).
- **admin** — promoted role for app administrators. Grants full management capabilities (role assignment, content moderation, paint data management).

Admins can grant or revoke the `admin` role through an admin interface. The `user` role is always present and cannot be removed.

## Acceptance Criteria

- [ ] A `roles` table exists with seeded `user` and `admin` entries
- [ ] A `user_roles` table links users to roles (many-to-many)
- [ ] New users are automatically assigned the `user` role upon profile creation
- [ ] The `user` role cannot be removed from any account
- [ ] At least one admin is seeded or manually assigned in the database
- [ ] Admins can grant or revoke the `admin` role via an admin interface
- [ ] RLS policies on `user_roles` prevent non-admin users from modifying role assignments
- [ ] A helper function or utility exists to check a user's roles on the server
- [ ] Role information is available in middleware for route-level access control
- [ ] `npm run build` and `npm run lint` pass with no errors

## Database

### `roles` Table

| Column | Type     | Constraints      |
| ------ | -------- | ---------------- |
| `id`   | `serial` | Primary key      |
| `name` | `text`   | Unique, not null |

Seeded with two rows: `user`, `admin`.

### `user_roles` Table

| Column        | Type          | Constraints                                                 |
| ------------- | ------------- | ----------------------------------------------------------- |
| `user_id`     | `uuid`        | FK to `profiles.id` on delete cascade, part of composite PK |
| `role_id`     | `int`         | FK to `roles.id`, part of composite PK                      |
| `assigned_at` | `timestamptz` | Not null, default `now()`                                   |

Composite primary key on `(user_id, role_id)`.

### Row Level Security

**`roles` table:**

- **SELECT**: All authenticated users can read roles
- **INSERT / UPDATE / DELETE**: No user-facing mutations — managed via migrations/seed only

**`user_roles` table:**

- **SELECT**: Authenticated users can read all role assignments
- **INSERT**: Only users with the `admin` role can assign roles
- **UPDATE**: Only admins can change role assignments
- **DELETE**: Only admins can remove role assignments (except the `user` role, which cannot be deleted)
- Users cannot modify their own role assignment regardless of their role

## Key Files

| Action | File                                                    | Description                                         |
| ------ | ------------------------------------------------------- | --------------------------------------------------- |
| Create | `supabase/migrations/20260412000000_create_roles.sql`   | Migration for tables, RLS, helper function, trigger |
| Create | `src/modules/user/types/role.ts`                        | `Role` type definition                              |
| Create | `src/modules/user/utils/roles.ts`                       | Server-side `getUserRoles` and `hasRole` utilities  |
| Move   | `src/modules/profile/` → `src/modules/user/`            | Consolidate profile code into user module           |
| Move   | `src/modules/auth/components/user-menu.tsx` → `src/modules/user/components/` | User display belongs in user module |
| Modify | `src/middleware.ts`                                     | Add admin route protection                          |

## Implementation

### Step 0: Refactor — Create `user` module and consolidate user-related code

The existing `src/modules/profile/` module and the `user-menu.tsx` component in `auth/` both deal with the user entity rather than authentication flows. Consolidate them into a single `src/modules/user/` module before adding roles code.

**Rationale for module boundaries:**
- **`auth/`** stays focused on identity verification: sign-in, sign-up, sign-out, OAuth flows, auth state types, `get-site-url` utility. These are about _getting authenticated_.
- **`user/`** owns the user entity: profile setup, profile display, roles, validation. These are about _who the user is_ after authentication.
- **`community/`** (future) will handle social features when that epic begins. No code exists yet.

**Move operations:**

| Source | Destination |
|--------|------------|
| `src/modules/profile/actions/setup-profile.ts` | `src/modules/user/actions/setup-profile.ts` |
| `src/modules/profile/components/profile-form.tsx` | `src/modules/user/components/profile-form.tsx` |
| `src/modules/profile/types/profile-form-state.ts` | `src/modules/user/types/profile-form-state.ts` |
| `src/modules/profile/types/profile-form-values.ts` | `src/modules/user/types/profile-form-values.ts` |
| `src/modules/profile/validation.ts` | `src/modules/user/validation.ts` |
| `src/modules/auth/components/user-menu.tsx` | `src/modules/user/components/user-menu.tsx` |

**Import updates required:**

| File | Old import path | New import path |
|------|----------------|-----------------|
| `src/components/navbar.tsx` | `@/modules/auth/components/user-menu` | `@/modules/user/components/user-menu` |
| `src/app/profile/setup/page.tsx` | `@/modules/profile/components/profile-form` | `@/modules/user/components/profile-form` |
| `src/modules/user/actions/setup-profile.ts` | `@/modules/profile/types/profile-form-state` | `@/modules/user/types/profile-form-state` |
| `src/modules/user/actions/setup-profile.ts` | `@/modules/profile/validation` | `@/modules/user/validation` |
| `src/modules/user/components/profile-form.tsx` | `@/modules/profile/actions/setup-profile` | `@/modules/user/actions/setup-profile` |
| `src/modules/user/components/profile-form.tsx` | `@/modules/profile/types/profile-form-state` | `@/modules/user/types/profile-form-state` |
| `src/modules/user/components/profile-form.tsx` | `@/modules/profile/types/profile-form-values` | `@/modules/user/types/profile-form-values` |
| `src/modules/user/components/profile-form.tsx` | `@/modules/profile/validation` | `@/modules/user/validation` |

After moves and import updates, delete `src/modules/profile/` entirely.

**Resulting structure:**
```
src/modules/auth/              # Authentication flows only
├── actions/
│   ├── sign-in.ts
│   ├── sign-up.ts
│   ├── sign-out.ts
│   ├── sign-in-with-google.ts
│   └── sign-in-with-discord.ts
├── components/
│   ├── sign-in-form.tsx
│   ├── sign-up-form.tsx
│   └── oauth-buttons.tsx
├── types/
│   └── auth-state.ts
└── utils/
    └── get-site-url.ts

src/modules/user/              # User entity: profile, display, roles
├── actions/
│   └── setup-profile.ts
├── components/
│   ├── profile-form.tsx
│   └── user-menu.tsx
├── types/
│   ├── profile-form-state.ts
│   ├── profile-form-values.ts
│   └── role.ts               # (new — Step 2)
├── utils/
│   └── roles.ts              # (new — Step 3)
└── validation.ts
```

Commit: `refactor(user): consolidate profile and user-menu into user module`

### Step 1: Database migration

Create `supabase/migrations/20260412000000_create_roles.sql`:

1. **Create `roles` table** with `id` (serial PK) and `name` (text, unique, not null). Seed `user` and `admin` rows.
2. **Create `user_roles` table** with `user_id` (uuid FK → `profiles.id` on delete cascade), `role_id` (int FK → `roles.id`), `assigned_at` (timestamptz, default `now()`). Composite PK on `(user_id, role_id)`.
3. **Enable RLS** on both tables:
   - `roles`: SELECT for authenticated, no user-facing mutations
   - `user_roles`: SELECT for authenticated; INSERT/UPDATE/DELETE restricted to admins via `get_user_roles(auth.uid())` check, with self-modification prevention (`auth.uid() != user_id`)
4. **Create `public.get_user_roles(user_uuid uuid)`** — SQL function returning `text[]` of role names for a given user. Used by RLS policies and application code.
5. **Create trigger** on `profiles` AFTER INSERT that auto-inserts `(NEW.id, <user_role_id>)` into `user_roles`.
6. **Backfill** existing profiles — insert the `user` role for all profiles that don't already have it.
7. **Create delete-prevention trigger** on `user_roles` BEFORE DELETE that raises an exception if the role being removed is `user`.

Commit: `feat(user): add roles and user_roles tables with RLS`

### Step 2: TypeScript types

Create `src/modules/user/types/role.ts`:

```ts
/** Valid role names in the system. */
type Role = 'user' | 'admin'
```

Export the type for use in utilities and middleware.

Commit: include with Step 3.

### Step 3: Server-side role utilities

Create `src/modules/user/utils/roles.ts`:

```ts
/**
 * Fetches all roles assigned to a user.
 * @param userId - The user's UUID
 * @returns Array of role name strings
 */
async function getUserRoles(userId: string): Promise<Role[]>

/**
 * Checks whether a user holds a specific role.
 * @param userId - The user's UUID
 * @param role - The role to check for
 * @returns true if the user has the role
 */
async function hasRole(userId: string, role: Role): Promise<boolean>
```

Both functions use the Supabase server client to query `user_roles` joined with `roles`. Results are not cached — each call hits the database to ensure freshness.

Commit: `feat(user): add role type and server-side role utilities`

### Step 4: Middleware integration

Update `src/middleware.ts`:

1. Add `/admin` prefix to a new `ADMIN_ROUTES` array.
2. After the existing profile-setup check, if the user's path starts with an admin route, query roles via `get_user_roles` RPC (or a direct join query) and redirect non-admins to `/` (or a 403 page).
3. Keep the middleware query efficient — only fetch roles when the path requires it (admin routes), not on every request.

Commit: `feat(user): add admin route protection to middleware`

### Step 5: Build and verify

Run `npm run build` and `npm run lint` to confirm no regressions. Regenerate Supabase types if the project uses `supabase gen types`.

### Step 6: Seed the first admin

The first admin is assigned manually after the migration:

```sql
INSERT INTO user_roles (user_id, role_id)
SELECT p.id, r.id
FROM profiles p, roles r
WHERE p.display_name = '<your-display-name>' AND r.name = 'admin';
```

This is documented but not automated — no admin UI exists yet. The acceptance criterion "Admins can grant or revoke the admin role via an admin interface" will require a follow-up feature for admin pages (out of scope for this doc unless added to the criteria).

## Key Design Decisions

1. **Two-tier role system** — `user` is a permanent baseline, `admin` is promotional. Can be extended with additional roles (e.g., `moderator`) later by inserting into the `roles` table.
2. **Multi-role support (many-to-many)** — Users can hold multiple roles simultaneously. Permission checks are explicit.
3. **Database trigger for auto-assignment** — Guarantees every profile has the `user` role regardless of creation path.
4. **Self-modification prevention** — Write policies include `auth.uid() != user_id` to prevent privilege escalation.
5. **Server-only role enforcement** — All role checks happen server-side (middleware, server actions, RLS).
6. **Module consolidation** — Merging `profile/` into `user/` creates a single owner for all user-entity code. Auth stays separate because it's about identity verification, not user data. Social/community features will get their own module when that epic is implemented.
