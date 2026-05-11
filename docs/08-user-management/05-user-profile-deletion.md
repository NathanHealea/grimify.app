# User Profile Deletion

**Epic:** User Management
**Type:** Feature
**Status:** Todo
**Branch:** `feature/user-profile-deletion`
**Merge into:** `main`

## Summary

Self-service account deletion for all users — accessible from the profile edit page. Regular users can delete their own account after confirming their intent; the account is permanently removed and they are signed out. Admin users are blocked from self-deletion and see clear guidance on what to do instead, preventing accidental admin lockout.

## Acceptance Criteria

- [ ] A "Danger Zone" section appears on `/profile/edit` with a "Delete Account" button
- [ ] Clicking "Delete Account" opens a confirmation dialog requiring the user to type their display name before the button activates
- [ ] On confirmation, the user's account is permanently deleted (cascades through `auth.users` → `profiles` → `user_roles`)
- [ ] After deletion, the user is signed out and redirected to the home page
- [ ] Admin users see the Danger Zone section but the delete button is disabled with a tooltip/alert explaining why
- [ ] The admin warning message provides actionable next steps (remove admin role, then return to delete)
- [ ] The `delete_own_account` Postgres RPC enforces the admin block at the database level, not just the UI
- [ ] `npm run build` and `npm run lint` pass with no errors

## Routes

| Route | Description |
|-------|-------------|
| `/profile/edit` | Existing page — receives a new "Danger Zone" card section |

## Key Files

| Action | File | Description |
|--------|------|-------------|
| Create | `supabase/migrations/YYYYMMDDHHMMSS_delete_own_account.sql` | RPC that deletes the caller's own `auth.users` row; blocks admins |
| Create | `src/modules/user/actions/delete-own-account.ts` | Server action wrapping the RPC; redirects to `/` after success |
| Create | `src/modules/user/components/delete-account-dialog.tsx` | Self-deletion confirmation dialog with type-to-confirm input |
| Modify | `src/app/profile/edit/page.tsx` | Fetch roles, render Danger Zone card (blocked state for admins) |

## Implementation

### Step 1: Create `delete_own_account` RPC

Create `supabase/migrations/YYYYMMDDHHMMSS_delete_own_account.sql`:

```sql
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  IF 'admin' = ANY(public.get_user_roles(auth.uid())) THEN
    RAISE EXCEPTION 'Admin accounts cannot be self-deleted. Remove your admin role first.';
  END IF;

  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;
```

- `SECURITY DEFINER` is required to delete from `auth.users` (RLS restricts direct access)
- Reuses the existing `public.get_user_roles()` helper for the admin check
- Cascade through `profiles` and `user_roles` is handled by the existing FK `ON DELETE CASCADE` constraints

Apply migration: `supabase db push` (local dev) or via Supabase dashboard.

### Step 2: Create server action `delete-own-account.ts`

Create `src/modules/user/actions/delete-own-account.ts`:

- `'use server'`
- Calls `supabase.rpc('delete_own_account')`
- On RPC error: return `{ error: error.message }`
- On success: call `supabase.auth.signOut()` then `redirect('/')`
- No `revalidatePath` needed — user no longer exists after success

The redirect must happen server-side so the deleted user's session cookie is cleared before the browser navigates away.

### Step 3: Create `delete-account-dialog.tsx`

Create `src/modules/user/components/delete-account-dialog.tsx`:

- Client component (`'use client'`)
- Props: `displayName: string`
- Internal state: `confirmValue: string`, `isPending: boolean` (via `useTransition`)
- Uses the existing native `<dialog>` pattern (same as `delete-user-dialog.tsx`)
- Layout:
  - Warning text: "This action is permanent and cannot be undone. Your account, profile, and all associated data will be deleted."
  - Text input: label `Type "{displayName}" to confirm`, `value={confirmValue}`, `onChange` updates state
  - "Delete My Account" button: disabled unless `confirmValue === displayName`, shows pending state while action runs
  - Cancel button: closes dialog, resets `confirmValue`
- On submit: calls `deleteOwnAccount()` action inside `startTransition`, shows inline error if `error` is returned

### Step 4: Update `/profile/edit` page

Modify `src/app/profile/edit/page.tsx`:

1. Fetch the current user's profile and roles alongside the existing `auth.getUser()` call:
   ```ts
   const { data: profile } = await supabase
     .from('profiles')
     .select('display_name')
     .eq('id', user.id)
     .single()

   const { data: userRoles } = await supabase
     .from('user_roles')
     .select('roles(name)')
     .eq('user_id', user.id)
   ```
2. Derive `isAdmin` from the roles array.
3. Add a "Danger Zone" `<Card>` below the existing password card:
   - Header: "Delete Account" / "Permanently delete your account and all associated data."
   - **If `isAdmin`**: Render an alert/callout inside the card explaining the block:
     - "Admin accounts cannot be self-deleted."
     - "To delete your account: remove your admin role via the [admin panel](/admin/roles), then return here."
     - Render a disabled "Delete Account" button.
   - **If not admin**: Render a `<DeleteAccountDialog displayName={profile.display_name ?? 'your account'} />` with its trigger button.

The `isAdmin` check is informational-only in the UI; the RPC enforces the real guard.

## Key Design Decisions

1. **Database-level admin guard** — The `delete_own_account` RPC blocks admin self-deletion server-side. The UI disabled state is a UX convenience, not the security boundary. This follows the same layered-defence pattern as `admin_delete_user`.

2. **Type-to-confirm with display name** — Matching the pattern established for the admin delete dialog. Requires the user to type their display name exactly, preventing accidental clicks on a destructive action.

3. **Server-side sign-out before redirect** — Calling `supabase.auth.signOut()` in the server action ensures the session cookie is invalidated at the same time the account is deleted. A client-side sign-out after a redirect could leave a window where the cookie is still valid.

4. **Actionable admin warning** — Instead of a dead-end error, admins see a direct link to the roles admin panel where they can remove their own admin role. Once the role is removed, they return to this page and the delete button becomes active.

5. **No soft-delete** — Account deletion is permanent and immediate. The `admin_delete_user` and `delete_own_account` RPCs both delete from `auth.users`, which cascades through `profiles` → `user_roles`. There is no deactivation or grace period for self-deletion.

## Risks & Considerations

- **Last admin lockout** — The current implementation blocks ALL admin self-deletion. If there is only one admin, they cannot delete their account unless another admin is created first. This is intentional — it prevents the application from becoming admin-less.
- **Display name fallback** — If `profile.display_name` is null (incomplete profile setup), the dialog falls back to `"your account"` for the confirmation prompt. The action still succeeds; only the UX label changes.
- **OAuth sessions** — Calling `supabase.auth.signOut()` invalidates the Supabase session but does not revoke the OAuth provider token (Google, Discord). The user remains logged into the provider; only the Grimify session is cleared.
