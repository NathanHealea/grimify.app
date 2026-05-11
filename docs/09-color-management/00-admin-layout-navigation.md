# Admin Layout & Navigation

**Epic:** Color Management
**Type:** Feature
**Status:** Todo
**Branch:** `feature/admin-layout-navigation`
**Merge into:** `main`

## Summary

Create the admin shell that all admin pages live inside: a layout with sidebar navigation, a dashboard landing page, and role-protected access. The middleware already redirects non-admins from `/admin` routes, but this feature adds the visual layout, navigation structure, and a dashboard page that serves as the admin entry point.

## Acceptance Criteria

- [ ] An admin layout at `src/app/admin/layout.tsx` wraps all `/admin/*` routes with a sidebar navigation and content area
- [ ] The sidebar navigation includes links to: Dashboard, Brands, Hues, Paints
- [ ] An admin dashboard page at `src/app/admin/page.tsx` displays summary counts (total brands, total hues, total paints)
- [ ] The admin layout visually distinguishes itself from the public layout (e.g., different background, admin badge/indicator)
- [ ] Navigation highlights the active section
- [ ] The layout is responsive (sidebar collapses on small screens)
- [ ] `npm run build` and `npm run lint` pass with no errors

## Implementation Plan

### Step 1: Create the admin layout

Create `src/app/admin/layout.tsx` as a server component that:

1. Renders a two-column layout: fixed sidebar (left) + scrollable content area (right)
2. The sidebar contains:
   - An "Admin" heading or badge at the top
   - Navigation links using Next.js `Link` components:
     - Dashboard → `/admin`
     - Brands → `/admin/brands`
     - Hues → `/admin/hues`
     - Paints → `/admin/paints`
3. The content area renders `{children}`
4. Uses Tailwind classes for layout (no new CSS files needed for MVP)

The middleware at `src/middleware.ts` already protects `/admin` routes — no additional auth check is needed in the layout.

#### Affected Files

| File | Changes |
|------|---------|
| `src/app/admin/layout.tsx` | **New** — Admin layout with sidebar navigation |

### Step 2: Create the admin navigation component

Create `src/modules/admin/components/admin-nav.tsx` as a client component that:

1. Accepts the current pathname (via `usePathname()`)
2. Renders the navigation links with active state highlighting
3. Uses `Link` from `next/link`
4. Highlights the active link by matching the pathname prefix (e.g., `/admin/brands` highlights "Brands" for any `/admin/brands/*` route)

#### Affected Files

| File | Changes |
|------|---------|
| `src/modules/admin/components/admin-nav.tsx` | **New** — Client component for admin sidebar navigation |

### Step 3: Create the admin dashboard page

Create `src/app/admin/page.tsx` as a server component that:

1. Fetches summary counts using existing services:
   - Total brands: `getAllBrands()` → count the array length
   - Total paints: `getTotalPaintCount()`
   - Total hues: `getHues()` → count the array length
2. Displays counts in a grid of summary cards
3. Each card links to its management section

#### Affected Files

| File | Changes |
|------|---------|
| `src/app/admin/page.tsx` | **New** — Admin dashboard with entity counts |

### Step 4: Add admin CSS styles (if needed)

If distinct admin styling is needed beyond Tailwind utilities, create a minimal CSS file. Otherwise, use inline Tailwind classes in the layout and components.

#### Affected Files

| File | Changes |
|------|---------|
| `src/styles/admin.css` | **New** (optional) — Admin-specific styles |

### Risks & Considerations

- **No existing admin pages** — This is the first admin feature, so patterns established here will be followed by subsequent features. Keep it simple and conventional.
- **Middleware already protects `/admin`** — No need to duplicate auth checks in the layout, but the layout could optionally display the admin user's name/role for context.
- **Responsive design** — The sidebar should collapse to a hamburger or top nav on mobile. Consider using a simple CSS-only approach (hidden on small screens, toggle via state) to avoid over-engineering.
- **Navigation structure may grow** — Design the nav component to accept a list of items so new sections can be added without modifying the component itself.
