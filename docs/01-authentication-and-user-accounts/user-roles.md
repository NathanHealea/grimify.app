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

| Action | File                                                 | Description                                         |
| ------ | ---------------------------------------------------- | --------------------------------------------------- |
| Create | `supabase/migrations/XXXXXX_create_roles_tables.sql` | Migration for tables, RLS, helper function, trigger |
| Create | `src/types/role.ts`                                  | `Role` type definition                              |
| Create | `src/lib/supabase/roles.ts`                          | Server-side `getUserRoles` and `hasRole` utilities  |
| Modify | `src/middleware.ts`                                  | Updated with admin route protection                 |

## Implementation

### 1. Database migration

Create a migration that:

1. Creates the `roles` table and seeds `user` and `admin` rows.
2. Creates the `user_roles` table with foreign keys.
3. Enables RLS on both tables with policies as described above.
4. Creates a helper SQL function `public.get_user_roles(user_uuid uuid)` that returns an array of role names.

### 2. Auto-assign default `user` role

A PostgreSQL trigger on `profiles` insert automatically assigns the `user` role. This guarantees consistency regardless of how the profile is created.

### 3. Server-side role check utility

Add a utility in `src/lib/supabase/roles.ts`:

```ts
type Role = 'user' | 'admin'

async function getUserRoles(userId: string): Promise<Role[]>
async function hasRole(userId: string, role: Role): Promise<boolean>
```

### 4. Middleware integration

Extend `src/middleware.ts` to query the user's roles for route-level checks. Admin routes (`/admin/*`) redirect users who lack the `admin` role.

### 5. Seeding the first admin

The first admin must be assigned manually via SQL or Supabase Studio after creating an account through the normal sign-up flow.

## Key Design Decisions

1. **Two-tier role system** — `user` is a permanent baseline, `admin` is promotional. Can be extended with additional roles (e.g., `moderator`) later by inserting into the `roles` table.
2. **Multi-role support (many-to-many)** — Users can hold multiple roles simultaneously. Permission checks are explicit.
3. **Database trigger for auto-assignment** — Guarantees every profile has the `user` role regardless of creation path.
4. **Self-modification prevention** — Write policies include `auth.uid() != user_id` to prevent privilege escalation.
5. **Server-only role enforcement** — All role checks happen server-side (middleware, server actions, RLS).
