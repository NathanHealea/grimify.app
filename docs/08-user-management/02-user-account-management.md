# User Account Management

**Epic:** User Management
**Type:** Feature
**Status:** Todo
**Branch:** `feature/user-account-management`
**Merge into:** `v1/main`

## Summary

Admin interface for viewing, searching, and managing user accounts. Admins can browse a paginated list of all users, search by display name or email, view user details (profile, roles, auth method), and deactivate or delete user accounts. This is the primary admin tool for day-to-day user oversight.

## Acceptance Criteria

- [ ] Admins can view a paginated list of all users with display name, email, roles, and sign-up date
- [ ] Admins can search users by display name (partial, case-insensitive)
- [ ] Admins can filter users by role
- [ ] Admins can view a user detail page with profile info, assigned roles, and auth method
- [ ] Admins can deactivate a user account (ban from signing in without deleting data)
- [ ] Admins can delete a user account with a confirmation dialog
- [ ] Deleting a user cascades through auth.users → profiles → user_roles
- [ ] Admins cannot delete their own account from the admin interface
- [ ] `npm run build` and `npm run lint` pass with no errors

## Routes

| Route                     | Description                                    |
| ------------------------- | ---------------------------------------------- |
| `/admin/users`            | Paginated user list with search and filters    |
| `/admin/users/[id]`       | User detail page with profile, roles, actions  |

## Key Files

| Action | File                                                        | Description                                           |
| ------ | ----------------------------------------------------------- | ----------------------------------------------------- |
| Modify | `src/app/admin/users/page.tsx`                              | Add search, role filter, pagination to existing page  |
| Create | `src/app/admin/users/[id]/page.tsx`                         | User detail page (view, deactivate, delete)           |
| Create | `src/lib/supabase/admin.ts`                                 | Supabase admin client using service role key          |
| Create | `src/modules/user/components/user-search.tsx`               | Debounced search input with URL param sync            |
| Create | `src/modules/user/components/user-detail.tsx`               | User detail view component                            |
| Create | `src/modules/user/components/deactivate-user-button.tsx`    | Ban/unban toggle button                               |
| Create | `src/modules/user/actions/deactivate-user.ts`               | Server action to ban/unban a user                     |
| Modify | `src/modules/user/components/admin-users-table.tsx`         | Add email, created_at columns, pagination controls    |
| Modify | `src/modules/user/components/delete-user-dialog.tsx`        | Add type-to-confirm input                             |
| Modify | `src/modules/user/types/user-with-roles.ts`                | Add email and created_at fields                       |

## Implementation

### Existing assets

Several pieces of this feature already exist and should be enhanced rather than recreated:

| File | What exists | What's needed |
| ---- | ----------- | ------------- |
| `src/app/admin/users/page.tsx` | Fetches all profiles with roles, renders `AdminUsersTable` | Add `searchParams`, pagination query with count, `ilike` search, role filter |
| `src/modules/user/components/admin-users-table.tsx` | Renders user rows with avatar, name, role badges, actions menu | Add email and created_at columns, pagination controls |
| `src/modules/user/components/admin-user-actions-menu.tsx` | Dropdown with View, Edit, Delete links | Update View link from `/users/{id}` to `/admin/users/{id}` |
| `src/modules/user/components/delete-user-dialog.tsx` | Confirmation dialog using native `<dialog>`, calls `deleteUser` action | Add type-to-confirm (require typing display name) |
| `src/modules/user/actions/delete-user.ts` | Calls `admin_delete_user` RPC (SECURITY DEFINER, cascades through `auth.users`) | No changes needed — already works |
| `src/modules/user/types/user-with-roles.ts` | `{ id, display_name, avatar_url, roles }` | Add `email` and `created_at` fields |
| `supabase/migrations/20260417000000_admin_profile_operations.sql` | `admin_delete_user` RPC + admin update profile RLS policy | No changes needed |

Admin-related user components live in `src/modules/user/` (not `src/modules/admin/`). The admin module owns role-management components. New user-management files follow the same convention.

### Step 1: Migration — Add email column to profiles

The acceptance criteria requires showing email in the user list. Email lives in `auth.users`, which is only accessible via the Admin API. To avoid calling the Admin API on every list page load, sync email into the `profiles` table.

Create migration `supabase/migrations/20260420000000_add_email_to_profiles.sql`:

1. Add `email text` column to `profiles`
2. Backfill existing profiles: `UPDATE profiles SET email = u.email FROM auth.users u WHERE profiles.id = u.id`
3. Update the `handle_new_user()` trigger function to copy `NEW.email` into the profile on insert
4. Add a new trigger on `auth.users` for `AFTER UPDATE OF email` to keep the profile email in sync

This keeps the list page query simple — a single `profiles` select with joins, no Admin API call needed.

### Step 2: Create Supabase admin client utility

Create `src/lib/supabase/admin.ts`:

```ts
import { createClient } from '@supabase/supabase-js'
```

- Export `createAdminClient()` that returns a Supabase client using `SUPABASE_SECRET_KEY` (the env var already exists in `.env`)
- This client bypasses RLS and can access `auth.admin.*` methods
- Only importable in server-side code (server actions, server components)
- Used for: `auth.admin.getUserById()` (detail page auth info), `auth.admin.updateUserById()` (ban/unban)

The env var is `SUPABASE_SECRET_KEY` (not `SUPABASE_SERVICE_ROLE_KEY`) — this is the service role key already configured in `.env`.

### Step 3: Extend `UserWithRoles` type

Modify `src/modules/user/types/user-with-roles.ts`:

- Add `email: string | null` field
- Add `created_at: string` field
- These are needed by the enhanced user list table

### Step 4: User search component

Create `src/modules/user/components/user-search.tsx`:

- Client component (`'use client'`) with a text input using the `.input` CSS class
- Reads initial value from `searchParams.get('q')`
- Debounces input (300ms) and updates URL search params via `useRouter().replace()`
- On new search: preserves `role` param, resets `page` to 1
- Follow the pattern from `src/modules/paints/components/paint-explorer.tsx` for URL param syncing

### Step 5: Update user list page with search, filter, and pagination

Modify `src/app/admin/users/page.tsx`:

- Accept `searchParams` prop: `{ q?: string; role?: string; page?: string }`
- **Search**: If `q` is present, add `.ilike('display_name', `%${q}%`)` to query
- **Role filter**: If `role` is present, fetch the role ID from `roles` table, then filter `profiles` by joining through `user_roles` where `role_id` matches
- **Pagination**: Use `range(offset, offset + PAGE_SIZE - 1)` with `{ count: 'exact' }` for total count. `PAGE_SIZE = 20`.
- **Ordering**: `.order('created_at', { ascending: false })` (newest first)
- **Select**: Add `email, created_at` to the select clause (available after Step 1 migration)
- Fetch all roles for the role filter dropdown: `supabase.from('roles').select('id, name').order('name')`
- Render: `UserSearch` component, role filter `<select>`, `AdminUsersTable`, pagination controls (prev/next links)
- Compute `totalPages = Math.ceil(count / PAGE_SIZE)`, render page links that update the `?page=` param

### Step 6: Update users table component

Modify `src/modules/user/components/admin-users-table.tsx`:

- Add `email` column after User column (truncated, `text-muted-foreground`)
- Add `Joined` column showing `created_at` formatted as "MMM D, YYYY"
- Accept `currentPage`, `totalPages`, and `searchParams` props for pagination
- Render prev/next navigation below the table using `<Link>` components with updated page params
- Keep existing avatar, display name, role badges, and actions menu behavior

### Step 7: Update actions menu — fix View link

Modify `src/modules/user/components/admin-user-actions-menu.tsx`:

- Change View link from `/users/${userId}` to `/admin/users/${userId}` (the detail page being created in Step 8)
- This ensures the View action navigates to the admin detail page, not the public profile

### Step 8: User detail page

Create `src/app/admin/users/[id]/page.tsx`:

- Server component, follows the same pattern as `src/app/admin/roles/[id]/page.tsx`
- **Data fetching** (parallel where possible):
  1. Profile: `supabase.from('profiles').select('*').eq('id', id).single()`
  2. Roles: `supabase.from('user_roles').select('role_id, roles(id, name)').eq('user_id', id)`
  3. Auth info: `adminClient.auth.admin.getUserById(id)` — returns `email`, `identities` (providers), `last_sign_in_at`, `banned_until`
- Uses `createClient()` (anon) for profile/roles and `createAdminClient()` (service role) for auth info
- If profile not found → `notFound()`
- **Renders** `UserDetail` component with four sections

Create `src/modules/user/components/user-detail.tsx`:

- Client component with four card sections:
  1. **Profile** — Avatar, display name, email, bio, setup status, created/updated dates
  2. **Roles** — List of assigned role badges (link to `/admin/roles/{roleId}` for management)
  3. **Auth Info** — Provider(s) (email, Google, Discord from `identities` array), last sign-in timestamp
  4. **Actions** — `DeactivateUserButton` (toggle ban) and Delete button (opens `DeleteUserDialog`)
- Uses existing CSS classes: `.card`, `.badge`, `.btn`, `.avatar`
- Shows "Banned" badge in destructive color if `banned_until` is set
- Hides destructive actions if viewing own account (self-protection)

### Step 9: Deactivate user action

Create `src/modules/user/actions/deactivate-user.ts`:

- Server action following established pattern (`'use server'`, return `{ error?: string }`)
- Takes `userId: string` and `ban: boolean` params
- Validates caller is authenticated via `supabase.auth.getUser()`
- Prevents self-deactivation: `userId !== currentUser.id`
- Uses admin client: `createAdminClient().auth.admin.updateUserById(userId, { ban_duration })`
  - `ban = true` → `ban_duration: '876000h'` (100 years, effectively permanent)
  - `ban = false` → `ban_duration: 'none'` (removes ban)
- `revalidatePath('/admin/users')` and `revalidatePath(`/admin/users/${userId}`)`
- Returns `{ error }` on failure, `{}` on success

### Step 10: Deactivate user button

Create `src/modules/user/components/deactivate-user-button.tsx`:

- Client component (`'use client'`) using `useTransition` for pending state
- Props: `userId`, `isBanned` (current ban state)
- Displays "Deactivate" (btn-destructive) or "Reactivate" (btn-primary) based on `isBanned`
- Calls `deactivateUser(userId, !isBanned)` on click
- Shows error inline if action fails

### Step 11: Enhance delete dialog with type-to-confirm

Modify `src/modules/user/components/delete-user-dialog.tsx`:

- Add a text input below the warning message
- Label: `Type "{displayName}" to confirm`
- Delete button is disabled until the input value matches `displayName` exactly
- Clear the input when dialog opens/closes
- Keep existing `useTransition` + `deleteUser` action call

### Step 12: Build and verify

Run `npm run build` and `npm run lint`. Fix any type errors or lint violations.

## Key Design Decisions

1. **Email synced to profiles table** — Rather than calling the Supabase Admin API on every list page load, email is synced from `auth.users` to `profiles` via trigger. This keeps the list query simple and performant — a single table scan with joins, no cross-service calls.
2. **URL-based search and filter state** — Search query, role filter, and page number are stored in URL params (`?q=`, `?role=`, `?page=`). This makes the user list linkable, supports browser back/forward, and avoids client-side state management.
3. **Admin client only where necessary** — The service-role admin client (`SUPABASE_SECRET_KEY`) is used only for operations that require it: fetching auth identities on the detail page and ban/unban. The list page and all other queries use the regular anon-key client with RLS.
4. **Ban instead of soft-delete for deactivation** — Supabase's `ban_duration` is the built-in mechanism for disabling accounts. It prevents sign-in without removing data, and is easily reversible. No custom `is_active` column needed.
5. **Type-to-confirm deletion** — Requiring the display name to confirm deletion prevents accidental data loss. This is a common pattern for destructive admin actions.
6. **Self-protection** — Admins cannot delete or deactivate their own account from the admin interface. This prevents lockout scenarios. The existing `admin_delete_user` RPC already enforces this at the database level; the UI hides actions on the admin's own row.
7. **Components stay in user module** — Existing admin-facing user components (`admin-users-table`, `delete-user-dialog`, `admin-user-actions-menu`) live in `src/modules/user/`. New components follow the same convention for consistency. The `admin` module owns role-management components.
