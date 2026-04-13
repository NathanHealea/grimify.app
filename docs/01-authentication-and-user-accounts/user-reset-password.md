# User Password Reset and Change

**Epic:** Authentication & User Accounts
**Type:** Feature
**Status:** Completed

## Summary

Add two password flows: (1) a "forgot password" flow from the sign-in page that sends a reset email, and (2) an in-app "change password" option on the profile edit page. Both use Supabase Auth's built-in password reset methods with the PKCE flow for SSR compatibility.

## Acceptance Criteria

- [x] Sign-in page displays a "Forgot your password?" link below the password field
- [x] Forgot password page (`/forgot-password`) accepts an email and sends a reset link
- [x] Clicking the email link lands on a reset password page (`/reset-password`) where the user enters a new password
- [x] After resetting, the user is redirected to the sign-in page with a success message
- [x] Profile edit page displays a "Change Password" section for email-authenticated users
- [x] OAuth-only users do not see the "Change Password" section
- [x] Password change requires a minimum of 6 characters
- [x] Error states are handled: invalid/expired token, mismatched passwords, rate limiting
- [x] `npm run build` and `npm run lint` pass with no errors

## Routes

| Route              | Description                                              |
| ------------------ | -------------------------------------------------------- |
| `/forgot-password` | Public page — email input to request password reset      |
| `/reset-password`  | Public page — new password form after email verification |
| `/auth/confirm`    | API route — exchanges token hash for session (PKCE flow) |
| `/profile/edit`    | Existing — add "Change Password" section                 |

## Key Files

| Action | File                                         | Description                                                   |
| ------ | -------------------------------------------- | ------------------------------------------------------------- |
| Modify | `src/app/(auth)/sign-in/page.tsx`            | Add "Forgot your password?" link                              |
| Create | `src/app/(auth)/forgot-password/page.tsx`    | Email input form to request reset                             |
| Create | `src/app/(auth)/reset-password/page.tsx`     | New password form after token verification                    |
| Modify | `src/app/(auth)/actions.ts`                  | Add `requestPasswordReset` and `updatePassword` actions       |
| Create | `src/app/auth/confirm/route.ts`              | Token hash exchange endpoint for PKCE flow                    |
| Modify | `src/app/profile/edit/edit-profile-form.tsx` | Add "Change Password" section                                 |
| Create | `src/app/profile/edit/actions.ts`            | Add `changePassword` server action                            |
| Modify | `src/middleware.ts`                          | Add `/forgot-password` and `/reset-password` to PUBLIC_ROUTES |

## Implementation

### 1. Update middleware — add public routes

**File:** `src/middleware.ts`

Add `/forgot-password`, `/reset-password`, and `/auth/confirm` to the `PUBLIC_ROUTES` array so unauthenticated users can access the forgot/reset password flow and the PKCE token exchange endpoint.

```typescript
const PUBLIC_ROUTES = ['/sign-in', '/sign-up', '/auth/callback', '/auth/confirm', '/forgot-password', '/reset-password']
```

### 2. Create `/auth/confirm` route (PKCE token exchange)

**File:** `src/app/auth/confirm/route.ts` (new)

This is a separate route from the existing `/auth/callback` (which handles OAuth code exchange). The `/auth/confirm` route handles **token hash verification** for email-based flows like password reset.

**GET handler:**
1. Read `token_hash` and `type` query params from the URL.
2. Read optional `next` param (defaults to `/`).
3. Call `supabase.auth.verifyOtp({ token_hash, type })` to verify the token.
4. On success: redirect to `next`.
5. On failure: redirect to `/sign-in` with error query param.

The `type` param will be `recovery` for password reset flows. Supabase emails embed the `token_hash` and `type` in the confirmation URL automatically.

### 3. Create `requestPasswordReset` server action

**File:** `src/modules/auth/actions/request-password-reset.ts` (new)

Server action following the existing pattern (returns `AuthState`):
1. Extract `email` from `FormData`.
2. Call `supabase.auth.resetPasswordForEmail(email, { redirectTo: '{origin}/auth/confirm?next=/reset-password' })`.
   - Use `headers().get('origin') ?? getSiteUrl()` for the origin, matching the `signUp` action pattern.
   - The `redirectTo` sends the user through `/auth/confirm` which verifies the token, establishes the session, and then redirects to `/reset-password`.
3. **Always return `{ success: '...' }`** regardless of whether the email exists — prevents email enumeration.

### 4. Create forgot password page

**Route page:** `src/app/(auth)/forgot-password/page.tsx` (new)

Server component page inside the `(auth)` layout group (centered card layout). Structure:
- `<Card>` with title "Forgot your password?" and description text.
- `<CardContent>` renders `<ForgotPasswordForm />`.
- `<CardFooter>` with "Back to sign in" link to `/sign-in`.

**Form component:** `src/modules/auth/components/forgot-password-form.tsx` (new)

Client component using `useActionState(requestPasswordReset, null)`:
- Single email input field.
- Submit button ("Send reset link" / "Sending...").
- Success alert (green) and error alert (destructive) from `state`.
- Follows the exact same pattern as `SignUpForm` — same alert markup, same `form-item` structure.

### 5. Create `updatePassword` server action

**File:** `src/modules/auth/actions/update-password.ts` (new)

Server action that returns `AuthState`:
1. Extract `password` and `confirmPassword` from `FormData`.
2. Validate passwords match — return `{ error: 'Passwords do not match.' }` if mismatched.
3. Validate minimum length (6 characters) — return `{ error: 'Password must be at least 6 characters.' }` if too short.
4. Call `supabase.auth.updateUser({ password })`.
5. On error: return `{ error: error.message }`.
6. On success: call `supabase.auth.signOut()` to force re-login with the new password.
7. Redirect to `/sign-in?message=Password updated successfully. Please sign in with your new password.`

### 6. Create reset password page

**Route page:** `src/app/(auth)/reset-password/page.tsx` (new)

Server component page inside the `(auth)` layout group. Structure:
- `<Card>` with title "Reset your password" and description text.
- `<CardContent>` renders `<ResetPasswordForm />`.
- `<CardFooter>` with "Back to sign in" link to `/sign-in`.

**Form component:** `src/modules/auth/components/reset-password-form.tsx` (new)

Client component using `useActionState(updatePassword, null)`:
- Two password fields: "New password" (minLength 6) and "Confirm password".
- Submit button ("Reset password" / "Resetting...").
- Error alert from `state`.
- Same form patterns as existing auth forms.

### 7. Add "Forgot your password?" link to sign-in form

**File:** `src/modules/auth/components/sign-in-form.tsx` (modify)

Add a `Link` to `/forgot-password` between the password field and the submit button:

```tsx
<div className="flex justify-end">
  <Link href="/forgot-password" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
    Forgot your password?
  </Link>
</div>
```

**File:** `src/app/(auth)/sign-in/page.tsx` (modify)

Handle `?message=` query param to display a success message after password reset. The page receives `searchParams` and conditionally renders a success alert above the form.

### 8. Create `changePassword` server action

**File:** `src/modules/user/actions/change-password.ts` (new)

Server action co-located with the user module (not auth module, since it's a profile operation):
1. Extract `password` and `confirmPassword` from `FormData`.
2. Validate passwords match and minimum length (same rules as `updatePassword`).
3. Call `supabase.auth.updateUser({ password })`.
4. On error: return `{ error: error.message }`.
5. On success: return `{ success: 'Password changed successfully.' }`.
6. **Does not sign out** — the user is already authenticated and stays logged in.

Return type: `AuthState` (reuse from auth module — it already has `error` and `success` fields).

### 9. Create profile edit page with "Change Password" section

**Route page:** `src/app/profile/edit/page.tsx` (new)

Server component that:
1. Fetches the current user via `supabase.auth.getUser()`.
2. Redirects to `/sign-in` if no user.
3. Checks `user.identities` for an `email` provider entry to determine if the user has a password-based account.
4. Renders a page with a "Change Password" section (only if `hasEmailIdentity` is true).
5. If the user is OAuth-only, this section is not rendered.

**Form component:** `src/modules/user/components/change-password-form.tsx` (new)

Client component using `useActionState(changePassword, null)`:
- Two password fields: "New password" (minLength 6) and "Confirm password".
- Submit button ("Change password" / "Changing...").
- Success alert (green) and error alert (destructive) from `state`.
- Same form patterns as other auth forms.

The profile edit page currently does not exist — only `/profile/setup` exists. This step creates it with just the change password section. Other profile edit features (display name, avatar, bio) are out of scope.

### Affected Files

| Action | File | Changes |
| ------ | ---- | ------- |
| Modify | `src/middleware.ts` | Add `/forgot-password`, `/reset-password`, `/auth/confirm` to `PUBLIC_ROUTES` |
| Create | `src/app/auth/confirm/route.ts` | PKCE token hash verification endpoint |
| Create | `src/modules/auth/actions/request-password-reset.ts` | `requestPasswordReset` server action |
| Create | `src/app/(auth)/forgot-password/page.tsx` | Forgot password route page |
| Create | `src/modules/auth/components/forgot-password-form.tsx` | Email input form component |
| Create | `src/modules/auth/actions/update-password.ts` | `updatePassword` server action |
| Create | `src/app/(auth)/reset-password/page.tsx` | Reset password route page |
| Create | `src/modules/auth/components/reset-password-form.tsx` | New password + confirm form component |
| Modify | `src/modules/auth/components/sign-in-form.tsx` | Add "Forgot your password?" link |
| Modify | `src/app/(auth)/sign-in/page.tsx` | Handle `?message=` query param for success feedback |
| Create | `src/modules/user/actions/change-password.ts` | `changePassword` server action (profile context) |
| Create | `src/app/profile/edit/page.tsx` | Profile edit page with change password section |
| Create | `src/modules/user/components/change-password-form.tsx` | Change password form component |

### Risks & Considerations

- **Token expiry**: Supabase recovery tokens expire (default 1 hour). The reset password page should handle the case where the user's session from token verification has expired — `updateUser` will fail, and the error message should guide them to request a new link.
- **PKCE flow ordering**: The `/auth/confirm` route must verify the OTP first, which establishes a session, before redirecting to `/reset-password`. The `updatePassword` action then works because the user has an active session from the verified token.
- **Email enumeration**: The `requestPasswordReset` action must always return the same success message regardless of whether the email is registered.
- **OAuth-only users**: The profile edit page must check `user.identities` server-side to determine if the change password section should render. OAuth-only users (Google/Discord) have no password to change.
- **Profile edit page scope**: This feature creates `src/app/profile/edit/page.tsx` with only the change password section. Future features (edit display name, avatar, bio) will extend this page.

## Key Design Decisions

1. **PKCE flow** — Required for SSR via `@supabase/ssr`. Separate from the existing `/auth/callback` OAuth route.
2. **Always show success on forgot password** — Prevents email enumeration attacks.
3. **Sign out after password reset** — Forces login with new password to confirm it works.
4. **OAuth users cannot change password** — "Change Password" section hidden for OAuth-only users.
5. **Separate actions file for profile edit** — Co-located with the profile edit page, not in `(auth)/actions.ts`.

## Notes

- Local Supabase Inbucket email server at `127.0.0.1:54324` can be used to test reset emails during development.
- Rate limiting is configured in Supabase to prevent spam of reset emails.
