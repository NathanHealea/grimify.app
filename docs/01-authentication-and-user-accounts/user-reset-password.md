# User Password Reset and Change

**Epic:** Authentication & User Accounts
**Type:** Feature
**Status:** Todo

## Summary

Add two password flows: (1) a "forgot password" flow from the sign-in page that sends a reset email, and (2) an in-app "change password" option on the profile edit page. Both use Supabase Auth's built-in password reset methods with the PKCE flow for SSR compatibility.

## Acceptance Criteria

- [ ] Sign-in page displays a "Forgot your password?" link below the password field
- [ ] Forgot password page (`/forgot-password`) accepts an email and sends a reset link
- [ ] Clicking the email link lands on a reset password page (`/reset-password`) where the user enters a new password
- [ ] After resetting, the user is redirected to the sign-in page with a success message
- [ ] Profile edit page displays a "Change Password" section for email-authenticated users
- [ ] OAuth-only users do not see the "Change Password" section
- [ ] Password change requires a minimum of 6 characters
- [ ] Error states are handled: invalid/expired token, mismatched passwords, rate limiting
- [ ] `npm run build` and `npm run lint` pass with no errors

## Routes

| Route | Description |
|---|---|
| `/forgot-password` | Public page — email input to request password reset |
| `/reset-password` | Public page — new password form after email verification |
| `/auth/confirm` | API route — exchanges token hash for session (PKCE flow) |
| `/profile/edit` | Existing — add "Change Password" section |

## Key Files

| Action | File | Description |
|---|---|---|
| Modify | `src/app/(auth)/sign-in/page.tsx` | Add "Forgot your password?" link |
| Create | `src/app/(auth)/forgot-password/page.tsx` | Email input form to request reset |
| Create | `src/app/(auth)/reset-password/page.tsx` | New password form after token verification |
| Modify | `src/app/(auth)/actions.ts` | Add `requestPasswordReset` and `updatePassword` actions |
| Create | `src/app/auth/confirm/route.ts` | Token hash exchange endpoint for PKCE flow |
| Modify | `src/app/profile/edit/edit-profile-form.tsx` | Add "Change Password" section |
| Create | `src/app/profile/edit/actions.ts` | Add `changePassword` server action |
| Modify | `src/middleware.ts` | Add `/forgot-password` and `/reset-password` to PUBLIC_ROUTES |

## Implementation

### 1. Create `/auth/confirm` route (PKCE token exchange)

`src/app/auth/confirm/route.ts` handles token hash verification — the recommended SSR approach from Supabase docs. Reads `token_hash` and `type` from URL params, calls `supabase.auth.verifyOtp()`, redirects to `next` param on success or `/sign-in` with error on failure.

### 2. Create forgot password page and server action

Page at `src/app/(auth)/forgot-password/page.tsx` with email input and `useActionState`. The `requestPasswordReset` action calls `supabase.auth.resetPasswordForEmail()`. Always shows a success message to prevent email enumeration.

### 3. Create reset password page and server action

Page at `src/app/(auth)/reset-password/page.tsx` with new password + confirm password fields. The `updatePassword` action validates passwords match, calls `supabase.auth.updateUser({ password })`, signs out, and redirects to sign-in.

### 4. Add "Forgot password?" link to sign-in page

Add a link between the password field and submit button. Handle `?message=` query param for post-reset success messages.

### 5. Add "Change Password" section to profile edit page

Only visible to email-authenticated users (check `user.identities` for email provider). Separate form with `changePassword` server action co-located at `src/app/profile/edit/actions.ts`.

### 6. Update middleware

Add `/forgot-password` and `/reset-password` to `PUBLIC_ROUTES`.

## Key Design Decisions

1. **PKCE flow** — Required for SSR via `@supabase/ssr`. Separate from the existing `/auth/callback` OAuth route.
2. **Always show success on forgot password** — Prevents email enumeration attacks.
3. **Sign out after password reset** — Forces login with new password to confirm it works.
4. **OAuth users cannot change password** — "Change Password" section hidden for OAuth-only users.
5. **Separate actions file for profile edit** — Co-located with the profile edit page, not in `(auth)/actions.ts`.

## Notes

- Local Supabase Inbucket email server at `127.0.0.1:54324` can be used to test reset emails during development.
- Rate limiting is configured in Supabase to prevent spam of reset emails.
