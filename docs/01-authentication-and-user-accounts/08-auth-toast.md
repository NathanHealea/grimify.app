# Auth & Account Toast Feedback

**Epic:** Authentication & User Accounts
**Type:** Enhancement
**Status:** Todo
**Branch:** `enhancement/auth-toast`
**Merge into:** `v1/main`

## Summary

The five auth-related forms — sign-in, sign-up, forgot-password, reset-password, and change-password — currently surface success and error feedback via inline banners rendered above the form fields. The destructive banner (`<div className="rounded-lg border border-destructive/20 bg-destructive/10 ...">`) and the green success banner (`<div className="rounded-lg border border-green-200 bg-green-50 ...">`) work, but they:

1. Push the form layout down on every error/success, causing a visual jump.
2. Persist on the page until the next submission, even after the user has read them.
3. Are inconsistent with the toast feedback already wired up for collection and palette flows (`add-to-palette` success, `prevent-duplicate-paint-add`, and the in-progress `collection-toast` enhancement).

This enhancement migrates the five auth forms to Sonner toasts, removing the inline banners. The `<Toaster />` is already mounted at `src/app/layout.tsx:21` with `position="bottom-right" richColors closeButton theme="system"`, so no infrastructure changes are required.

## Expected Behavior

1. Submitting the **sign-in** form with invalid credentials shows a red toast with the server's error message; success redirects (no toast).
2. Submitting the **sign-up** form with a new email shows a green toast (e.g. _"Check your email to confirm your account"_); validation/duplicate errors show a red toast.
3. Submitting the **forgot-password** form shows a green toast on success and a red toast on error.
4. Submitting the **reset-password** form with an expired token or password mismatch shows a red toast; success redirects with `?message=...` (no toast — the redirect target handles the success message).
5. Submitting the **change-password** form on the profile edit page shows a green toast on success and a red toast on error.
6. The inline banner `<div>` blocks are removed in all five forms — the toast is the only feedback channel.
7. The form layout no longer jumps when feedback appears; the form remains visually static.

## Acceptance Criteria

- [ ] `<SignInForm>` (`src/modules/auth/components/sign-in-form.tsx`) removes the `state?.error` banner block (lines 23–27) and instead calls `toast.error(state.error)` from a `useEffect` keyed on `state`.
- [ ] `<SignUpForm>` (`src/modules/auth/components/sign-up-form.tsx`) removes both `state?.success` (lines 22–26) and `state?.error` (lines 27–31) banner blocks and dispatches `toast.success(state.success)` / `toast.error(state.error)` from a `useEffect`.
- [ ] `<ForgotPasswordForm>` (`src/modules/auth/components/forgot-password-form.tsx`) removes both banner blocks (lines 22–26 and 27–31) and dispatches the same way.
- [ ] `<ResetPasswordForm>` (`src/modules/auth/components/reset-password-form.tsx`) removes the `state?.error` banner block (lines 23–27) and dispatches `toast.error(state.error)` only — there is no success state in this form (success redirects).
- [ ] `<ChangePasswordForm>` (`src/modules/user/components/change-password-form.tsx`) removes both banner blocks (lines 23–27 and 28–32) and dispatches both toast variants.
- [ ] Each form's `useEffect` fires exactly once per submission — verified by triggering two consecutive failures and confirming two toasts (no duplicate stacking from re-renders).
- [ ] No banner divs remain in any of the five forms; no other layout changes are introduced.
- [ ] `npm run build` and `npm run lint` pass with no errors.

## Out of Scope

- **OAuth-redirect feedback** (`sign-in-with-google.ts`, `sign-in-with-discord.ts`). These actions either redirect to the provider or set a server-side error and redirect; they don't return inline state to a form, so toasts there require a different mechanism (e.g. reading a `?error=...` query param on the destination page). Out of scope here — track separately if needed.
- **The `?message=...` query-param success on reset-password.** The `update-password` action redirects to the sign-in page with a success message; surfacing that as a toast on the destination would require either a dedicated route handler or a client effect on the sign-in page that checks the search param. Out of scope.
- **Field-level validation errors** rendered next to specific inputs. None of the five forms currently render per-field errors; the `AuthState` type only has `error` and `success`. If a future change adds per-field errors, those should remain inline.
- **Theming/duration tweaks for Sonner.** Defaults already in place at the layout.

## Key Files

| Action | File                                                              | Description                                                                                              |
| ------ | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Modify | `src/modules/auth/components/sign-in-form.tsx`                    | Remove `state?.error` banner; wire `useEffect` → `toast.error`.                                          |
| Modify | `src/modules/auth/components/sign-up-form.tsx`                    | Remove both banners; wire `useEffect` → `toast.success` / `toast.error`.                                 |
| Modify | `src/modules/auth/components/forgot-password-form.tsx`            | Remove both banners; wire `useEffect` → `toast.success` / `toast.error`.                                 |
| Modify | `src/modules/auth/components/reset-password-form.tsx`             | Remove `state?.error` banner; wire `useEffect` → `toast.error`.                                          |
| Modify | `src/modules/user/components/change-password-form.tsx`            | Remove both banners; wire `useEffect` → `toast.success` / `toast.error`.                                 |

## Implementation

### Step 1 — Shared `useEffect` pattern

`useActionState` returns a fresh state object reference on every submission, so an effect keyed on `state` will fire exactly once per submission. The pattern, used in all five forms:

```tsx
import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'

// inside the component, after the useActionState call
useEffect(() => {
  if (!state) return
  if (state.error) {
    toast.error(state.error)
  } else if (state.success) {
    toast.success(state.success)
  }
}, [state])
```

`if (!state) return` guards the initial `null` state so no toast fires on mount. The branches are mutually exclusive — `AuthState` is `{ error?: string; success?: string } | null`, and each action only ever populates one field.

### Step 2 — `<SignInForm>`

In `src/modules/auth/components/sign-in-form.tsx`:

1. Add `useEffect` to the React import: `import { useActionState, useEffect } from 'react'`.
2. Add `import { toast } from 'sonner'`.
3. After the `useActionState` line, insert the effect (only the error branch is reachable here — successful sign-in redirects server-side).
4. Delete lines 23–27 (the `{state?.error && (...)}` block).

### Step 3 — `<SignUpForm>`, `<ForgotPasswordForm>`, `<ChangePasswordForm>`

These three follow the same shape: both `success` and `error` are returned to the form. For each:

1. Add `useEffect` to the React import and `toast` from sonner.
2. Insert the full effect with both branches.
3. Delete the two banner blocks.

For `<ChangePasswordForm>`, the `toast` import path is identical (`'sonner'`); no module-specific aliasing.

### Step 4 — `<ResetPasswordForm>`

Same as Step 2 — only the error branch is reachable. Successful password reset redirects to `/sign-in?message=...`, so no `success` field is set.

### Step 5 — Manual QA checklist

- Submit `<SignInForm>` with bad credentials → red toast, no banner, form does not jump.
- Submit `<SignInForm>` with good credentials → redirected to home; no toast (intended).
- Submit `<SignUpForm>` with a new email → green toast _"Check your email…"_; no banner.
- Submit `<SignUpForm>` with an already-used email → red toast.
- Submit `<ForgotPasswordForm>` with a valid email → green toast.
- Submit `<ForgotPasswordForm>` with an invalid email → red toast.
- Open a password reset link, mismatch the password fields → red toast.
- Submit `<ChangePasswordForm>` from the profile page → green toast on success; red toast on validation failure.
- Trigger two consecutive errors in a row in any form → two toasts, not one duplicated, not three stacked.
- `npm run build` + `npm run lint`.

## Risks & Considerations

- **`useActionState` returning the same reference twice.** In practice, Next.js's action-state mechanism produces a new object per submission, so the dependency on `state` retriggers the effect each time. The risk would be a server action that returns the exact same object reference (e.g. a memoized `null`) — none of the five auth actions do this; they return fresh objects via `{ error: ... }` or `{ success: ... }`. If an action ever did, the fix would be to key the effect on a monotonically increasing counter from `useActionState`'s pending-then-settled cycle.
- **Toast collision with the redirect on sign-in success.** Sign-in success calls `redirect('/')` server-side, so the form never re-renders with a success state — there is no race. The error path only re-renders on failure, when no redirect happens.
- **Forgot-password "success" really means "we sent an email."** The toast text should match what the action returns; if the action's message is _"If an account exists for that email, a reset link has been sent"_, that is the toast. We do not invent or override messages here — the toast is a pure presentational change.
- **Banner removal affects surrounding spacing.** The removed banners had `gap-4` siblings, so the rendered form will be slightly more compact. This is intentional and matches the goal of removing layout jump.
- **Accessibility.** Sonner toasts are announced via the library's built-in live region, replacing the implicit announcement of the inline `<div>` (which had no `aria-live`). Net accessibility is at least neutral and likely improved.

## Notes

- Sonner is already installed (`package.json`) and `<Toaster />` is mounted at `src/app/layout.tsx:21`. No infrastructure changes.
- This enhancement is a presentational refactor — the underlying server actions, the `AuthState` type, and the form data flow are unchanged.
- The `change-password` form lives in the `user` module, not `auth`, but is grouped with the auth forms in this doc because it consumes the same `AuthState` shape and the same banner pattern.
