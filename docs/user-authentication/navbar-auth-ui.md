# Navbar Auth UI

**Epic:** User Authentication
**Type:** Feature
**Status:** Todo

## Summary

Update the existing navbar in `page.tsx` to show sign-in/sign-up buttons for unauthenticated users and a user menu dropdown for authenticated users. The user menu includes links to profile, edit profile, and sign out.

## Acceptance Criteria

- [ ] Unauthenticated users see "Sign In" and "Sign Up" buttons in the navbar
- [ ] Authenticated users see a user menu dropdown with their display name or avatar
- [ ] User menu includes: My Profile, Edit Profile, Sign Out
- [ ] Sign Out action signs the user out and redirects to home
- [ ] Navbar buttons use DaisyUI button styling consistent with the rest of the app
- [ ] Layout is responsive — works on both desktop and mobile

## Implementation Plan

### Step 1: Extract navbar into its own component

Currently the navbar is inline in `src/app/page.tsx` (lines 248-285). Extract it to **`src/components/Navbar.tsx`** so it can independently fetch auth state.

### Step 2: Fetch auth state in navbar

Use `getAuthUser({ withProfile: true })` to check if the user is authenticated. This requires the navbar to be a server component, or use a client-side hook that checks auth state.

Given the app is currently `"use client"`, consider:
- Option A: Make the navbar a server component and pass auth state down
- Option B: Create a `useAuth` hook using `@supabase/ssr` browser client

Reference: `grimdark.nathanhealea.com/src/components/navbar.tsx` uses server-side auth check.

### Step 3: Create user menu component

**`src/components/UserMenu.tsx`** — Dropdown menu using DaisyUI `dropdown` component or Headless UI `Menu`. Shows avatar/initials, display name, and menu items.

Reference: `grimdark.nathanhealea.com/src/components/user-menu.tsx`

### Step 4: Add auth buttons for unauthenticated state

When no user is authenticated, show:
- "Sign In" — DaisyUI `btn btn-ghost btn-sm` linking to `/sign-in`
- "Sign Up" — DaisyUI `btn btn-primary btn-sm` linking to `/sign-up`

### Step 5: Update page.tsx

Replace inline navbar with the new `<Navbar />` component. Pass necessary props or let it fetch auth state independently.

### Affected Files

| File | Changes |
|------|---------|
| `src/components/Navbar.tsx` | New — extracted navbar with auth UI |
| `src/components/UserMenu.tsx` | New — authenticated user dropdown menu |
| `src/app/page.tsx` | Remove inline navbar, use `<Navbar />` component |

### Risks & Considerations

- The current app is entirely `"use client"`. The navbar needs auth state which is best fetched server-side. This may require refactoring the layout to support a server component navbar above the client page.
- Consider moving the navbar to `src/app/layout.tsx` so it's rendered server-side, with the main page content remaining client-side.
