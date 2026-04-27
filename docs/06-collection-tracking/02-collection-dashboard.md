# Collection Dashboard

**Epic:** Collection Tracking
**Type:** Feature
**Status:** Completed
**Branch:** `feature/collection-dashboard`
**Merge into:** `v1/main`

## Summary

A dashboard landing page at `/collection` that gives authenticated users an at-a-glance overview of their paint collection, a quick search input scoped to the paints they own, and a "recently viewed palettes" section (stubbed with placeholder UI because the palettes feature does not yet exist).

The dashboard is a higher-level overview surface that complements the full collection grid (`01-collection-overview.md`). It is optimised for quickly getting back to what the user was looking at, not for exhaustive browsing.

## Acceptance Criteria

- [x] Route `/collection` renders the dashboard and requires authentication (redirects unauthenticated users to `/sign-in?next=/collection`)
- [x] Dashboard shows collection overview statistics: total paints, paints grouped by brand (top 5), paints grouped by paint type
- [x] When the user has no paints, stat cards render empty-state copy with a CTA linking to `/paints`
- [x] Dashboard includes a search input that filters the user's collection by paint name, hex, brand, or type (scoped to `user_paints` only)
- [x] Search results render as a grid of paint cards (reuses the existing paint card component)
- [x] Dashboard includes a "Recently viewed palettes" section rendered as a clearly-labelled placeholder / stub (no backing data, uses a disabled / "coming soon" visual treatment)
- [x] Authenticated users see a "Collection" link in the navbar that targets `/collection`
- [x] `npm run build` and `npm run lint` pass with no errors

## Routes

| Route         | Description                                              |
| ------------- | -------------------------------------------------------- |
| `/collection` | Collection dashboard landing page (auth required)        |

## Key Files

| Action | File                                                                      | Description                                                      |
| ------ | ------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Create | `src/app/collection/page.tsx`                                             | Collection dashboard route (thin wrapper, server component)      |
| Create | `src/modules/collection/services/collection-service.ts`                   | Supabase queries for user collection stats and search            |
| Update | `src/modules/collection/services/collection-service.server.ts`            | Server-side factory for the collection service (already exists)  |
| Create | `src/modules/collection/components/collection-stats.tsx`                  | Stat cards (total paints, by brand, by type)                     |
| Create | `src/modules/collection/components/collection-search.tsx`                 | Client component — search input + results grid                   |
| Create | `src/modules/collection/components/recent-palettes-placeholder.tsx`       | Stubbed "Recently viewed palettes" section                       |
| Create | `src/modules/collection/types/collection-stats.ts`                        | `CollectionStats` type                                           |
| Create | `src/modules/collection/types/collection-paint.ts`                        | `CollectionPaint` type (user_paints row joined with paint data)  |
| N/A    | `src/components/navbar.tsx`                                               | "Collection" link already present — no changes needed            |

## Dependencies

- **Requires `user_paints` table** (defined in [`00-manage-collection.md`](./00-manage-collection.md)). That feature must be implemented (or the migration applied) before this dashboard returns meaningful data. If `user_paints` is missing, the dashboard must still render — the stat cards and search fall back to the empty-state presentation.
- The palettes feature does **not** exist yet. The "Recently viewed palettes" section is entirely placeholder UI. No tables, actions, or client-side tracking should be added in this feature.

## Implementation Plan

### Codebase Context

The collection module already exists at `src/modules/collection/` with services, components, types, and actions from the manage-collection feature. `/collection/page.tsx` currently renders a paginated collection grid. This implementation:

1. Moves that grid to `/collection/paints/page.tsx`
2. Replaces `/collection/page.tsx` with the dashboard
3. Extends the existing service with stats and search methods

The navbar Collection link is already implemented and does not need to be added.

---

### 1. Types

**`src/modules/collection/types/collection-stats.ts`** — new file:

```ts
export type CollectionStats = {
  total: number
  byBrand: Array<{ brand: string; count: number }>
  byType: Array<{ type: string; count: number }>
}
```

**`src/modules/collection/types/collection-paint.ts`** — new file. Narrow `PaintWithBrand` (from `@/modules/paints/services/paint-service`) adding `added_at`:

```ts
import type { PaintWithBrand } from '@/modules/paints/services/paint-service'

export type CollectionPaint = PaintWithBrand & {
  added_at: string
}
```

---

### 2. Extend the collection service

Add two methods to `createCollectionService` in `src/modules/collection/services/collection-service.ts`. Match the existing per-call `userId` parameter pattern (do not change the factory signature):

**`getStats(userId: string): Promise<CollectionStats>`**
- Fetches `user_paints` for `user_id` with `select('paints(paint_type, product_lines(brands(name)))')`.
- Aggregates in JS: total count, top-5 brands by count (descending), all paint types by count.
- Returns `{ total: 0, byBrand: [], byType: [] }` on error (degrade gracefully).

**`searchCollection(userId: string, { query, limit }: { query: string; limit?: number }): Promise<CollectionPaint[]>`**
- Fetches `user_paints` for `user_id` with full paint + brand join.
- If `query` starts with `#`: filter `paints.hex` with `ilike`.
- Otherwise: `or` filter across `paints.name`, `paints.paint_type`, and `brands.name` using `ilike`.
- `limit` defaults to 24.
- Returns `[]` on error.

---

### 3. Search server action

**`src/modules/collection/actions/search-collection.ts`** — new file:

- Resolves the authenticated user via `supabase.auth.getUser()`.
- Calls `createCollectionService(supabase).searchCollection(userId, { query })`.
- Returns `{ paints: CollectionPaint[] }` or `{ error: string }`.

---

### 4. Stats component

**`src/modules/collection/components/collection-stats.tsx`** (server component) — new file:

- Props: `stats: CollectionStats`.
- Renders a responsive grid of three `Card` / `CardContent` blocks (from `@/components/ui/card`):
  1. **Total paints** — large number heading + "paints in your collection" caption.
  2. **Top brands** — list of up to 5 `{ brand, count }` rows.
  3. **By paint type** — list of `{ type, count }` rows.
- Empty state (`total === 0`): single full-width card with "Your collection is empty" copy and a `<Link href="/paints">` CTA.

---

### 5. Collection search component

**`src/modules/collection/components/collection-search.tsx`** (`'use client'`) — new file:

- Imports `SearchInput` as a default import from `@/components/search`.
- Local `useState` for `query` and `results: CollectionPaint[]`.
- `useEffect` with 250ms debounce on `query` — calls the `searchCollectionAction` server action and sets results.
- Renders results in a responsive `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4` using `PaintCard` from `@/modules/paints/components/paint-card`.
- Empty `query`: renders muted hint text "Search your collection…".
- Non-empty `query` with 0 results: renders "No paints found".
- Footer link: "View full collection →" targeting `/collection/paints`.

---

### 6. Recently viewed palettes placeholder

**`src/modules/collection/components/recent-palettes-placeholder.tsx`** (server component) — new file:

- Section heading: "Recently viewed palettes".
- Three card-shaped `bg-muted` skeleton tiles with "Palettes coming soon" caption and no interactive controls.
- JSDoc comment on the component noting the palettes feature is tracked under the Community & Social epic — replace this component when palettes ship.

---

### 7. Move existing collection grid page

Move `src/app/collection/page.tsx` → `src/app/collection/paints/page.tsx`:

- Create the `src/app/collection/paints/` directory.
- Copy the existing page content verbatim (paginated grid, `searchParams`, all imports).
- Delete `src/app/collection/page.tsx` (the dashboard will replace it in the next step).

---

### 8. Dashboard page

**`src/app/collection/page.tsx`** (server component) — new file:

```ts
// auth: middleware enforces auth; redirect('/sign-in') guard for type narrowing only
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/sign-in')

const service = createCollectionService(supabase)
const stats = await service.getStats(user.id)
```

Layout (vertical):
```
<h1>My Collection</h1>
<CollectionStats stats={stats} />
<CollectionSearch />
<RecentPalettesPlaceholder />
```

Import `createCollectionService` directly from the service file — no server factory wrapper needed since `createClient()` is called in-page.

---

### 9. Middleware & routing

No changes. `/collection` is not in `PUBLIC_ROUTES` — middleware redirects unauthenticated users to `/sign-in?next=/collection`. Confirm `/collection/paints` is also protected (it inherits the same default branch — no `PUBLIC_ROUTES` entry needed).

---

### 10. Verification

- `npm run build` passes with no errors.
- `npm run lint` passes with no errors.
- Manually verify three states:
  - (a) Unauthenticated visitor → redirected to `/sign-in?next=/collection`.
  - (b) Authenticated user with no paints → empty-state stat card, empty search hint.
  - (c) Authenticated user with paints → real counts in stats, search returns matching results.
- Verify `/collection/paints` still renders the paginated grid.

## Risks & Considerations

- **Route rename.** Existing users/bookmarks pointing to `/collection` will land on the dashboard rather than the grid. The grid moves to `/collection/paints`. Update any in-app links that pointed to `/collection` as a grid page (e.g. the "View full collection" link in `CollectionSearch`).
- **RLS scoping.** All `user_paints` reads rely on RLS to scope to `auth.uid()`. Pass `userId` explicitly to service methods (consistent with existing pattern); do not rely solely on RLS for correctness.
- **Search cost.** Joins `paints` + `product_lines` + `brands` per keystroke. The 250ms debounce is mandatory. Revisit with a Postgres function if collection sizes grow beyond ~500 paints.
- **Placeholder rot.** The palettes placeholder is explicit dead UI — the JSDoc comment is the mechanism to prevent it from being wired up accidentally.
- **`getStats` aggregation in JS.** Fetching all `user_paints` rows to aggregate in JS is acceptable for v1 collections (typically <500 paints). If performance becomes a concern, move to a SQL `GROUP BY` query.

## Notes

- Requires authentication — middleware handles this; no additional check needed at the page level beyond a type-narrowing guard.
- Reuses existing `PaintCard` (default props: id, name, hex, brand, paintType) and `SearchInput` (default export from `@/components/search`) — no new UI primitives needed.
- The palettes placeholder is intentionally inert. Do not add client-side tracking, `localStorage` hooks, or Zustand state for "recently viewed" in this feature.
- The navbar Collection link was added in the manage-collection feature and does not need to be re-implemented.
