# Design System — Implementation Overview

The Grimify CSS and component layer is largely complete and well-structured. All core utility components specified in DESIGN.md are implemented (buttons, cards, inputs, badges, navbar, sidebar, skeleton, dialogs, sheets, popovers, select, dropdowns, form controls, avatar, slider, input-group). The semantic color token system is correct in both light and dark modes. Typography, spacing, and elevation are aligned with the spec.

Six gaps were identified where the implementation diverges from or is missing something the DESIGN.md specifies. They are ordered roughly by impact.

## Feature Docs

| # | Feature | Status | Branch |
|---|---------|--------|--------|
| 1 | [Paint Card Component Alignment](./01-paint-card-component-alignment.md) | Todo | `feature/paint-card-component-alignment` |
| 2 | [Filter Sidebar Component](./02-filter-sidebar.md) | Todo | `feature/filter-sidebar` |
| 3 | [Sidebar Gold Active State](./03-sidebar-gold-active-state.md) | Todo | `feature/sidebar-gold-active-state` |
| 4 | [Paint Swatch CSS Primitive](./04-paint-swatch-css-primitive.md) | Todo | `feature/paint-swatch-css-primitive` |
| 5 | [Navbar Search Input Styling](./05-navbar-search-input-styling.md) | Todo | `feature/navbar-search-input-styling` |
| 6 | [Minor CSS Alignment Fixes](./06-minor-css-alignment.md) | Todo | `feature/minor-css-alignment` |

## Audit Summary

**What was checked:**
- All CSS files: `src/styles/*.css` (20 files) and `src/app/globals.css`
- All UI primitive components: `src/components/ui/` (13 components)
- Application-level components: `src/components/navbar.tsx`, `src/components/search.tsx`
- Paint module components: `paint-card.tsx`, `navbar-search-bar.tsx`

**What was not checked** (out of scope for this audit):
- Individual page-level layout and composition
- Module-specific components beyond the paint card
- Responsive behavior at actual breakpoints (requires browser testing)

---

### Gap 1 — Paint Card (High Impact)

`paint-card.tsx` has the wrong swatch shape (`size-16 rounded-lg` instead of `size-10 rounded-full`), doesn't use `.card .card-compact`, and is missing the collection toggle button. This is the most visible deviation from the spec since paint cards appear on nearly every page.

### Gap 2 — Filter Sidebar (High Impact, Missing Entirely)

No filter sidebar CSS classes or component exist. The paint explorer is a core feature of the app and the filter sidebar is central to its UX. Both the CSS primitives and the React component need to be built from scratch.

### Gap 3 — Sidebar Gold Active State (Medium Impact)

The admin sidebar active item uses `bg-muted text-foreground` instead of the specified `text-primary` (gold) accent. All other primary-action signaling in the app uses gold; the sidebar is the only place that doesn't. The sidebar also uses `bg-background` instead of the `bg-sidebar` semantic token.

### Gap 4 — Paint Swatch CSS Primitive (Medium Impact)

No shared `.paint-swatch` CSS class exists. Each usage site independently hard-codes swatch dimensions and border, leading to inconsistency across paint cards, detail pages, and comparison views. A shared primitive enforces the DESIGN.md rule that swatches render consistently against neutral backgrounds.

### Gap 5 — Navbar Search Ghost Styling (Low Impact)

The navbar search bar uses a full `InputGroup` (with visible border) rather than the `.input-ghost` style the spec calls for. The ghost style would make the search control blend into the navbar background when idle, matching the "minimal chrome" design intent.

### Gap 6 — Minor CSS Alignment (Low Impact)

Three small mismatches: `.skeleton` uses `rounded` not `rounded-md`; `.page-title` uses `text-3xl` (30px) where DESIGN.md specifies `text-2xl` (24px); `.btn-soft` hover doesn't transition text to `foreground`. These are cosmetic and may be intentional revisions — each needs a quick team decision before fixing.

---

## What Is Correct and Complete

The following components are fully implemented and match the DESIGN.md spec:

- **Color tokens** — all brand gold variants, all semantic light/dark mode tokens (exact OKLch values)
- **Button system** — all variants (primary, outline, ghost, soft, destructive, link), all sizes (xs/sm/md/lg), all shapes (square, circle, block), focus ring
- **Card system** — base, body, title, description, footer, compact modifier
- **Badge system** — base, primary, soft, outline, destructive, all sizes
- **Input system** — base, sizes, ghost, error, colors, disabled
- **Navbar** — structure, brand, search slot, mobile trigger
- **Skeleton** — base, shapes, sizes (except `rounded` vs `rounded-md`)
- **Page shell** — all `.main` width and padding variants
- **Dialog / Sheet / Popover / Select / Dropdown** — all implemented with correct shadow, border, and animation tokens
- **Form controls** — label, form-item, form-message, form-description
- **Avatar** — sizes and placeholder
- **Slider** — all sizes and color variants
- **Input group** — composite control with addons, ghost mode, error state
- **Marketing / Hero** — section primitives, step list, stats, swatch strip, feature cards
