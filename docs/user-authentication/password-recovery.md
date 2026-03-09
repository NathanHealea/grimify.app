# Password Recovery

**Epic:** User Authentication
**Type:** Feature
**Status:** Todo

## Summary

Add forgot password and reset password flows. Users can request a password reset link via email and set a new password via a secure token-based form.

## Acceptance Criteria

- [ ] Forgot password page at `/forgot-password` with email input
- [ ] Reset password page at `/reset-password` with new password and confirm password fields
- [ ] `requestPasswordReset` server action sends reset link via Supabase
- [ ] `updatePassword` server action sets new password after token verification
- [ ] Password reset link redirects through `/auth/confirm` to `/reset-password`
- [ ] Success message shown after requesting reset (generic — no email enumeration)
- [ ] Minimum 6-character password validation on reset form
- [ ] Password and confirm password must match
- [ ] After successful reset, user is signed out and redirected to sign-in with success message
- [ ] Link to forgot password from sign-in page

## Implementation Plan

### Step 1: Create forgot password page

**`src/app/(auth)/forgot-password/page.tsx`** — Simple form with email input. On submit, calls `requestPasswordReset` server action. Always shows success message regardless of whether the email exists (prevents enumeration).

### Step 2: Create reset password page

**`src/app/(auth)/reset-password/page.tsx`** — Form with two password fields. Validates minimum length and matching passwords. Calls `updatePassword` server action. On success, signs user out and redirects to `/sign-in?message=Password updated successfully`.

### Step 3: Add server actions

Add to **`src/app/(auth)/actions.ts`**:

- `requestPasswordReset(formData)` — Calls `supabase.auth.resetPasswordForEmail()` with redirect URL set to `/auth/confirm?next=/reset-password`
- `updatePassword(formData)` — Calls `supabase.auth.updateUser({ password })`, then `supabase.auth.signOut()`, then redirects

Reference: `grimdark.nathanhealea.com/src/app/(auth)/actions.ts`

### Step 4: Update auth confirm route

Ensure **`src/app/auth/confirm/route.ts`** handles the `type=recovery` token and redirects to the `next` URL param (i.e., `/reset-password`).

### Step 5: Customize recovery email template

Update `supabase/config.toml` or create `supabase/templates/recovery.html` with branded email template.

### Affected Files

| File | Changes |
|------|---------|
| `src/app/(auth)/forgot-password/page.tsx` | New — forgot password form |
| `src/app/(auth)/reset-password/page.tsx` | New — reset password form |
| `src/app/(auth)/actions.ts` | Add `requestPasswordReset`, `updatePassword` actions |
| `src/app/auth/confirm/route.ts` | Ensure recovery token handling works |
| `supabase/config.toml` | Custom recovery email template path |

### Risks & Considerations

- Password reset tokens are time-limited by Supabase (default 1 hour). Ensure the UX handles expired tokens gracefully.
- The reset password page must verify the user has a valid session (from the token) before allowing password change.
- Reference `grimdark.nathanhealea.com/src/app/(auth)/forgot-password/page.tsx` and `reset-password/page.tsx`.
