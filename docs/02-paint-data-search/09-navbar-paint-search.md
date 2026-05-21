# Navbar Paint Search Bar

**Epic:** Paint Data & Search
**Type:** Feature
**Status:** Todo
**Branch:** `feature/navbar-paint-search`
**Merge into:** `main`

## Summary

Add a compact search input to the desktop navbar that lets users type a query and navigate directly to `/paints?q=<value>`, landing on pre-filtered results. Visible only on the `lg` breakpoint and above; hidden on mobile (the mobile drawer already links to `/paints`).

## Acceptance Criteria

- [ ] A search input renders in the desktop navbar (`lg:flex`, hidden below `lg`)
- [ ] Submitting a non-empty query navigates to `/paints?q=<trimmed value>`
- [ ] Submitting an empty query navigates to `/paints` (no `q` param)
- [ ] Pressing Enter submits the form
- [ ] The search bar does not appear on mobile or tablet (below `lg` breakpoint)
- [ ] The input is styled consistently with the rest of the navbar (compact, proportional)
- [ ] No regressions to existing navbar links, auth section, or mobile menu

## Implementation Plan

### Target module

`src/modules/paints/` — the component is paint-search–specific and follows the domain module rule.

### Step 1 — Create `NavbarSearchBar` client component

**File:** `src/modules/paints/components/navbar-search-bar.tsx`

- `'use client'` directive.
- Renders a `<form>` element with an `onSubmit` handler.
- Inside the form, render the existing `SearchInput` (from `src/components/search.tsx`) with a compact placeholder ("Search paints...") and a constrained width (e.g. `w-56`).
- `onSubmit`: read the current input value, trim it, and call `router.push('/paints?q=<value>')` (or `router.push('/paints')` if empty). Call `e.preventDefault()`.
- Use `useRouter` from `'next/navigation'` for programmatic navigation.
- Accept an optional `className` prop forwarded to the wrapping `<form>`.
- JSDoc on the exported component per `CLAUDE.md` conventions.

### Step 2 — Update `Navbar` to render `NavbarSearchBar`

**File:** `src/components/navbar.tsx`

- Import `NavbarSearchBar` from `@/modules/paints/components/navbar-search-bar`.
- In the `navbar-center` div, change `justify-center` to `justify-between` so the nav links cluster left and the search bar sits on the right of the center section.
- Add `<NavbarSearchBar className="w-56" />` as the last child of `navbar-center`.

Before (conceptual):
```
navbar-center: [Paints] [Brands] [Palettes] [Recipes]   (centered)
```
After:
```
navbar-center: [Paints] [Brands] [Palettes] [Recipes] ——— [Search paints...]
```

The `navbar-center` div already has `hidden lg:flex` visibility, so the search bar inherits desktop-only display for free.

### Affected Files

| File | Changes |
|------|---------|
| `src/modules/paints/components/navbar-search-bar.tsx` | New — client component with form submit → router.push |
| `src/components/navbar.tsx` | Import `NavbarSearchBar`; add to `navbar-center`; change `justify-center` → `justify-between` |

### Risks & Considerations

- `SearchInput` (`src/components/search.tsx`) manages its own internal value state. The `NavbarSearchBar` wraps it in a form and reads the submitted value via `FormData` or a controlled `useState` — use `FormData` (via `e.currentTarget`) to avoid adding a controlled state layer on top of `SearchInput`'s internal state.
- The `Navbar` is a server component. `NavbarSearchBar` is a client component — this boundary is fine; Next.js supports client components as children of server components.
- No URL pre-population in the navbar search bar — the paints page's own `SearchInput` already reflects the current `?q=` param. The navbar bar is for initiating new searches, not mirroring the current one.
- No service changes or new hooks needed — navigation to `/paints?q=value` hands off entirely to the existing `PaintExplorer` URL hydration logic.
