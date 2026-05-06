# Admin Management Toast Feedback

**Epic:** User Management
**Type:** Enhancement
**Status:** Completed
**Branch:** `enhancement/admin-toast`
**Merge into:** `v1/main`

## Summary

Admin tools (role management, user moderation, and admin collection management) currently surface server-action results through a mix of inline error spans, error banners, and — in two cases — silent success. Each surface uses its own ad-hoc `useState<string | null>` for the error string. This enhancement migrates all admin click-to-act flows to Sonner toasts, removing the inline error elements and the per-component error state.

This is the largest of the four toast-rollout docs by file count, but each surface follows the same shape: `useTransition` + a click handler that calls a server action. The migration is mechanical.

## Expected Behavior

For every action below, success fires `toast.success(...)` with a sentence describing the outcome (with the affected entity's name interpolated where available); failure fires `toast.error(result.error)`. The optimistic UI state (assigned roles list, banned/active state) continues to update only on success — exactly as today.

| Surface                               | Action                                                | Success toast                                                                  |
| ------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| `<DeactivateUserButton>`              | `deactivateUser(userId, banning)`                     | _"Deactivated '{displayName}'"_ / _"Reactivated '{displayName}'"_ |
| `<DeleteUserDialog>`                  | `deleteUser(userId)`                                  | _"Deleted user '{displayName}'"_                                                |
| `<AdminUserRolesEditor>` (assign)     | `assignRole(userId, roleId)`                          | _"Assigned '{roleName}'"_                                                       |
| `<AdminUserRolesEditor>` (revoke)     | `revokeRole(userId, roleId)`                          | _"Revoked '{roleName}'"_                                                        |
| `RoleRow` in `<RoleListTable>`        | `deleteRole(roleId)`                                  | _"Deleted role '{name}'"_                                                       |
| `<RoleDetailCard>` (rename)           | `updateRole(roleId, newName)`                         | _"Renamed role to '{newName}'"_                                                 |
| `UserRow` in `<RoleUsersTable>`       | `revokeRole(userId, roleId)`                          | _"Revoked role from '{displayName}'"_                                           |
| `<CreateRoleForm>`                    | `createRole(name)`                                    | _"Created role '{name}'"_                                                       |
| `<AssignRoleForm>`                    | `assignRole(userId, roleId)`                          | _"Assigned role to '{displayName}'"_                                            |
| `<AdminAddPaintForm>`                 | `addPaintToCollection(userId, paintId)`               | _"Added '{paintName}'"_                                                         |
| `<AdminCollectionPaintCard>`          | `removePaintFromCollection(userId, paintId)`          | _"Removed '{paintName}'"_                                                       |

## Acceptance Criteria

### Per-component changes

- [ ] `<DeactivateUserButton>` (`deactivate-user-button.tsx`) takes a new required `displayName: string` prop, removes the `error` `useState` and the `<p className="text-xs text-destructive">` block (lines 25, 57–59), and dispatches `toast.success` / `toast.error` from `handleClick`.
- [ ] `<DeleteUserDialog>` (`delete-user-dialog.tsx`) removes the `error` state (line 43) and the `<div className="rounded-lg ...">` error banner (lines 95–99), and dispatches `toast.success(\`Deleted user '${displayName}'\`)` after `handleClose()`. On error, the dialog stays open (`return` before `onDeleted/handleClose`) and the error is toasted.
- [ ] `<AdminUserRolesEditor>` (`admin-user-roles-editor.tsx`) removes the `error` state (line 37) and the `<p>` block (lines 138–140); both `handleAssign` and `handleRevoke` dispatch toasts. The toast message uses the `role.name` already in scope.
- [ ] `RoleRow` inside `<RoleListTable>` (`role-list-table.tsx`) removes the `error` state and the `<span>` (line 57, 93–95); `handleDelete` dispatches toasts. On error the toast shows the message and `confirming` resets to `false` (existing behavior preserved).
- [ ] `<RoleDetailCard>` (`role-detail-card.tsx`) keeps the `useActionState` shape unchanged but adds a `useEffect` keyed on `state` that fires `toast.error(state.error)` on failure and `toast.success(\`Renamed role to '...'\`)` on success. The inline `<p>` (lines 60–62) is removed. The success path requires capturing the submitted `newName` — see Implementation Step 5 for the pattern.
- [ ] `UserRow` inside `<RoleUsersTable>` (`role-users-table.tsx`) removes the `error` state and `<span>` (lines 83, 126–128); `handleRevoke` dispatches toasts using `user.display_name ?? 'user'`.
- [ ] `<CreateRoleForm>` (`create-role-form.tsx`) adds a `useEffect` keyed on `state` for `toast.error`, and dispatches `toast.success(\`Created role '${name}'\`)` from inside the wrapping action when `result.error` is absent. The inline `<p>` (lines 43–45) is removed.
- [ ] `<AssignRoleForm>` (`assign-role-form.tsx`) follows the same pattern as `<CreateRoleForm>`. The success toast uses the submitted user's display name — captured from `availableUsers` by id before calling `assignRole`. The inline `<p>` (lines 67–69) is removed.
- [ ] `<AdminAddPaintForm>` (`admin-add-paint-form.tsx`) removes the `addError` state (line 62) and the `<p>` (line 102); `handleSelect` dispatches `toast.success(\`Added '${paint.name}'\`)` and `toast.error(result.error)`.
- [ ] `<AdminCollectionPaintCard>` (`admin-collection-paint-card.tsx`) takes the existing `name` prop and uses it; `handleRemove` is updated to consume the action's return value and dispatch `toast.success(\`Removed '${name}'\`)` / `toast.error(result.error)`. (Today the action's return value is ignored — the call is silent. This change makes the action's `error` channel reachable from the UI.)

### Cross-cutting

- [ ] Each click-driven action's optimistic UI state (e.g. `assigned` in `<AdminUserRolesEditor>`, `addedIds` in `<AdminAddPaintForm>`, the `confirming` flag in `RoleRow`) updates only on the success branch — unchanged from today.
- [ ] No `useState<string | null>` named `error` (or similar) survives in any of the listed files. Field-level form validation that lives inside `<input>`'s sibling `<p>` (none of the admin surfaces have this) would be left alone — but every flagged span / banner above is for a top-level error and must be removed.
- [ ] `npm run build` and `npm run lint` pass with no errors.

## Out of Scope

- **Toggle-admin-role action** (`toggle-admin-role.ts`). Not currently invoked from any client surface; nothing to wire.
- **Bulk operations** (`bulkRemoveFromCollection`, etc.). Already covered by the existing `<BulkRemoveDialog>` patterns; out of scope here.
- **Field-level validation messages.** None of the admin surfaces have field-level errors (only top-level), so nothing needs to stay inline.
- **Toast collision suppression on rapid double-click.** Sonner stacks toasts by default; the same idempotent-action note from `collection-toast.md` applies. Defer to follow-up if reported.

## Key Files

| Action | File                                                                  | Description                                                                                  |
| ------ | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Modify | `src/modules/user/components/deactivate-user-button.tsx`              | Add `displayName` prop; replace inline error with toast.                                     |
| Modify | `src/modules/user/components/delete-user-dialog.tsx`                  | Replace inline error banner with toast; success toast on `onDeleted`.                        |
| Modify | `src/modules/user/components/admin-user-roles-editor.tsx`             | Replace inline error with toasts on both assign and revoke.                                  |
| Modify | `src/modules/admin/components/role-list-table.tsx`                    | Replace `RoleRow` inline error span with toast.                                              |
| Modify | `src/modules/admin/components/role-detail-card.tsx`                   | `useEffect` on `state` for toast; remove inline `<p>`. Capture submitted name for success.   |
| Modify | `src/modules/admin/components/role-users-table.tsx`                   | Replace `UserRow` inline error span with toast.                                              |
| Modify | `src/modules/admin/components/create-role-form.tsx`                   | `useEffect` on `state` for toast; remove inline `<p>`. Wrap action to capture name.          |
| Modify | `src/modules/admin/components/assign-role-form.tsx`                   | `useEffect` on `state` for toast; remove inline `<p>`. Resolve display name from id.         |
| Modify | `src/modules/admin/components/admin-add-paint-form.tsx`               | Replace `addError` with toast in `handleSelect`.                                             |
| Modify | `src/modules/admin/components/admin-collection-paint-card.tsx`        | Consume `removePaintFromCollection` result; toast both directions.                           |
| Modify | `src/app/admin/users/[userId]/page.tsx` (caller)                      | Pass `displayName` prop into `<DeactivateUserButton>`.                                       |

(Plus any other call sites of `<DeactivateUserButton>` — verify with `grep -rn 'DeactivateUserButton' src` before implementing.)

## Implementation

### Step 1 — Click-driven `useTransition` flows

Pattern for `<DeactivateUserButton>`, `<AdminUserRolesEditor>`, `RoleRow`, `UserRow`, `<AdminAddPaintForm>`, `<AdminCollectionPaintCard>`:

```tsx
import { toast } from 'sonner'

function handleClick() {
  startTransition(async () => {
    const result = await action(...)
    if (result.error) {
      toast.error(result.error)
      return
    }
    // optimistic state update (existing logic)
    toast.success(`...`)
  })
}
```

For each component:

- Capture the entity's display name (`displayName`, `role.name`, `user.display_name`, `paint.name`) from props or local scope **before** the toast call.
- Delete the `useState<string | null>` for `error` and its setter.
- Delete the `<p>` / `<span>` / `<div>` block that renders the error.

### Step 2 — `<DeactivateUserButton>` requires a new prop

Add `displayName: string` to the props. Update the caller (admin user edit page) to pass it. Verify with `grep -rn 'DeactivateUserButton' src`. The toast message branches on `isBanned`:

```tsx
toast.success(
  isBanned
    ? `Reactivated '${displayName}'`
    : `Deactivated '${displayName}'`,
)
```

### Step 3 — `<DeleteUserDialog>` interaction with `onClose`

The current flow on success: `onDeleted?.()` → `handleClose()`. The toast should fire **before** `handleClose()` so the dialog disappears and the toast appears in the same render frame:

```tsx
function handleConfirm() {
  startTransition(async () => {
    const result = await deleteUser(userId)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success(`Deleted user '${displayName}'`)
    onDeleted?.()
    handleClose()
  })
}
```

### Step 4 — `<AdminUserRolesEditor>` two-handler split

Both `handleAssign` and `handleRevoke` have access to the role object (via `allRoles.find(...)` in assign, via the row's `role.name` in revoke). Each gets its own toast call:

```tsx
// in handleAssign, after assignRole resolves without error
toast.success(`Assigned '${role.name}'`)

// in handleRevoke, fetch the role name for the toast
const role = assigned.find((r) => r.id === roleId)
// ... after success:
toast.success(`Revoked '${role?.name ?? 'role'}'`)
```

### Step 5 — `useActionState` flows: `<RoleDetailCard>`, `<CreateRoleForm>`, `<AssignRoleForm>`

These use `useActionState` rather than `useTransition`. Two design choices:

**(A) Wrap the action and toast inline** — call `toast.success` / `toast.error` from inside the action wrapper itself before returning state. Cleanest because the submitted form values are still in scope (the `formData`):

```tsx
const [state, formAction, isPending] = useActionState(
  async (_prev, formData: FormData) => {
    const name = formData.get('name') as string
    const validationError = validateRoleName(name)
    if (validationError) {
      toast.error(validationError)
      return { error: validationError }
    }
    const result = await createRole(name)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`Created role '${name}'`)
    }
    return result
  },
  {},
)
```

**(B) `useEffect` on `state`** — toast outside the action. Simpler but loses access to the submitted name on success unless the action returns it.

Use **(A)** for `<CreateRoleForm>`, `<AssignRoleForm>`, and `<RoleDetailCard>`. The inline `<p className="text-xs text-destructive">` block in each form is then redundant and is removed. The state object can shrink to `{}` after the change since neither error nor success need to survive into the rendered output.

For `<AssignRoleForm>`, resolve the user's display name before calling the action:

```tsx
const userId = formData.get('userId') as string
const user = availableUsers.find((u) => u.id === userId)
// ...
toast.success(`Assigned role to '${user?.display_name ?? 'user'}'`)
```

For `<RoleDetailCard>`, the success branch already calls `setEditing(false)`; toast right alongside it.

### Step 6 — `<AdminCollectionPaintCard>` consumes the action result

Today, `handleRemove` calls `removePaintFromCollection` and ignores the return value. Update to:

```tsx
function handleRemove() {
  startTransition(async () => {
    const result = await removePaintFromCollection(userId, id)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success(`Removed '${name}'`)
  })
}
```

The `result?.error` optional-chaining handles the case where the action returns `void` for success (verify the action's signature; if it always returns `{ error?: string }`, drop the `?`).

### Step 7 — Manual QA checklist

- Click "Deactivate account" → green toast _"Deactivated '{name}'"_; button flips to "Reactivate."
- Force a deactivate failure (e.g. revoke `auth.admin` permission in dev) → red toast.
- Open `<DeleteUserDialog>`, confirm name, click delete → green toast _"Deleted user '{name}'"_; dialog closes.
- Cause a delete failure → red toast; dialog stays open.
- In the user roles editor: assign a role → toast; revoke a role → toast.
- In the role list: try to delete a role → toast; trigger a constraint failure (delete a role with assigned users → caught by canDelete, not reachable; force a server error instead) → toast.
- Rename a role → toast on save success and on validation error.
- Create a new role → toast.
- Assign a user to a role from the role detail page → toast.
- Add a paint to a user's collection via admin picker → toast.
- Remove a paint from a user's collection via the ellipsis menu → toast.
- `npm run build` + `npm run lint`.

## Risks & Considerations

- **Migrating `<AdminCollectionPaintCard>` from silent to verbose.** Today, errors are swallowed entirely. This change surfaces errors as red toasts for the first time. If the action has a known noisy failure path (e.g. row already deleted by another tab), the toast might confuse admins. Verify the action's error contract before implementing — if it returns `error: 'Not found'` for already-removed rows, prefer to swallow that specific case and only toast genuine failures.
- **`<DeactivateUserButton>` prop signature change.** Adding required `displayName` is a breaking change. Verify all call sites and update them in the same commit to avoid intermediate-broken-build risk.
- **Toast inside `useActionState` action wrapper.** Pattern (A) calls `toast.*` from inside an async action body. Sonner is client-side, and the wrapper runs on the client (these are `'use client'` components), so the call is safe. The toast fires before the component re-renders with the new state, which is the desired ordering.
- **Idempotent role assign/revoke.** Like the collection toggle: the action returns success even when the role is already assigned/revoked. Toast says _"Assigned"_ in that case. Acceptable because the UI never offers the "Assign" affordance for already-assigned roles (`unassigned` filter handles this).
- **Two adjacent `useState` calls collapsed into none.** Each component currently has at least one `error` state; removing it shrinks the component slightly. Watch for any other reads of that state when removing — most of these components only render the state in the JSX that gets deleted.

## Notes

- Sonner is already installed (`package.json`) and `<Toaster />` is mounted at `src/app/layout.tsx:21`.
- This doc and [`profile-toast.md`](./07-profile-toast.md) are independent — they touch disjoint files. Either can ship first.
- The `<DeleteUserDialog>` success path crosses a route boundary (`onDeleted` typically navigates away). The toast fires *before* navigation, so the destination page sees the toast already in the queue — consistent with how Sonner is used elsewhere.
