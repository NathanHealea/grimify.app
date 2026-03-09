# Email Authentication Pages

**Epic:** User Authentication
**Type:** Feature
**Status:** Todo

## Summary

Create sign-up and sign-in pages with email/password authentication using Supabase Auth. Includes server actions for form handling, email confirmation flow, and auth callback route.

## Acceptance Criteria

- [ ] Sign-up page at `/sign-up` with email and password fields
- [ ] Sign-in page at `/sign-in` with email and password fields
- [ ] Server actions for `signUp`, `signIn`, and `signOut` in `(auth)/actions.ts`
- [ ] Auth callback route at `/auth/callback` handles OAuth and PKCE code exchange
- [ ] Auth confirm route at `/auth/confirm` handles email confirmation links
- [ ] Email confirmation required for new sign-ups
- [ ] Error and success messages displayed on forms
- [ ] Minimum password length of 6 characters enforced
- [ ] Redirect to home page after successful sign-in
- [ ] Links between sign-up and sign-in pages

## Implementation Plan

### Step 1: Create auth route group

Create `src/app/(auth)/` route group for auth pages. This keeps auth pages in a separate layout without the main app chrome.

### Step 2: Create server actions

**`src/app/(auth)/actions.ts`** — Server actions using Supabase Auth API:
- `signUp(formData)` — `supabase.auth.signUp()` with email confirmation redirect
- `signIn(formData)` — `supabase.auth.signInWithPassword()`, redirect to `/`
- `signOut()` — `supabase.auth.signOut()`, revalidate path, redirect to `/`

Reference: `grimdark.nathanhealea.com/src/app/(auth)/actions.ts`

### Step 3: Create sign-up page

**`src/app/(auth)/sign-up/page.tsx`** — Form with email, password inputs. Uses `useActionState` for progressive enhancement. DaisyUI form styling. Success state shows "check your email" message.

### Step 4: Create sign-in page

**`src/app/(auth)/sign-in/page.tsx`** — Form with email, password inputs. Error display for invalid credentials. Links to sign-up and forgot-password pages.

### Step 5: Create auth API routes

**`src/app/auth/callback/route.ts`** — Handles OAuth redirects and PKCE code exchange.

**`src/app/auth/confirm/route.ts`** — Handles email confirmation token verification and password reset token verification.

### Step 6: Configure Supabase email templates

Update `supabase/config.toml` to customize confirmation email templates.

### Affected Files

| File | Changes |
|------|---------|
| `src/app/(auth)/actions.ts` | New — server actions for auth |
| `src/app/(auth)/sign-up/page.tsx` | New — sign-up form page |
| `src/app/(auth)/sign-in/page.tsx` | New — sign-in form page |
| `src/app/auth/callback/route.ts` | New — OAuth/PKCE callback handler |
| `src/app/auth/confirm/route.ts` | New — email confirmation handler |
| `supabase/config.toml` | Update auth email settings |

### Risks & Considerations

- Email confirmation requires a working SMTP setup in Supabase (built-in for hosted, configure for local dev).
- Forms use `useActionState` (React 19) — ensure the Next.js 16 version supports this pattern.
- Reference `grimdark.nathanhealea.com/src/app/(auth)/` for the exact form patterns and action signatures.
