# Protected Routes for Authenticated Features

**Epic:** Authentication & User Accounts
**Type:** Feature
**Status:** Completed
**Branch:** `feature/protected-routes`
**Merge into:** `v1/main`

## Summary

Restrict access to authenticated-only pages so that unauthenticated users are redirected to sign in.

## Acceptance Criteria

- [x] Unauthenticated users are redirected to the sign-in page when accessing protected routes
- [x] Authenticated users can access all protected routes
- [x] Middleware or layout-level auth check handles protection consistently
- [x] Public pages (landing, color wheel browse) remain accessible without login
- [x] `npm run build` and `npm run lint` pass with no errors

## Key Files

| Action | File                            | Description                                    |
| ------ | ------------------------------- | ---------------------------------------------- |
| Modify | `src/middleware.ts`             | Add auth redirect for unauthenticated users    |
| Modify | `src/app/profile/setup/page.tsx`| Remove redundant page-level auth guard         |
| Modify | `src/app/profile/edit/page.tsx` | Remove redundant page-level auth guard         |

## Implementation Plan

> **Branch prefix:** `v1/feature/`

### 1. Update middleware to redirect unauthenticated users

**File:** `src/middleware.ts`

The middleware already skips public routes and passes unauthenticated users through without protection (line 50–52 has a placeholder comment). Update it to redirect unauthenticated users to `/sign-in`:

1. Add `'/'` to a new `PUBLIC_EXACT_ROUTES` array — the home page must be public but cannot use `startsWith('/')` since that matches all routes
2. Update the public route check to also match exact routes: `PUBLIC_EXACT_ROUTES.some(route => pathname === route)`
3. Replace the `if (!user) { return supabaseResponse }` block with a redirect to `/sign-in`, appending a `next` query parameter with the original pathname so the user can be redirected back after sign-in

```typescript
if (!user) {
  const url = request.nextUrl.clone()
  url.pathname = '/sign-in'
  url.searchParams.set('next', pathname)
  return NextResponse.redirect(url)
}
```

### 2. Remove redundant page-level auth guards

Now that middleware handles auth redirects consistently, remove the manual `if (!user) redirect('/sign-in')` checks from:

- **`src/app/profile/setup/page.tsx`** (lines 13–15) — remove the `redirect('/sign-in')` guard; `user` is guaranteed by middleware
- **`src/app/profile/edit/page.tsx`** (lines 13–15) — same removal

In both files, also remove the `redirect` import from `'next/navigation'` if it becomes unused (profile/setup still uses it for the `has_setup_profile` redirect, so keep it there).

### 3. Verify build and lint

Run `npm run build` and `npm run lint` to confirm no errors.

## Notes

- The middleware matcher already excludes static assets (`_next/static`, `_next/image`, `favicon.ico`, image files)
- Route protection and profile enforcement are handled in a single middleware pass to minimize overhead
- The `next` query parameter enables redirect-back-after-login (consuming it in the sign-in flow is out of scope for this feature but the parameter is set for future use)
- Public routes use prefix matching (`startsWith`) for auth pages and exact matching for `/` to avoid matching all routes
