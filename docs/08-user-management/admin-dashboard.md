# Admin Dashboard & Navigation

**Epic:** User Management
**Type:** Feature
**Status:** Todo

## Summary

Create the admin area foundation: a shared layout with sidebar navigation, a dashboard overview page with user and role statistics, and an admin link in the main navbar for users with the `admin` role. All subsequent admin features (role management, user management, profile editing, merging) live under this layout.

## Acceptance Criteria

- [ ] An `/admin` route exists and displays a dashboard overview
- [ ] The admin layout includes a sidebar with navigation links to all admin sections
- [ ] The dashboard shows summary statistics: total users, users by role, recent sign-ups
- [ ] Non-admin users are redirected away from `/admin` routes (existing middleware)
- [ ] The main navbar shows an "Admin" link for users with the `admin` role
- [ ] The admin layout is responsive (sidebar collapses on mobile)
- [ ] `npm run build` and `npm run lint` pass with no errors

## Routes

| Route    | Description                                      |
| -------- | ------------------------------------------------ |
| `/admin` | Dashboard overview with user and role statistics |

## Key Files

| Action | File                                              | Description                                      |
| ------ | ------------------------------------------------- | ------------------------------------------------ |
| Create | `src/app/admin/layout.tsx`                        | Admin layout with sidebar navigation             |
| Create | `src/app/admin/page.tsx`                          | Dashboard overview page with statistics          |
| Create | `src/modules/admin/components/admin-sidebar.tsx`  | Sidebar navigation component                    |
| Modify | `src/components/navbar.tsx`                       | Add conditional admin link for admin users       |
| Create | `src/styles/sidebar.css`                          | Sidebar component styles                        |

## Implementation

### Step 1: Create admin module structure

Create the `src/modules/admin/` module directory with a `components/` subdirectory. This module owns all admin-specific components shared across admin pages.

### Step 2: Create sidebar styles

Create `src/styles/sidebar.css` with daisyUI-style classes for the admin sidebar:

- `.sidebar` — Base sidebar container (fixed width, full height, border-right)
- `.sidebar-nav` — Navigation list container
- `.sidebar-item` — Individual nav item
- `.sidebar-item-active` — Active state for current route
- `.sidebar-compact` — Collapsed state for mobile

Import in `globals.css` using `@import '...' layer(components)`.

### Step 3: Create admin sidebar component

Create `src/modules/admin/components/admin-sidebar.tsx`:

- Client component (needs `usePathname()` for active state)
- Navigation links: Dashboard (`/admin`), Roles (`/admin/roles`), Users (`/admin/users`)
- Uses `Link` from `next/link`
- Highlights the current route
- Collapsible on mobile (hamburger toggle or sheet)

### Step 4: Create admin layout

Create `src/app/admin/layout.tsx`:

- Server component that wraps all `/admin/*` pages
- Renders the sidebar and a main content area
- Layout structure: sidebar on the left, content on the right with padding
- Does NOT duplicate auth/role checks (middleware handles this)

```tsx
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <AdminSidebar />
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
```

### Step 5: Create dashboard page

Create `src/app/admin/page.tsx`:

- Server component that fetches statistics via Supabase queries
- Queries:
  - Total profiles count: `supabase.from('profiles').select('id', { count: 'exact', head: true })`
  - Profiles with setup complete: filter by `has_setup_profile = true`
  - Role breakdown: join `user_roles` with `roles` and group by role name
  - Recent sign-ups: `profiles` ordered by `created_at` DESC, limit 5
- Renders stat cards (total users, admins, recent sign-ups list)
- Uses existing card components for stat display

### Step 6: Add admin link to navbar

Modify `src/components/navbar.tsx`:

- After fetching the user, check if they have the admin role using `getUserRoles()` or a direct query
- If admin, render a link to `/admin` in the navbar (before the user menu)
- Only fetch roles when the user is authenticated (avoid unnecessary queries)

### Step 7: Build and verify

Run `npm run build` and `npm run lint` to confirm no errors.

## Key Design Decisions

1. **Server component layout** — The admin layout is a server component. Auth checks happen in middleware, not in the layout, to avoid duplicate queries.
2. **Sidebar navigation** — A sidebar (not tabs) because the admin area will grow with multiple sections. The sidebar provides persistent navigation context.
3. **Statistics via direct queries** — Dashboard stats use simple Supabase queries rather than materialized views or caching. For the expected user scale, this is sufficient.
4. **Conditional navbar link** — The admin link only appears for admin users. Non-admins never see it, and middleware blocks direct URL access.
