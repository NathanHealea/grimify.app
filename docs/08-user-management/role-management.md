# Role Management

**Epic:** User Management
**Type:** Feature
**Status:** Todo
**Branch:** `feature/role-management`
**Merge into:** `v1/main`

## Summary

Admin interface for managing roles and role assignments. Admins can create new roles (beyond the default `user` and `admin`), rename roles, delete unused custom roles, and assign or revoke roles from users. The `user` role is protected and cannot be deleted or removed from any account. This feature fulfills the remaining acceptance criteria from the [User Roles](../01-authentication-and-user-accounts/user-roles.md) feature doc.

## Acceptance Criteria

- [ ] Admins can view a list of all roles with the number of assigned users
- [ ] Admins can create a new role with a unique name
- [ ] Admins can rename an existing role (except built-in `user` and `admin`)
- [ ] Admins can delete a custom role that has no assigned users
- [ ] Admins can assign a role to a user from the role detail page
- [ ] Admins can revoke a role from a user (except the `user` role)
- [ ] Built-in roles (`user`, `admin`) cannot be deleted
- [ ] Role names are validated: lowercase, alphanumeric with hyphens, 2-30 characters
- [ ] At least one admin is seeded or manually assigned in the database
- [ ] `npm run build` and `npm run lint` pass with no errors

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

| Action | File                                                | Description                                            |
| ------ | --------------------------------------------------- | ------------------------------------------------------ |
| Create | `supabase/migrations/XXXXXX_add_role_crud.sql`      | RLS policies and triggers for role CRUD                |
| Create | `src/app/admin/roles/page.tsx`                      | Role list page with create form                        |
| Create | `src/app/admin/roles/[id]/page.tsx`                 | Role detail page with assigned users                   |
| Create | `src/modules/admin/actions/create-role.ts`          | Server action to create a new role                     |
| Create | `src/modules/admin/actions/update-role.ts`          | Server action to rename a role                         |
| Create | `src/modules/admin/actions/delete-role.ts`          | Server action to delete a custom role                  |
| Create | `src/modules/admin/actions/assign-role.ts`          | Server action to assign a role to a user               |
| Create | `src/modules/admin/actions/revoke-role.ts`          | Server action to revoke a role from a user             |
| Create | `src/modules/admin/components/role-list.tsx`        | Role list table component                              |
| Create | `src/modules/admin/components/create-role-form.tsx` | Form to create a new role                              |
| Create | `src/modules/admin/components/role-detail.tsx`      | Role detail view with assigned users                   |
| Create | `src/modules/admin/validation.ts`                   | Validation logic for role names                        |
| Modify | `src/modules/user/types/role.ts`                    | Update Role type to be dynamic (string, not union)     |

## Implementation

### Step 1: Database migration — Role CRUD support

Create migration `supabase/migrations/XXXXXX_add_role_crud.sql`:

1. Add INSERT, UPDATE, DELETE RLS policies on `roles` table for admins
2. Add trigger to prevent deletion of built-in roles (`user`, `admin`)
3. Add trigger to prevent renaming built-in roles
4. Add a `builtin` boolean column (default `false`) to `roles` table — set to `true` for `user` and `admin`. This makes it easy for the UI to distinguish built-in vs. custom roles without hardcoding names.

### Step 2: Update Role type

Modify `src/modules/user/types/role.ts`:

The current type is a strict union: `type Role = 'user' | 'admin'`. Since admins can now create arbitrary roles, change this to `string` with the built-in roles as constants:

```ts
/** A role name string. Built-in roles are 'user' and 'admin'. */
type Role = string

/** Built-in role names that cannot be modified or deleted. */
const BUILTIN_ROLES = ['user', 'admin'] as const
```

### Step 3: Role validation

Create `src/modules/admin/validation.ts`:

- `validateRoleName(name)` — Enforces: 2-30 characters, lowercase alphanumeric with hyphens only, cannot be a built-in role name. Returns error string or null.

### Step 4: Server actions for role CRUD

Create server actions in `src/modules/admin/actions/`:

**`create-role.ts`:**
1. Validate admin role via `hasRole()`
2. Validate role name
3. Insert into `roles` table
4. Revalidate `/admin/roles`
5. Return success or error

**`update-role.ts`:**
1. Validate admin role
2. Validate new name
3. Check role is not built-in (via `builtin` column)
4. Update `roles` row
5. Revalidate path

**`delete-role.ts`:**
1. Validate admin role
2. Check role has no assigned users (count `user_roles` for this role)
3. Check role is not built-in
4. Delete from `roles`
5. Revalidate path

**`assign-role.ts`:**
1. Validate admin role
2. Validate target user exists
3. Insert into `user_roles`
4. Revalidate path

**`revoke-role.ts`:**
1. Validate admin role
2. Check role is not `user` (cannot revoke baseline role)
3. Delete from `user_roles`
4. Revalidate path

### Step 5: Role list page

Create `src/app/admin/roles/page.tsx`:

- Server component
- Fetches all roles with user count: query `roles` left-joined with `user_roles` grouped by role
- Renders a table: role name, built-in badge, user count, actions (view/delete)
- Includes a "Create Role" form (inline or modal) at the top
- Delete button is disabled for built-in roles and roles with assigned users

### Step 6: Role detail page

Create `src/app/admin/roles/[id]/page.tsx`:

- Server component
- Fetches role details and all users assigned to this role (join `user_roles` → `profiles`)
- Displays role name (editable for custom roles), user list with revoke buttons
- "Assign user" section: search/select a user to assign this role to
- User picker queries `profiles` and excludes users who already have this role

### Step 7: Seed the first admin

Document the manual SQL command in the migration as a comment:

```sql
-- To seed the first admin after applying this migration:
-- INSERT INTO user_roles (user_id, role_id)
-- SELECT p.id, r.id FROM profiles p, roles r
-- WHERE p.display_name = '<your-display-name>' AND r.name = 'admin';
```

### Step 8: Build and verify

Run `npm run build` and `npm run lint`.

## Key Design Decisions

1. **`builtin` column instead of hardcoded names** — Adding a `builtin` boolean column to `roles` is more maintainable than hardcoding `user`/`admin` checks in every server action. The database triggers enforce protection regardless of how the table is accessed.
2. **Dynamic Role type** — Changing `Role` from a union type to `string` accommodates admin-created roles. Constants identify the built-in roles.
3. **Delete requires zero assignments** — A role cannot be deleted while users hold it. Admins must revoke the role from all users first. This prevents accidental orphaning.
4. **Self-modification prevention preserved** — The existing RLS policies on `user_roles` already prevent admins from modifying their own role assignments. No changes needed.
