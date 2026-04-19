# Collection Dashboard

**Epic:** Collection Tracking
**Type:** Feature
**Status:** Todo
**Branch:** `feature/collection-dashboard`
**Merge into:** `v1/main`

## Summary

A dashboard landing page at `/collection` that gives authenticated users an at-a-glance overview of their paint collection, a quick search input scoped to the paints they own, and a "recently viewed palettes" section (stubbed with placeholder UI because the palettes feature does not yet exist).

The dashboard is a higher-level overview surface that complements the full collection grid (`01-collection-overview.md`). It is optimised for quickly getting back to what the user was looking at, not for exhaustive browsing.

## Acceptance Criteria

- [ ] Route `/collection` renders the dashboard and requires authentication (redirects unauthenticated users to `/sign-in?next=/collection`)
- [ ] Dashboard shows collection overview statistics: total paints, paints grouped by brand (top 5), paints grouped by paint type
- [ ] When the user has no paints, stat cards render empty-state copy with a CTA linking to `/paints`
- [ ] Dashboard includes a search input that filters the user's collection by paint name, hex, brand, or type (scoped to `user_paints` only)
- [ ] Search results render as a grid of paint cards (reuses the existing paint card component)
- [ ] Dashboard includes a "Recently viewed palettes" section rendered as a clearly-labelled placeholder / stub (no backing data, uses a disabled / "coming soon" visual treatment)
- [ ] Authenticated users see a "Collection" link in the navbar that targets `/collection`
- [ ] `npm run build` and `npm run lint` pass with no errors

## Routes

| Route         | Description                                              |
| ------------- | -------------------------------------------------------- |
| `/collection` | Collection dashboard landing page (auth required)        |

## Key Files

| Action | File                                                                      | Description                                                      |
| ------ | ------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Create | `src/app/collection/page.tsx`                                             | Collection dashboard route (thin wrapper, server component)      |
| Create | `src/modules/collection/services/collection-service.ts`                   | Supabase queries for user collection stats and search            |
| Create | `src/modules/collection/services/collection-service.server.ts`            | Server-side factory for the collection service                   |
| Create | `src/modules/collection/components/collection-stats.tsx`                  | Stat cards (total paints, by brand, by type)                     |
| Create | `src/modules/collection/components/collection-search.tsx`                 | Client component — search input + results grid                   |
| Create | `src/modules/collection/components/recent-palettes-placeholder.tsx`       | Stubbed "Recently viewed palettes" section                       |
| Create | `src/modules/collection/types/collection-stats.ts`                        | `CollectionStats` type                                           |
| Create | `src/modules/collection/types/collection-paint.ts`                        | `CollectionPaint` type (user_paints row joined with paint data)  |
| Update | `src/components/navbar.tsx`                                               | Add "Collection" link visible to authenticated users             |

## Dependencies

- **Requires `user_paints` table** (defined in [`00-manage-collection.md`](./00-manage-collection.md)). That feature must be implemented (or the migration applied) before this dashboard returns meaningful data. If `user_paints` is missing, the dashboard must still render — the stat cards and search fall back to the empty-state presentation.
- The palettes feature does **not** exist yet. The "Recently viewed palettes" section is entirely placeholder UI. No tables, actions, or client-side tracking should be added in this feature.

## Implementation Plan

### 1. Collection module scaffolding

Create `src/modules/collection/` with the standard `services/`, `components/`, and `types/` subfolders described in `CLAUDE.md`. No barrel files.

### 2. Types

- `src/modules/collection/types/collection-stats.ts` — `CollectionStats` with `total`, `byBrand: Array<{ brand: string; count: number }>`, `byType: Array<{ type: string; count: number }>`.
- `src/modules/collection/types/collection-paint.ts` — `CollectionPaint` — the minimal shape returned for a paint in the user's collection (reuse/narrow `PaintWithBrand` and add `added_at`).

### 3. Collection service

`src/modules/collection/services/collection-service.ts` — `createCollectionService(supabase, userId)` returning:

- `getStats(): Promise<CollectionStats>` — runs three parallel queries against `user_paints` joined to `paints` / `product_lines` / `brands`:
  1. Total row count for `user_id`.
  2. Grouped count by `product_lines.brands.name` (limit 5, descending count).
  3. Grouped count by `paints.paint_type`.
  
  Implementation uses a single `select('paints(paint_type, product_lines(brands(name)))')` fetch and aggregates in JS — keeps RLS simple and avoids needing a SQL view.

- `searchCollection({ query, limit }): Promise<CollectionPaint[]>` — case-insensitive match on paint name, hex, paint type, or brand name. Scoped to `user_paints.user_id = current user` by RLS. If `query` starts with `#`, match on `hex`. Limit defaults to 24.

`src/modules/collection/services/collection-service.server.ts` — server-side factory that resolves the current user via `supabase.auth.getUser()` and returns a service bound to their id.

### 4. Stats component

`src/modules/collection/components/collection-stats.tsx` (server component) — receives a `CollectionStats` prop. Renders three cards using `Card` from `@/components/ui/card`:

- **Total paints** — large number + "paints in your collection" caption.
- **Top brands** — list of up to 5 brand rows with count.
- **By paint type** — list of paint types with count.

Empty state (total === 0): one card spanning the row with copy "Your collection is empty" and a link to `/paints`.

### 5. Collection search component

`src/modules/collection/components/collection-search.tsx` (client component) — uses the existing `SearchInput` from `@/components/search`:

- Debounced `onChange` (250ms) calls a server action that invokes `searchCollection` and returns results.
- Renders results in a responsive grid reusing `PaintCard` from `@/modules/paints/components/paint-card`. Empty query shows a muted hint.
- No pagination in v1 — hard cap 24 results with a "View full collection" link to `/collection/paints` (target doc: `01-collection-overview.md`).

Because server actions are the project convention, create `src/modules/collection/actions/search-collection.ts` exporting `searchCollection(query: string)` that calls the service and returns a typed payload.

### 6. Recently viewed palettes placeholder

`src/modules/collection/components/recent-palettes-placeholder.tsx` (server component):

- Renders a section heading: "Recently viewed palettes".
- Below it, 3 card-shaped `bg-muted` skeleton tiles with the caption "Palettes coming soon" and no interactive controls.
- Clearly labelled in the JSX with a comment noting that the palettes feature is tracked under the Community & Social epic and that this placeholder should be replaced once palettes ship.

### 7. Dashboard page

`src/app/collection/page.tsx` (server component):

1. Gets the current user via `createClient()` + `supabase.auth.getUser()`. Middleware already enforces auth — an additional `if (!user) redirect('/sign-in')` guard is kept for type narrowing.
2. Instantiates the collection service and calls `getStats()`.
3. If `user_paints` table does not exist or the query errors, logs and treats the collection as empty (no runtime crash).
4. Lays out the dashboard vertically: header → `<CollectionStats />` → `<CollectionSearch />` → `<RecentPalettesPlaceholder />`.
5. The page itself stays thin — layout only, all logic lives in the module.

### 8. Navbar link

Update `src/components/navbar.tsx` to render a `/collection` link in `navbar-center` when `user` is set (place it after `Brands`). Link uses `className="btn btn-ghost btn-sm"` to match existing styles.

### 9. Middleware

No change required — `/collection` is not listed in `PUBLIC_ROUTES`, so it falls into the authenticated-only default branch. Confirm the redirect preserves `?next=` correctly.

### 10. Verification

- `npm run build` passes.
- `npm run lint` passes.
- Manually verify the three dashboard states: (a) unauthenticated visitor is redirected to `/sign-in`, (b) authenticated user with no paints sees the empty-state stat card and empty search hint, (c) authenticated user with paints sees real counts and search results.

## Risks & Considerations

- **`user_paints` not yet implemented.** The 00-manage-collection migration is Todo. This feature must degrade gracefully: queries against a missing table should be caught and return an empty stats object rather than surfacing a 500. Ideally the service detects the missing table once per request and memoises.
- **RLS scoping.** All `user_paints` reads rely on RLS to scope to `auth.uid()`. Do not pass `user_id` into the client-bound service — server-only.
- **Search cost.** Searching the user's collection joins `paints` + `product_lines` + `brands` per keystroke. 250ms debounce is mandatory. If users commonly have >500 paints, revisit with a Postgres function or materialised view — out of scope for v1.
- **Placeholder rot.** The palettes placeholder is explicit dead UI. Flag it in the code comment so the next engineer touching the palettes epic removes it instead of wiring it up.
- **Overlap with `01-collection-overview.md`.** That doc defines the full paginated grid at `/collection`. This dashboard takes that slot. During `/implement`, coordinate: either (a) move the collection overview grid to `/collection/paints` and update the existing doc, or (b) refile the overview doc to explicitly extend the dashboard. Recommended: (a).
- **Navbar clutter.** Adding another link nudges mobile layout. Verify the navbar still fits at common mobile widths or accept the overflow pattern already in place.

## Notes

- Requires authentication — middleware handles this; no additional check needed at the page level beyond a type-narrowing guard.
- Reuses existing `PaintCard` and `SearchInput` primitives rather than introducing new UI.
- The palettes placeholder is intentionally inert. Do not add client-side tracking, `localStorage` hooks, or Zustand state for "recently viewed" in this feature.
