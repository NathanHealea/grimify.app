# Admin Dashboard & Navigation

**Epic:** User Management
**Type:** Feature
**Status:** Done
**Branch:** `feature/admin-dashboard`
**Merge into:** `v1/main`

## Summary

Create the admin area foundation: a shared layout with sidebar navigation, a dashboard overview page with user and role statistics, and an admin link in the main navbar for users with the `admin` role. All subsequent admin features (role management, user management, profile editing, merging) live under this layout.

## Acceptance Criteria

- [x] An `/admin` route exists and displays a dashboard overview
- [x] The admin layout includes a sidebar with navigation links to all admin sections
- [x] The dashboard shows summary statistics: total users, users by role, recent sign-ups
- [x] Non-admin users are redirected away from `/admin` routes (existing middleware)
- [x] The main navbar shows an "Admin" link for users with the `admin` role
- [x] The admin layout is responsive (sidebar collapses on mobile)
- [x] `npm run build` and `npm run lint` pass with no errors

## Routes

| Route    | Description                                      |
| -------- | ------------------------------------------------ |
| `/admin` | Dashboard overview with user and role statistics |

## Key Files

| Action  | File                                             | Description                                      |
| ------- | ------------------------------------------------ | ------------------------------------------------ |
| Create  | `src/app/admin/layout.tsx`                       | Admin layout with sidebar navigation             |
| Replace | `src/app/admin/page.tsx`                         | Replace redirect with dashboard overview page    |
| Create  | `src/modules/admin/components/admin-sidebar.tsx` | Sidebar navigation component                    |
| Modify  | `src/components/navbar.tsx`                      | Add conditional admin link for admin users       |
| Create  | `src/styles/sidebar.css`                         | Sidebar component styles                        |
| Modify  | `src/app/globals.css`                            | Import sidebar styles                           |

### Existing admin files (from user-roles feature)

These files already exist and will continue working within the new layout:

| File                                                  | Description                                |
| ----------------------------------------------------- | ------------------------------------------ |
| `src/app/admin/users/page.tsx`                        | User management table with role toggles    |
| `src/modules/user/components/admin-users-table.tsx`   | Client component for user role management  |
| `src/modules/user/actions/toggle-admin-role.ts`       | Server action for granting/revoking roles  |
| `src/modules/user/types/user-with-roles.ts`           | UserWithRoles type                         |
| `src/modules/user/utils/roles.ts`                     | `getUserRoles()` and `hasRole()` utilities |

## Implementation

### Step 1: Create sidebar styles

Create `src/styles/sidebar.css` with daisyUI-style documentation header and classes:

```css
/*
 * Sidebar Component
 *
 * Based on the daisyUI Menu/Drawer pattern.
 * https://daisyui.com/components/menu/
 *
 * Implements a vertical navigation sidebar using this project's
 * Tailwind CSS theme tokens instead of daisyUI's built-in theme system.
 *
 * Classes:
 *   Base:    .sidebar            — Fixed-width vertical container with right border
 *   Nav:     .sidebar-nav        — Navigation list (vertical flex)
 *   Items:   .sidebar-item       — Navigation link (text + padding + hover)
 *            .sidebar-item-active — Active state (background highlight)
 *   Header:  .sidebar-header     — Section heading label
 *   Mobile:  .sidebar-overlay    — Backdrop overlay for mobile drawer
 *            .sidebar-toggle     — Hamburger button visible on mobile
 */
```

Classes to implement:
- `.sidebar` — `w-60` fixed width, full height, `border-r border-border`, `bg-background`, hidden on mobile (`hidden lg:flex flex-col`)
- `.sidebar-nav` — Vertical flex container with gap and padding
- `.sidebar-item` — Block link with `px-3 py-2 rounded-md text-sm`, hover state (`hover:bg-muted`), transition
- `.sidebar-item-active` — `bg-muted font-medium text-foreground`
- `.sidebar-header` — Uppercase label, `text-xs font-semibold text-muted-foreground`, with top padding for section grouping
- `.sidebar-overlay` — Fixed fullscreen backdrop for mobile, `bg-black/50`
- `.sidebar-toggle` — Button visible only on `lg:hidden`, positioned in the admin layout

Import in `globals.css` using `@import '../styles/sidebar.css' layer(components)`.

Commit: `feat(admin): add sidebar component styles`

### Step 2: Create admin sidebar component

Create `src/modules/admin/components/admin-sidebar.tsx`:

- **Client component** (needs `usePathname()` for active route highlighting)
- **Navigation links:**
  - Dashboard (`/admin`) — overview/stats page
  - Users (`/admin/users`) — existing user management page
- **Active state:** Compare `pathname` against each link's `href`. For `/admin` use exact match; for sub-routes use `startsWith`.
- **Mobile support:** Accept an `open` prop and `onClose` callback. On mobile, render as a fixed overlay sidebar with a backdrop. On desktop (`lg:` breakpoint), render inline. Use a `useState` toggle in the layout for mobile open/close.
- **Structure:**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/** Navigation items for the admin sidebar. */
const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/users', label: 'Users' },
]

/**
 * Admin sidebar navigation component.
 *
 * Renders a vertical nav with route-aware active highlighting.
 * On mobile, renders as an overlay drawer controlled by parent state.
 *
 * @param props.open - Whether the mobile drawer is open.
 * @param props.onClose - Callback to close the mobile drawer.
 */
export function AdminSidebar({ open, onClose }: { open?: boolean; onClose?: () => void })
```

Commit: `feat(admin): add admin sidebar navigation component`

### Step 3: Create admin layout

Create `src/app/admin/layout.tsx`:

- **Server component** that wraps all `/admin/*` pages
- Renders the sidebar on the left and a `<main>` content area on the right
- Includes a mobile sidebar toggle button (visible only on `lg:hidden`)
- Does NOT duplicate auth/role checks — middleware already handles this
- The layout needs a small client wrapper for mobile sidebar toggle state

**Structure:**

```tsx
import type { ReactNode } from 'react'
import { AdminSidebar } from '@/modules/admin/components/admin-sidebar'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <AdminSidebar />
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  )
}
```

For mobile toggle, either:
- (a) Create a thin `AdminLayoutClient` wrapper that manages the `open` state and passes it to `AdminSidebar`, or
- (b) Use a CSS-only approach where the sidebar is hidden on mobile and a toggle button shows/hides it

Option (a) is cleaner since the sidebar already accepts `open`/`onClose` props.

The existing `src/app/admin/users/page.tsx` will automatically render inside this layout — no changes needed to the users page. Its outer `<div className="mx-auto w-full max-w-4xl px-4 py-12">` provides its own content padding.

Commit: `feat(admin): add admin layout with sidebar`

### Step 4: Replace admin page with dashboard

Replace `src/app/admin/page.tsx` — currently a redirect to `/admin/users` — with a dashboard overview page.

**Data queries (server component):**

```ts
const supabase = await createClient()

// Total users
const { count: totalUsers } = await supabase
  .from('profiles')
  .select('id', { count: 'exact', head: true })

// Users with completed profile setup
const { count: setupComplete } = await supabase
  .from('profiles')
  .select('id', { count: 'exact', head: true })
  .eq('has_setup_profile', true)

// Admin count
const { count: adminCount } = await supabase
  .from('user_roles')
  .select('user_id', { count: 'exact', head: true })
  .eq('role_id', adminRoleId)  // look up admin role ID first

// Recent sign-ups (last 5)
const { data: recentUsers } = await supabase
  .from('profiles')
  .select('id, display_name, avatar_url, created_at')
  .order('created_at', { ascending: false })
  .limit(5)
```

**UI layout:**

- Heading: "Admin Dashboard" with description
- Stat cards row (using existing `Card` components): Total Users, Profile Setup Complete, Admins
- Recent sign-ups section: simple list with avatar, display name, and relative time

Commit: `feat(admin): add dashboard page with user statistics`

### Step 5: Add admin link to navbar

Modify `src/components/navbar.tsx`:

1. Import `getUserRoles` from `@/modules/user/utils/roles`.
2. After fetching the user profile, conditionally fetch roles:
   ```ts
   let isAdmin = false
   if (user) {
     const roles = await getUserRoles(user.id)
     isAdmin = roles.includes('admin')
   }
   ```
3. Render an "Admin" link before the `UserMenu` component when `isAdmin` is true:
   ```tsx
   {isAdmin && (
     <Link href="/admin" className="btn btn-ghost btn-sm">
       Admin
     </Link>
   )}
   ```

The roles query only runs for authenticated users. The navbar is a server component, so this is a server-side check — no client round trip.

Commit: `feat(admin): add conditional admin link to navbar`

### Step 6: Build and verify

1. Run `npm run build` and `npm run lint` to confirm no regressions.
2. Test scenarios:
   - Admin user sees "Admin" link in navbar
   - Non-admin user does not see "Admin" link
   - `/admin` shows the dashboard with statistics
   - `/admin/users` still works with role management table inside the new layout
   - Sidebar highlights the current route correctly
   - Mobile: sidebar is hidden by default and toggleable

## Key Design Decisions

1. **Server component layout** — The admin layout is a server component. Auth checks happen in middleware, not in the layout, to avoid duplicate queries.
2. **Sidebar navigation** — A sidebar (not tabs) because the admin area will grow with multiple sections. The sidebar provides persistent navigation context.
3. **Statistics via direct queries** — Dashboard stats use simple Supabase queries rather than materialized views or caching. For the expected user scale, this is sufficient.
4. **Conditional navbar link** — The admin link only appears for admin users. Non-admins never see it, and middleware blocks direct URL access.
