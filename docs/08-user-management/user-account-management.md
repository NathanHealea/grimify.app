# User Account Management

**Epic:** User Management
**Type:** Feature
**Status:** Todo

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
| `/admin/users/[userId]`   | User detail page with profile, roles, actions  |

## Key Files

| Action | File                                                  | Description                                         |
| ------ | ----------------------------------------------------- | --------------------------------------------------- |
| Create | `src/app/admin/users/page.tsx`                        | User list page with search and pagination           |
| Create | `src/app/admin/users/[userId]/page.tsx`               | User detail page                                    |
| Create | `src/modules/admin/actions/delete-user.ts`            | Server action to delete a user account              |
| Create | `src/modules/admin/actions/deactivate-user.ts`        | Server action to ban/unban a user                   |
| Create | `src/modules/admin/components/user-list.tsx`          | Paginated user table component                      |
| Create | `src/modules/admin/components/user-search.tsx`        | Search input with debounced query                   |
| Create | `src/modules/admin/components/user-detail.tsx`        | User detail view component                          |
| Create | `src/modules/admin/components/delete-user-dialog.tsx` | Confirmation dialog for user deletion               |

## Implementation

### Step 1: User list page

Create `src/app/admin/users/page.tsx`:

- Server component that accepts `searchParams` for pagination and filtering
- Query `profiles` table with:
  - Left join to `user_roles` → `roles` to include role names
  - Optional `display_name` filter via `ilike` for search
  - Optional role filter via `user_roles.role_id`
  - Pagination: `range(offset, offset + pageSize - 1)` with count
  - Order by `created_at` DESC (newest first)
- Renders search input, role filter dropdown, and paginated table
- Each row shows: avatar, display name, roles (as badges), created date, actions dropdown

Search and filter state is managed via URL search params (`?q=`, `?role=`, `?page=`) for shareability and back-button support.

### Step 2: User search component

Create `src/modules/admin/components/user-search.tsx`:

- Client component with a text input
- Debounces input (300ms) and updates URL search params via `useRouter().replace()`
- Preserves other query params (role filter, page resets to 1 on new search)

### Step 3: User detail page

Create `src/app/admin/users/[userId]/page.tsx`:

- Server component that fetches:
  - Profile data: `profiles` where `id = userId`
  - Assigned roles: `user_roles` joined with `roles` where `user_id = userId`
  - Auth method: `supabase.auth.admin.getUserById(userId)` to get identities (email, Google, Discord)
- Renders sections:
  1. **Profile** — Display name, bio, avatar, setup status, created/updated dates
  2. **Roles** — List of assigned roles with revoke buttons (links to role management actions)
  3. **Auth Info** — Auth method(s), email, last sign-in
  4. **Actions** — Deactivate/reactivate toggle, delete button

### Step 4: Deactivate user action

Create `src/modules/admin/actions/deactivate-user.ts`:

- Validates admin role
- Prevents self-deactivation (`userId !== currentUser.id`)
- Uses Supabase Admin API: `supabase.auth.admin.updateUserById(userId, { ban_duration: 'none' | '876000h' })`
  - `ban_duration: '876000h'` (100 years) effectively bans the user
  - `ban_duration: 'none'` removes the ban
- Revalidates the user detail page

**Note:** The Supabase Admin API requires the `service_role` key. Create a separate Supabase admin client for admin server actions:

```ts
import { createClient } from '@supabase/supabase-js'

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

This admin client is used only in server actions behind admin role checks. The service role key is never exposed to the client.

### Step 5: Delete user action

Create `src/modules/admin/actions/delete-user.ts`:

- Validates admin role
- Prevents self-deletion (`userId !== currentUser.id`)
- Uses Supabase Admin API: `supabase.auth.admin.deleteUser(userId)`
- Deletion cascades: `auth.users` → `profiles` (ON DELETE CASCADE) → `user_roles` (ON DELETE CASCADE)
- Redirects to `/admin/users` after successful deletion

### Step 6: Delete confirmation dialog

Create `src/modules/admin/components/delete-user-dialog.tsx`:

- Client component wrapping a confirmation dialog
- Shows the user's display name and a warning that this action is irreversible
- Requires typing the display name to confirm (prevents accidental deletion)
- Calls the delete action on confirmation

### Step 7: Create Supabase admin client utility

Create `src/lib/supabase/admin.ts`:

- Exports `createAdminClient()` that uses the service role key
- Only importable in server-side code
- Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` (already available from Supabase project settings)

### Step 8: Build and verify

Run `npm run build` and `npm run lint`.

## Key Design Decisions

1. **URL-based search and filter state** — Search query, role filter, and page number are stored in URL params. This makes the user list linkable, supports browser back/forward, and avoids client-side state management.
2. **Supabase Admin API for account operations** — Deactivation (ban) and deletion require the Admin API with the service role key. The regular anon key client cannot perform these operations. The admin client is server-only and never exposed to browsers.
3. **Ban instead of soft-delete for deactivation** — Supabase's `ban_duration` is the built-in mechanism for disabling accounts. It prevents sign-in without removing data, and is easily reversible. No custom `is_active` column needed.
4. **Type-to-confirm deletion** — Requiring the display name to confirm deletion prevents accidental data loss. This is a common pattern for destructive admin actions.
5. **Self-protection** — Admins cannot delete or deactivate their own account from the admin interface. This prevents lockout scenarios.
