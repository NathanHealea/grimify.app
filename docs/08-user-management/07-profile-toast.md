# Profile Form Toast Feedback

**Epic:** User Management
**Type:** Enhancement
**Status:** Todo
**Branch:** `enhancement/profile-toast`
**Merge into:** `v1/main`

## Summary

The two profile-edit forms — the user-facing `<ProfileForm>` (used at first-login setup and on `/profile`) and the admin-facing `<AdminEditProfileForm>` — currently show top-level server errors as a destructive banner above the fields, while keeping field-level validation messages inline beneath each input. The banner pattern is the same one used by the auth forms (covered by [`auth-toast.md`](../01-authentication-and-user-accounts/08-auth-toast.md)) and suffers from the same drawbacks: layout jump, persistent banner state, and inconsistency with the rest of the app's toast feedback.

This enhancement migrates the **top-level error** in both forms to a Sonner toast. **Field-level errors stay inline** — they're attached to specific inputs and need to live next to them, not in a global toast.

## Expected Behavior

1. Saving `<ProfileForm>` with a valid name → action redirects to the next page; no toast (the redirect itself is the success signal, matching the existing behavior).
2. Saving `<ProfileForm>` with a server-side error (e.g. duplicate name not caught by the unique-name lookup) → red toast with the error message; no top-level banner.
3. A field-level validation error (e.g. invalid characters caught server-side) continues to show inline beneath the `Display name` input.
4. The client-side validation message (`clientError`) continues to render inline — it's a pre-action validation and never goes through the action.
5. Saving `<AdminEditProfileForm>` with a valid edit → the action redirects (or revalidates) per current behavior; no success toast required.
6. Saving `<AdminEditProfileForm>` with a top-level error → red toast.
7. Per-field errors (`state.errors.display_name`, `state.errors.bio`) continue to render beneath each input.

## Acceptance Criteria

- [ ] `<ProfileForm>` (`src/modules/user/components/profile-form.tsx`) removes the top-level `state?.error` banner block (lines 55–59) and instead calls `toast.error(state.error)` from a `useEffect` keyed on `state`.
- [ ] `<ProfileForm>` keeps the inline `clientError || state?.errors?.display_name` rendering beneath the input unchanged (lines 74–82).
- [ ] `<AdminEditProfileForm>` (`src/modules/user/components/admin-edit-profile-form.tsx`) removes the top-level `state?.error` banner block (lines 42–46) and dispatches `toast.error(state.error)` from a `useEffect`.
- [ ] `<AdminEditProfileForm>` keeps the per-field `<p className="text-xs text-destructive">` blocks for `display_name` and `bio` unchanged.
- [ ] Submitting either form with both a top-level error AND a field error fires a single toast (for the top-level message) AND renders the field error inline — never both as toasts.
- [ ] `npm run build` and `npm run lint` pass with no errors.

## Out of Scope

- **Success toasts.** Both actions redirect on success (`<ProfileForm>` → next-page after first-login or back to `/profile`; `<AdminEditProfileForm>` → `/admin/users` or revalidates the current page). Surfacing a success toast across a redirect would require a query-param shim or a flash-message helper. Defer to a future enhancement if the redirect target ever becomes ambiguous.
- **Field-level errors as toasts.** Field errors must stay inline — they're spatially associated with the input that triggered them.
- **Migrating the `nameAlreadyTaken` amber notice** in `<ProfileForm>` (lines 76–79). It's an informational pre-fill warning, not a submission error.
- **OAuth profile-setup redirect handling.** Tracked separately in [`06-oauth-profile-setup-redirect.md`](../01-authentication-and-user-accounts/06-oauth-profile-setup-redirect.md).

## Key Files

| Action | File                                                          | Description                                                                                  |
| ------ | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Modify | `src/modules/user/components/profile-form.tsx`                | Remove top-level `state?.error` banner; wire `useEffect` → `toast.error(state.error)`.       |
| Modify | `src/modules/user/components/admin-edit-profile-form.tsx`     | Remove top-level `state?.error` banner; wire `useEffect` → `toast.error(state.error)`.       |

## Implementation

### Step 1 — `<ProfileForm>`

In `src/modules/user/components/profile-form.tsx`:

1. Add `useEffect` to the React import: `import { type SubmitEvent, useActionState, useEffect, useState } from 'react'`.
2. Add `import { toast } from 'sonner'`.
3. After the `useActionState` call (after line 36), insert:

   ```tsx
   useEffect(() => {
     if (state?.error) toast.error(state.error)
   }, [state])
   ```

4. Delete lines 55–59 (the `{state?.error && (...)}` block).

The `useEffect` dependency on `state` ensures the toast fires once per submission. The `state?.error` check naturally guards both the initial `null` state and the field-error-only states (which set `state.errors` but not `state.error`).

### Step 2 — `<AdminEditProfileForm>`

In `src/modules/user/components/admin-edit-profile-form.tsx`:

1. Add `useEffect` to the React import: `import { useActionState, useEffect } from 'react'`.
2. Add `import { toast } from 'sonner'`.
3. After the `useActionState` call (after line 38), insert the same effect.
4. Delete lines 42–46 (the `{state?.error && (...)}` block).

### Step 3 — Manual QA checklist

- Submit `<ProfileForm>` with a valid name (first-login flow) → redirected; no toast.
- Submit `<ProfileForm>` with an invalid character (e.g. a space) → inline field error beneath input; no toast.
- Force a top-level `state.error` (e.g. revoke a Supabase RLS policy in dev) → red toast; no banner.
- Submit `<AdminEditProfileForm>` with valid changes → revalidates / redirects; no toast.
- Submit with an empty display name → inline field error.
- Submit with an unauthorized session (e.g. demote yourself out of admin between page load and submit) → red toast for the top-level error.
- `npm run build` + `npm run lint`.

## Risks & Considerations

- **`state.errors` plus `state.error` together.** The action *could* return both a top-level error and field errors in the same submission (e.g. _"Could not save"_ as the top-level message plus a field error). In that case the toast fires for the top-level message and the field error renders inline — that's the intended split.
- **`useEffect` re-firing on irrelevant re-renders.** The dependency array uses the whole `state` reference, which `useActionState` only changes on action settlement. Re-renders driven by other state (`clientError` in `<ProfileForm>`) keep the same `state` reference, so the effect doesn't refire.
- **Initial render.** `state` starts as `null`, so `state?.error` is undefined and the effect is a no-op. No toast fires on mount.
- **Accessibility.** Sonner's built-in live region announces the toast, which preserves the announcement semantics the inline banner had (none — the banner had no `aria-live`).

## Notes

- This doc shares the toast-effect pattern with [`auth-toast.md`](../01-authentication-and-user-accounts/08-auth-toast.md). The two enhancements can ship in either order; they don't share files.
- `<ProfileForm>` and `<AdminEditProfileForm>` use different state types (`ProfileFormState` and `AdminEditProfileState`), but both expose `error?: string` and `errors?: { …field…: string }` shapes, so the same `useEffect` body works for both.
- No new types, no new dependencies. Sonner is already mounted at `src/app/layout.tsx:21`.
