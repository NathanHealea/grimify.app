# Role Management

**Epic:** User Management
**Type:** Feature
**Status:** Completed
**Branch:** `feature/role-management`
**Merge into:** `v1/main`

## Summary

Admin interface for managing roles and role assignments. Admins can create new roles (beyond the default `user` and `admin`), rename roles, delete unused custom roles, and assign or revoke roles from users. The `user` role is protected and cannot be deleted or removed from any account. This feature fulfills the remaining acceptance criteria from the [User Roles](../01-authentication-and-user-accounts/03-user-roles.md) feature doc.

## Acceptance Criteria

- [x] Admins can view a list of all roles with the number of assigned users
- [x] Admins can create a new role with a unique name
- [x] Admins can rename an existing role (except built-in `user` and `admin`)
- [x] Admins can delete a custom role that has no assigned users
- [x] Admins can assign a role to a user from the role detail page
- [x] Admins can revoke a role from a user (except the `user` role)
- [x] Built-in roles (`user`, `admin`) cannot be deleted
- [x] Role names are validated: lowercase, alphanumeric with hyphens, 2-30 characters
- [x] At least one admin is seeded or manually assigned in the database
- [x] `npm run build` and `npm run lint` pass with no errors

## Routes

| Route                | Description                                        |
| -------------------- | -------------------------------------------------- |
| `/admin/roles`       | Role list with create form                         |
| `/admin/roles/[id]`  | Role detail: assigned users, rename, delete        |

## Database

### Migration: Role CRUD policies

The current `roles` table has no INSERT/UPDATE/DELETE policies — roles are managed via migrations only. To allow admin CRUD through the UI, add policies:

```sql
-- INSERT: Only admins can create new roles
CREATE POLICY "Admins can create roles"
  ON public.roles FOR INSERT TO authenticated
  WITH CHECK ('admin' = ANY(public.get_user_roles(auth.uid())));

-- UPDATE: Only admins can rename roles
CREATE POLICY "Admins can update roles"
  ON public.roles FOR UPDATE TO authenticated
  USING ('admin' = ANY(public.get_user_roles(auth.uid())))
  WITH CHECK ('admin' = ANY(public.get_user_roles(auth.uid())));

-- DELETE: Only admins can delete roles
CREATE POLICY "Admins can delete roles"
  ON public.roles FOR DELETE TO authenticated
  USING ('admin' = ANY(public.get_user_roles(auth.uid())));
```

### Trigger: Prevent deletion of built-in roles

```sql
CREATE OR REPLACE FUNCTION public.prevent_builtin_role_deletion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF OLD.name IN ('user', 'admin') THEN
    RAISE EXCEPTION 'Built-in role "%" cannot be deleted.', OLD.name;
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER on_role_delete_prevent_builtin
  BEFORE DELETE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_builtin_role_deletion();
```

### Trigger: Prevent renaming built-in roles

```sql
CREATE OR REPLACE FUNCTION public.prevent_builtin_role_rename()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF OLD.name IN ('user', 'admin') AND NEW.name != OLD.name THEN
    RAISE EXCEPTION 'Built-in role "%" cannot be renamed.', OLD.name;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_role_update_prevent_builtin_rename
  BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_builtin_role_rename();
```

## Key Files

| Action | File                                                             | Description                                            |
| ------ | ---------------------------------------------------------------- | ------------------------------------------------------ |
| Create | `supabase/migrations/20260418000000_add_role_crud.sql`           | RLS policies, `builtin` column, and protection triggers |
| Modify | `src/modules/user/types/role.ts`                                 | Update Role type to `string` with `BUILTIN_ROLES` constant |
| Modify | `src/modules/user/utils/roles.ts`                                | Remove hard-coded `'user' | 'admin'` filter             |
| Create | `src/modules/admin/validation.ts`                                | `validateRoleName()` for role name rules                |
| Create | `src/modules/admin/actions/create-role.ts`                       | Server action to create a new role                     |
| Create | `src/modules/admin/actions/update-role.ts`                       | Server action to rename a role                         |
| Create | `src/modules/admin/actions/delete-role.ts`                       | Server action to delete a custom role                  |
| Create | `src/modules/admin/actions/assign-role.ts`                       | Server action to assign a role to a user               |
| Create | `src/modules/admin/actions/revoke-role.ts`                       | Server action to revoke a role from a user             |
| Create | `src/app/admin/roles/page.tsx`                                   | Role list page with create form                        |
| Create | `src/app/admin/roles/[id]/page.tsx`                              | Role detail page with assigned users                   |
| Create | `src/modules/admin/components/role-list-table.tsx`               | Client component — role list with delete actions       |
| Create | `src/modules/admin/components/create-role-form.tsx`              | Client component — inline form to create a role        |
| Create | `src/modules/admin/components/role-detail-card.tsx`              | Client component — role info with rename form          |
| Create | `src/modules/admin/components/role-users-table.tsx`              | Client component — assigned users with revoke actions  |
| Create | `src/modules/admin/components/assign-role-form.tsx`              | Client component — user picker to assign a role        |
| Modify | `src/modules/admin/components/admin-sidebar.tsx`                 | Add "Roles" nav item                                   |

### Existing files (no changes needed)

| File                                                  | Relevance                                         |
| ----------------------------------------------------- | ------------------------------------------------- |
| `src/modules/user/actions/toggle-admin-role.ts`       | Pattern reference for role mutation actions        |
| `src/modules/user/components/admin-users-table.tsx`   | Pattern reference for admin table + `useTransition` |
| `src/modules/user/components/delete-user-dialog.tsx`  | Pattern reference for confirmation dialogs         |
| `src/styles/badge.css`                                | Existing badge classes for role badges             |

## Implementation

### Step 1: Database migration — Role CRUD support

Create `supabase/migrations/20260418000000_add_role_crud.sql`:

#### 1a. Add `builtin` column to `roles`

```sql
ALTER TABLE public.roles ADD COLUMN builtin boolean NOT NULL DEFAULT false;
UPDATE public.roles SET builtin = true WHERE name IN ('user', 'admin');
```

This lets the UI and server actions distinguish built-in roles from custom ones without hardcoding names.

#### 1b. Add INSERT / UPDATE / DELETE RLS policies on `roles`

Currently only a SELECT policy exists. Add admin-only mutation policies:

```sql
CREATE POLICY "Admins can create roles"
  ON public.roles FOR INSERT TO authenticated
  WITH CHECK ('admin' = ANY(public.get_user_roles(auth.uid())));

CREATE POLICY "Admins can update roles"
  ON public.roles FOR UPDATE TO authenticated
  USING ('admin' = ANY(public.get_user_roles(auth.uid())))
  WITH CHECK ('admin' = ANY(public.get_user_roles(auth.uid())));

CREATE POLICY "Admins can delete roles"
  ON public.roles FOR DELETE TO authenticated
  USING ('admin' = ANY(public.get_user_roles(auth.uid())));
```

#### 1c. Trigger: prevent deletion of built-in roles

```sql
CREATE OR REPLACE FUNCTION public.prevent_builtin_role_deletion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF OLD.builtin THEN
    RAISE EXCEPTION 'Built-in role "%" cannot be deleted.', OLD.name;
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER on_role_delete_prevent_builtin
  BEFORE DELETE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_builtin_role_deletion();
```

#### 1d. Trigger: prevent renaming built-in roles

```sql
CREATE OR REPLACE FUNCTION public.prevent_builtin_role_rename()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF OLD.builtin AND NEW.name != OLD.name THEN
    RAISE EXCEPTION 'Built-in role "%" cannot be renamed.', OLD.name;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_role_update_prevent_builtin_rename
  BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_builtin_role_rename();
```

Commit: `feat(roles): add role CRUD migration with builtin column and protection triggers`

### Step 2: Update Role type and utilities

#### 2a. Modify `src/modules/user/types/role.ts`

Change from a strict union to a string type with built-in constants:

```ts
/** A role name string. Built-in roles are `'user'` and `'admin'`. */
export type Role = string

/** Built-in role names that cannot be modified or deleted. */
export const BUILTIN_ROLES = ['user', 'admin'] as const

/** Type guard for checking if a role name is built-in. */
export function isBuiltinRole(name: string): boolean {
  return BUILTIN_ROLES.includes(name as (typeof BUILTIN_ROLES)[number])
}
```

#### 2b. Modify `src/modules/user/utils/roles.ts`

The current `getUserRoles` has a `.filter()` that only keeps `'user' | 'admin'` — this would silently drop custom roles. Remove the strict filter:

```ts
// Before:
.filter((name): name is Role => name === 'user' || name === 'admin')

// After:
.filter((name): name is string => typeof name === 'string')
```

Commit: `feat(roles): update Role type to support custom roles`

### Step 3: Role name validation

Create `src/modules/admin/validation.ts`:

```ts
import { BUILTIN_ROLES } from '@/modules/user/types/role'

/**
 * Validates a role name.
 *
 * Rules: 2-30 characters, lowercase alphanumeric with hyphens,
 * cannot match a built-in role name.
 *
 * @param name - The role name to validate.
 * @returns Error message string, or `null` if valid.
 */
export function validateRoleName(name: string): string | null
```

Validation rules:
- Trimmed, non-empty
- 2–30 characters
- Pattern: `/^[a-z][a-z0-9-]*$/` (starts with a letter, then lowercase alphanum or hyphen)
- Not in `BUILTIN_ROLES`

Commit: `feat(roles): add role name validation`

### Step 4: Server actions for role CRUD

Create five server actions in `src/modules/admin/actions/`. Follow the same pattern as `toggle-admin-role.ts` — create Supabase server client, perform mutation, revalidate path, return `{ error?: string }`.

**`create-role.ts`** — `createRole(name: string)`
1. Validate name via `validateRoleName()`
2. Insert into `roles` with `builtin: false`
3. Handle unique constraint violation (`23505` → "Role name already exists")
4. `revalidatePath('/admin/roles')`

**`update-role.ts`** — `updateRole(roleId: string, newName: string)`
1. Validate name
2. Fetch role, check `builtin !== true`
3. Update `roles` row
4. Handle trigger exception (built-in rename prevention) and unique violations
5. `revalidatePath('/admin/roles')`

**`delete-role.ts`** — `deleteRole(roleId: string)`
1. Fetch role, check `builtin !== true`
2. Count `user_roles` rows for this role — reject if > 0 with "Role has assigned users"
3. Delete from `roles`
4. `revalidatePath('/admin/roles')`

**`assign-role.ts`** — `assignRole(userId: string, roleId: string)`
1. Insert into `user_roles` — RLS enforces admin check and self-modification prevention
2. Handle unique constraint (already assigned)
3. `revalidatePath('/admin/roles/[id]')` and `revalidatePath('/admin/users')`

**`revoke-role.ts`** — `revokeRole(userId: string, roleId: string)`
1. Look up role name — reject if `'user'` (baseline role cannot be revoked; the existing `prevent_user_role_deletion` trigger also guards this)
2. Delete from `user_roles` — RLS enforces admin check
3. `revalidatePath` for both roles detail and users pages

Commit: `feat(roles): add server actions for role CRUD and assignment`

### Step 5: Role list page and components

#### 5a. Create `src/modules/admin/components/create-role-form.tsx`

Client component — inline form at the top of the roles page:
- Single text input + "Create" button
- Uses `useActionState` with `createRole` server action
- Client-side validation via `validateRoleName` before submission
- Shows error messages inline

#### 5b. Create `src/modules/admin/components/role-list-table.tsx`

Client component — table of all roles:

**Props:** `roles: { id: string; name: string; builtin: boolean; userCount: number }[]`

**Columns:** Name, Built-in badge, Users count, Actions
- Built-in roles show a `badge badge-soft` label
- Actions: "View" link to `/admin/roles/[id]`, "Delete" button
- Delete button disabled for built-in roles or roles with `userCount > 0`
- Delete uses `useTransition` + `deleteRole` action with inline confirmation (follow `delete-user-dialog.tsx` pattern)

#### 5c. Create `src/app/admin/roles/page.tsx`

Server component:
1. Query all roles with user counts:
   ```ts
   const { data: roles } = await supabase
     .from('roles')
     .select('id, name, builtin, user_roles(count)')
     .order('builtin', { ascending: false })
     .order('name')
   ```
2. Map to extract `userCount` from the nested count
3. Render heading, `<CreateRoleForm />`, and `<RoleListTable roles={roles} />`

Commit: `feat(roles): add role list page with create form`

### Step 6: Role detail page and components

#### 6a. Create `src/modules/admin/components/role-detail-card.tsx`

Client component — shows role name with rename form for custom roles:

**Props:** `role: { id: string; name: string; builtin: boolean }`

- If `builtin`: display name as read-only with a "Built-in" badge
- If custom: inline edit form — click name to edit, submit to `updateRole` action
- Uses `useActionState` for form submission

#### 6b. Create `src/modules/admin/components/role-users-table.tsx`

Client component — table of users assigned to this role:

**Props:** `roleId: string`, `roleName: string`, `users: { id: string; display_name: string | null; avatar_url: string | null }[]`

**Columns:** Avatar, Display Name, Actions
- "Revoke" button per user row — disabled if `roleName === 'user'` (baseline role)
- Uses `useTransition` + `revokeRole` action
- Follows the same table pattern as `admin-users-table.tsx`

#### 6c. Create `src/modules/admin/components/assign-role-form.tsx`

Client component — user picker to assign the role:

**Props:** `roleId: string`, `excludeUserIds: string[]`

- Text input that searches profiles by display name (client-side filter from a pre-fetched list, or a server action for search)
- On select, calls `assignRole(userId, roleId)`
- Simplest approach: a `<select>` dropdown populated by the server page with all users not already assigned. Enhance to a searchable input later if the user list grows.

#### 6d. Create `src/app/admin/roles/[id]/page.tsx`

Server component:
1. Fetch role by ID: `supabase.from('roles').select('id, name, builtin').eq('id', params.id).single()`
2. Return `notFound()` if role doesn't exist
3. Fetch assigned users: `supabase.from('user_roles').select('profiles(id, display_name, avatar_url)').eq('role_id', params.id)`
4. Fetch unassigned users for the assign picker: all profiles NOT in the assigned list
5. Render `<RoleDetailCard>`, `<RoleUsersTable>`, and `<AssignRoleForm>`

Commit: `feat(roles): add role detail page with user assignment`

### Step 7: Update admin sidebar

Modify `src/modules/admin/components/admin-sidebar.tsx`:

Add a "Roles" nav item to `NAV_ITEMS`:

```ts
const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/roles', label: 'Roles' },
]
```

Commit: `feat(roles): add roles link to admin sidebar`

### Step 8: Build and verify

1. Run `npm run build` and `npm run lint` to confirm no regressions.
2. Regenerate Supabase types: `npm run db:types` (to pick up the new `builtin` column).
3. Test scenarios:
   - Role list shows `user` (built-in) and `admin` (built-in) with user counts
   - Create a custom role (e.g., `moderator`) — appears in list
   - Rename a custom role — name updates
   - Cannot rename or delete `user` or `admin` (buttons disabled, triggers guard)
   - Cannot delete a custom role that has assigned users
   - Assign a role to a user from the detail page
   - Revoke a custom role from a user
   - Cannot revoke the `user` role (baseline protection)
   - Admin sidebar shows Dashboard, Users, Roles links

## Key Design Decisions

1. **`builtin` column instead of hardcoded names** — Adding a `builtin` boolean column to `roles` is more maintainable than hardcoding `user`/`admin` checks in every server action. The database triggers enforce protection regardless of how the table is accessed.
2. **Dynamic Role type** — Changing `Role` from a union type to `string` accommodates admin-created roles. Constants identify the built-in roles.
3. **Delete requires zero assignments** — A role cannot be deleted while users hold it. Admins must revoke the role from all users first. This prevents accidental orphaning.
4. **Self-modification prevention preserved** — The existing RLS policies on `user_roles` already prevent admins from modifying their own role assignments. No changes needed.
