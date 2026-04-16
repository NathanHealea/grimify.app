# User Roles

**Epic:** Authentication & User Accounts
**Type:** Feature
**Status:** In Progress

## Summary

Assign roles to user accounts to control access levels across the application. Users can hold **multiple roles** simultaneously. Two roles exist at launch:

- **user** — default role assigned to every account on sign-up. Grants basic access (browse paints, search, view color wheel).
- **admin** — promoted role for app administrators. Grants full management capabilities (role assignment, content moderation, paint data management).

Admins can grant or revoke the `admin` role through an admin interface. The `user` role is always present and cannot be removed.

## Acceptance Criteria

- [x] A `roles` table exists with seeded `user` and `admin` entries
- [x] A `user_roles` table links users to roles (many-to-many)
- [x] New users are automatically assigned the `user` role upon profile creation
- [x] The `user` role cannot be removed from any account
- [ ] At least one admin is seeded or manually assigned in the database
- [ ] Admins can grant or revoke the `admin` role via an admin interface
- [x] RLS policies on `user_roles` prevent non-admin users from modifying role assignments
- [x] A helper function or utility exists to check a user's roles on the server
- [x] Role information is available in middleware for route-level access control
- [x] `npm run build` and `npm run lint` pass with no errors

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

| Action | File                                                                         | Description                                         | Status |
| ------ | ---------------------------------------------------------------------------- | --------------------------------------------------- | ------ |
| Create | `supabase/migrations/20260412000000_create_roles.sql`                        | Migration for tables, RLS, helper function, trigger | Done   |
| Create | `src/modules/user/types/role.ts`                                             | `Role` type definition                              | Done   |
| Create | `src/modules/user/utils/roles.ts`                                            | Server-side `getUserRoles` and `hasRole` utilities  | Done   |
| Move   | `src/modules/profile/` → `src/modules/user/`                                 | Consolidate profile code into user module           | Done   |
| Move   | `src/modules/auth/components/user-menu.tsx` → `src/modules/user/components/` | User display belongs in user module                 | Done   |
| Modify | `src/middleware.ts`                                                           | Add admin route protection                          | Done   |
| Create | `src/app/admin/page.tsx`                                                     | Admin landing — redirect to `/admin/users`          | Todo   |
| Create | `src/app/admin/users/page.tsx`                                               | User management page with role controls             | Todo   |
| Create | `src/modules/user/types/user-with-roles.ts`                                  | Type for profile joined with role names             | Todo   |
| Create | `src/modules/user/actions/toggle-admin-role.ts`                              | Server action — grant or revoke `admin` role        | Todo   |
| Create | `src/modules/user/components/admin-users-table.tsx`                          | Client component — user table with role toggles     | Todo   |

## Implementation

### Completed Steps

The following steps have already been implemented and committed:

- **Step 0: Module consolidation** — `src/modules/profile/` merged into `src/modules/user/`; `user-menu.tsx` moved from `auth/components/` to `user/components/`; all imports updated; `src/modules/profile/` deleted.
- **Step 1: Database migration** — `supabase/migrations/20260412000000_create_roles.sql` creates `roles` and `user_roles` tables with RLS, the `get_user_roles()` SQL function, auto-assignment trigger on profile creation, backfill for existing profiles, and a delete-prevention trigger for the `user` role.
- **Step 2: TypeScript types** — `src/modules/user/types/role.ts` exports `type Role = 'user' | 'admin'`.
- **Step 3: Server-side utilities** — `src/modules/user/utils/roles.ts` exports `getUserRoles()` and `hasRole()`, querying `user_roles` joined with `roles` via the Supabase server client.
- **Step 4: Middleware integration** — `src/middleware.ts` defines an `ADMIN_ROUTES` array (`['/admin']`), fetches roles via `get_user_roles` RPC only for admin route requests, and redirects non-admins to `/`.

### Step 5: Seed the first admin

The first admin must be assigned manually since no admin interface exists yet. Run the following SQL against the local Supabase database (via `npx supabase db execute` or the SQL editor):

```sql
INSERT INTO user_roles (user_id, role_id)
SELECT p.id, r.id
FROM profiles p, roles r
WHERE p.display_name = '<your-display-name>' AND r.name = 'admin';
```

Replace `<your-display-name>` with the target user's display name. This is a prerequisite for testing the admin interface in subsequent steps.

Commit: none (manual database operation)

### Step 6: Admin interface — user management

Build the admin UI for granting and revoking the `admin` role. The middleware already protects `/admin` routes — only users with the `admin` role can access them.

#### 6a. Create `src/modules/user/types/user-with-roles.ts`

Define a type representing a profile row joined with its role names:

```ts
import type { Role } from '@/modules/user/types/role'

/** A user profile with their assigned role names. */
export type UserWithRoles = {
  id: string
  display_name: string | null
  avatar_url: string | null
  roles: Role[]
}
```

#### 6b. Create `src/modules/user/actions/toggle-admin-role.ts`

Server action that grants or revokes the `admin` role for a target user:

```ts
'use server'

/**
 * Grants or revokes the admin role for the specified user.
 *
 * RLS enforces that only admins can call this and self-modification is blocked.
 * Revalidates `/admin/users` on success.
 *
 * @param userId - UUID of the target user.
 * @param action - Whether to 'grant' or 'revoke' the admin role.
 * @returns Object with optional error message.
 */
export async function toggleAdminRole(
  userId: string,
  action: 'grant' | 'revoke'
): Promise<{ error?: string }>
```

Implementation details:
1. Create a Supabase server client.
2. Look up the `admin` role ID: `select('id').eq('name', 'admin').single()` from `roles`.
3. If `action === 'grant'`: insert `(userId, adminRoleId)` into `user_roles`. Handle unique constraint violations gracefully (user already has role).
4. If `action === 'revoke'`: delete from `user_roles` where `user_id = userId` and `role_id = adminRoleId`.
5. RLS enforces authorization — the policies on `user_roles` require `'admin' = ANY(get_user_roles(auth.uid()))` and `auth.uid() != user_id`. No additional checks needed in application code.
6. Call `revalidatePath('/admin/users')` on success.
7. Return `{ error: errorMessage }` on failure, or `{}` on success.

#### 6c. Create `src/modules/user/components/admin-users-table.tsx`

Client component that renders all users with their roles and provides role management controls.

**Props:**
- `users: UserWithRoles[]` — all user profiles with their role names
- `currentUserId: string` — the authenticated admin's UUID (for disabling self-modification)

**Behavior:**
- Renders a table with columns: Avatar, Display Name, Roles, Actions.
- **Roles column**: Render a badge for each role the user holds (e.g., `user`, `admin`). Use the project's existing daisyUI-style badge classes.
- **Actions column**: For each user that is _not_ the current admin:
  - If the user has the `admin` role → render a "Revoke Admin" button (destructive style, e.g., `btn btn-error btn-sm btn-outline`).
  - If the user does not have the `admin` role → render a "Grant Admin" button (e.g., `btn btn-primary btn-sm btn-outline`).
- **Current user's row**: Show roles but render no action button (or a disabled state with a tooltip explaining self-modification is not allowed).
- Use `useTransition` for pending state on role toggles — disable the button and show a loading indicator while the server action executes.
- Call `toggleAdminRole(userId, 'grant' | 'revoke')` on button click.
- Display returned errors in a toast or inline message.

#### 6d. Create `src/app/admin/page.tsx`

Minimal admin landing page that redirects to the users management page:

```ts
import { redirect } from 'next/navigation'

export default function AdminPage() {
  redirect('/admin/users')
}
```

This keeps the URL clean and allows adding more admin sub-pages later without changing the entry point.

#### 6e. Create `src/app/admin/users/page.tsx`

Server component that fetches all users with their roles and renders the management UI.

Implementation:
1. Create a Supabase server client.
2. Get the authenticated user's ID via `supabase.auth.getUser()` (middleware guarantees they are an admin).
3. Fetch all profiles with their roles in a single query using Supabase's nested select:
   ```ts
   const { data } = await supabase
     .from('profiles')
     .select('id, display_name, avatar_url, user_roles(roles(name))')
     .order('display_name')
   ```
4. Map the response into `UserWithRoles[]`, extracting role names from the nested join.
5. Render page layout:
   ```tsx
   <div className="mx-auto w-full max-w-4xl px-4 py-12">
     <div className="mb-8">
       <h1 className="text-3xl font-bold">User Management</h1>
       <p className="text-sm text-muted-foreground">
         Manage user roles. Grant or revoke admin access.
       </p>
     </div>
     <AdminUsersTable users={users} currentUserId={currentUserId} />
   </div>
   ```

Commit: `feat(user): add admin interface for role management`

### Step 7: Build and verify

1. Run `npm run build` and `npm run lint` to confirm no regressions.
2. Regenerate Supabase types: `npm run db:types`.
3. Start the dev server and test the following scenarios:
   - Non-admin user navigating to `/admin` is redirected to `/`.
   - Admin user sees the user list at `/admin/users`.
   - Admin can grant the `admin` role to another user — role badge updates.
   - Admin can revoke the `admin` role from another user — role badge updates.
   - Admin's own row shows no action button (self-modification prevented).
   - Attempting to manipulate the action directly (e.g., via DevTools) fails due to RLS.

## Key Design Decisions

1. **Two-tier role system** — `user` is a permanent baseline, `admin` is promotional. Can be extended with additional roles (e.g., `moderator`) later by inserting into the `roles` table.
2. **Multi-role support (many-to-many)** — Users can hold multiple roles simultaneously. Permission checks are explicit.
3. **Database trigger for auto-assignment** — Guarantees every profile has the `user` role regardless of creation path.
4. **Self-modification prevention** — Write policies include `auth.uid() != user_id` to prevent privilege escalation.
5. **Server-only role enforcement** — All role checks happen server-side (middleware, server actions, RLS).
6. **Module consolidation** — Merging `profile/` into `user/` creates a single owner for all user-entity code. Auth stays separate because it's about identity verification, not user data. Social/community features will get their own module when that epic is implemented.
