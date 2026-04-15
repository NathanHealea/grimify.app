# Paint Search and Hue Filtering

**Epic:** Paint Data & Search
**Type:** Feature
**Status:** In Progress
**Branch:** `feature/paint-search`
**Merge into:** `v1/main`

## Summary

Refactor `/paints` into a single interactive page where all actions — search, hue filtering, and child hue drilling — happen asynchronously without page navigation. The only navigation away from the page is clicking a paint card (→ `/paints/[id]`) or a hue "Details" button (→ `/hues/[id]`).

### Current behavior

- `/paints` is a server-rendered page with a read-only search input placeholder
- Itten hue cards are `<Link>` components that navigate to `/hues/[id]`
- The paint grid paginates client-side but there is no search or hue filtering on this page

### Target behavior

`/paints` becomes a fully interactive client-driven page. A `PaintExplorer` client component owns all interactive state and orchestrates search, filtering, and pagination without page navigation.

#### Page layout

```
┌─────────────────────────────────────────────┐
│ Search input                   [Clear All]  │
├─────────────────────────────────────────────┤
│ Hue pills (top-level, always visible)       │
│ [Red] [Orange] [Yellow] [Green] ...         │
├─────────────────────────────────────────────┤
│ Child hue pills (only when a hue is active) │
│ [Crimson] [Scarlet] [Ruby] ...              │
├─────────────────────────────────────────────┤
│ Paginated paint grid                        │
│ (reflects current search + filter state)    │
└─────────────────────────────────────────────┘
```

#### Search

- A text input searches paints by name, brand, or type (case-insensitive partial match via `ilike`).
- Typing triggers an async fetch — no page reload.
- If hue filters are active, search applies **within** the filtered set.
- Clearing the search input (empty string) reverts to the unfiltered or filter-only paint list.

#### Hue filtering

- Top-level Itten hues are displayed as pill-style cards in a horizontal row.
- Clicking a hue pill activates it as a filter — the paint grid shows only paints in that hue group.
- When a hue is active, its child hues appear in a second row below.
- Clicking a child hue pill narrows the filter to just that child hue.
- Clicking the active hue pill again deselects it and removes the hue filter.
- Active hue/child hue pills show a visual selected indicator (ring highlight).
- Each hue pill has a separate "Details" link that navigates to `/hues/[id]` — this is the only navigation away from `/paints` besides clicking a paint card.
- Hues are identified by **name** (lowercased, e.g. `red`, `crimson`) in URLs for readable, shareable links. The component resolves names to IDs internally for queries.

#### Clear All

- A "Clear All" button resets search, hue filters, and pagination to the initial page state.

#### State and URL sync

- All interactive state syncs to URL search params: `?q=...&hue=...&page=...&size=...`
- The `hue` param is a comma-separated list of hue names: first value is the parent, optional second value is the child.
  - Parent only: `?hue=red`
  - Parent + child: `?hue=red,crimson`
- On page load, `PaintExplorer` reads URL params to restore the view.
- Any change to search or filters resets pagination to page 1.

#### Query priority order

Operations are applied in this order:

1. **Filter** (hue, child hue) — indexed, narrows the dataset first
2. **Search** (text match) — applies within the filtered subset
3. **Sort** (alphabetical by name) — orders the surviving results
4. **Paginate** (limit/offset) — slices the final sorted set

## Acceptance Criteria

- [ ] Search input triggers async typeahead after 3+ characters with 300ms debounce
- [ ] Search results update the paint grid without a page reload
- [ ] Clicking a top-level hue card filters the paint grid to that hue group (async fetch)
- [ ] When a top-level hue is selected, its child hues appear below the hue cards
- [ ] Clicking a child hue card filters the paint grid to just that child hue (async fetch)
- [x] Each hue card has a "Details" button that links to `/hues/[id]`
- [ ] Clicking a hue card to filter does NOT navigate away from `/paints`
- [ ] Clearing the search input or deselecting a hue returns to the default all-paints view
- [x] Active hue filter is visually indicated (selected state on the card)
- [ ] Search and hue filter state syncs to URL params (`?q=...&hue=parent,child`)
- [ ] Only clicking a paint card navigates to `/paints/[id]`
- [ ] Loading states shown during async fetches
- [ ] Empty state shown when no results match
- [x] `npm run build` and `npm run lint` pass with no errors

## Implementation Plan

### Step 1: Create `hue-service.client.ts`

Create a browser-side hue service factory — the same pattern used by `paint-service.client.ts`. Currently missing, but required for `PaintExplorer` to fetch hues client-side.

**New file:** `src/modules/hues/services/hue-service.client.ts`

```ts
import { createClient } from '@/lib/supabase/client'
import { createHueService } from '@/modules/hues/services/hue-service'

export function getHueService() {
  return createHueService(createClient())
}
```

### Step 2: Create the `PaintExplorer` client component

**New file:** `src/modules/paints/components/paint-explorer.tsx`

This is the core deliverable — a `'use client'` component that owns all interactive state and orchestrates search, hue filtering, and pagination on `/paints`.

#### Props (SSR hydration)

| Prop | Type | Purpose |
|------|------|---------|
| `initialPaints` | `PaintWithBrand[]` | First page of paints (server-rendered) |
| `initialTotalCount` | `number` | Total paint count for initial view |
| `ittenHues` | `IttenHue[]` | All top-level Itten hues (fetched server-side, avoids client round-trip) |
| `huePaintCounts` | `Record<string, number>` | Paint count per top-level hue group (server-fetched) |

#### Internal state

| State | Type | Initialized from |
|-------|------|-----------------|
| `searchQuery` | `string` | URL param `q` (or `''`) |
| `debouncedQuery` | `string` | Debounced mirror of `searchQuery` |
| `selectedHueName` | `string \| null` | First value from URL param `hue` |
| `selectedChildHueName` | `string \| null` | Second value from URL param `hue` (after comma) |
| `childHues` | `IttenHue[]` | `[]` until a parent hue is selected |
| `childHuePaintCounts` | `Record<string, number>` | Paint counts per child hue (fetched when parent selected) |
| `gridPaints` | `PaintWithBrand[]` | `initialPaints` initially; updated on filter/search change |
| `gridTotalCount` | `number` | `initialTotalCount` initially; updated on filter/search change |
| `isFiltering` | `boolean` | Loading state during filter/search transitions |

#### URL sync strategy

- Read URL params on mount to restore state: `q`, `hue`, `page`, `size`.
- Write URL params via `router.replace()` on every state change using `useSearchParams()` as the base (preserves any extra params).
- The `hue` param is a comma-separated list: `hue=red` (parent only), `hue=red,crimson` (parent + child). Names are lowercase.
- Hue names are resolved to IDs by matching against the `ittenHues` array (for parents) or `childHues` array (for children) using case-insensitive name comparison.

#### Debounce implementation

Use a `useEffect` + `setTimeout` pattern (no external dependency):

```ts
useEffect(() => {
  if (searchQuery.length > 0 && searchQuery.length < 3) return
  const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300)
  return () => clearTimeout(timer)
}, [searchQuery])
```

Fires after 300ms of inactivity. Skips queries shorter than 3 characters (except empty string, which clears the search).

#### Data fetching on filter change

When `debouncedQuery`, `selectedHueName`, or `selectedChildHueName` changes:

1. Resolve hue names → IDs from the loaded hue arrays.
2. Build the fetch:
   - **No search, no hue:** `paintService.getAllPaints({ limit, offset: 0 })` + `paintService.getTotalPaintCount()`
   - **Hue only (child):** `paintService.getPaintsByIttenHueId(childHueId, { limit, offset: 0 })` + `paintService.getPaintCountByIttenHueId(childHueId)`
   - **Hue only (parent, no child):** `paintService.getPaintsByHueGroup(parentHueId, { limit, offset: 0 })` + `paintService.getPaintCountByHueGroup(parentHueId)`
   - **Search (with or without hue):** `paintService.searchPaints({ query, hueId?, hueIds?, limit, offset: 0 })`
3. Update `gridPaints` and `gridTotalCount` with results.
4. Reset pagination to page 1 (remove `page` from URL).
5. Update URL params (`q`, `hue`).

When a parent hue is newly selected, also fetch:
- `hueService.getChildHues(parentHueId)` → `childHues`
- `paintService.getPaintCountByIttenHueId(childId)` for each child → `childHuePaintCounts`

#### PaginatedPaintGrid integration

Pass a `fetchPaints` callback that incorporates the current search + hue state, and use a `key` derived from the filter state (`${debouncedQuery}-${parentHueId}-${childHueId}`) to force remount when filters change. This cleanly resets PaginatedPaintGrid's internal page state to 1.

```tsx
<PaginatedPaintGrid
  key={`${debouncedQuery}-${selectedHue?.id}-${selectedChildHue?.id}`}
  initialPaints={gridPaints}
  totalCount={gridTotalCount}
  basePath="/paints"
  fetchPaints={fetchPaintsWithFilters}
/>
```

The `fetchPaintsWithFilters` callback mirrors the fetch logic above but accepts `{ limit, offset }` from PaginatedPaintGrid for pagination. PaginatedPaintGrid already preserves all existing URL params (including `q` and `hue`) when updating `page`/`size`.

#### Rendering layout

```tsx
<div>
  {/* Search + Clear All row */}
  <div className="flex gap-2">
    <input type="text" value={searchQuery} onChange={...} placeholder="Search paints..." className="input input-bordered flex-1" />
    <button onClick={clearAll} className="btn btn-ghost">Clear All</button>
  </div>

  {/* Top-level hue pills */}
  <div className="flex flex-wrap gap-3">
    {ittenHues.map(hue => (
      <IttenHueCard hue={hue} paintCount={...} isSelected={...} onSelect={...} />
    ))}
  </div>

  {/* Child hue pills (conditional) */}
  {childHues.length > 0 && (
    <div className="flex flex-wrap gap-3">
      {childHues.map(hue => (
        <ChildHueCard hue={hue} paintCount={...} isSelected={...} onSelect={...} />
      ))}
    </div>
  )}

  {/* Loading overlay */}
  {isFiltering && <LoadingIndicator />}

  {/* Paint grid */}
  <PaginatedPaintGrid key={gridKey} ... />
</div>
```

#### Clear All

Resets `searchQuery`, `debouncedQuery`, `selectedHueName`, `selectedChildHueName`, `childHues` to defaults. Removes `q`, `hue`, `page` from URL. Reloads unfiltered paint data.

### Step 3: Refactor `src/app/paints/page.tsx`

Convert the server page into a thin data-fetching shell that renders `PaintExplorer`.

**Changes:**
- Import `getHueService` from `hue-service.server.ts`.
- Fetch in parallel: `getAllPaints`, `getTotalPaintCount`, `getIttenHues`, child IDs per hue + `getPaintCountByHueGroup` for each.
- Pass all fetched data as props to `<PaintExplorer />`.
- Keep the page heading (`<h1>Paints</h1>`) and subtitle in the server component; `PaintExplorer` receives it or renders below it.
- Remove the search input placeholder if present — search lives in `PaintExplorer` now.

```tsx
export default async function PaintsPage({ searchParams }) {
  const { page, size } = await searchParams
  const pageSize = VALID_SIZES.includes(Number(size)) ? Number(size) : 50
  const currentPage = Math.max(1, parseInt(page ?? '1', 10) || 1)
  const offset = (currentPage - 1) * pageSize

  const [paintService, hueService] = await Promise.all([
    getPaintService(),
    getHueService(),
  ])

  const [initialPaints, totalPaints, ittenHues] = await Promise.all([
    paintService.getAllPaints({ limit: pageSize, offset }),
    paintService.getTotalPaintCount(),
    hueService.getIttenHues(),
  ])

  // Fetch paint counts per hue group
  const hueCountEntries = await Promise.all(
    ittenHues.map(async (hue) => [hue.id, await paintService.getPaintCountByHueGroup(hue.id)] as const)
  )
  const huePaintCounts = Object.fromEntries(hueCountEntries)

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <div className="mb-8 flex flex-col gap-4">
        <h1 className="text-3xl font-bold">Paints</h1>
        <p className="text-sm text-muted-foreground">
          Browse {totalPaints.toLocaleString()} paints.
        </p>
      </div>
      <PaintExplorer
        initialPaints={initialPaints}
        initialTotalCount={totalPaints}
        ittenHues={ittenHues}
        huePaintCounts={huePaintCounts}
      />
    </div>
  )
}
```

### Step 4: Verify and handle edge cases

- **Empty state:** When `gridPaints` is empty after a search/filter, PaginatedPaintGrid already shows "No paints available." Verify this works correctly.
- **Loading states:** `isFiltering` shows opacity/skeleton during filter transitions. PaginatedPaintGrid already handles `isPending` for page changes.
- **URL bookmarkability:** Verify that loading `/paints?q=citadel&hue=red,crimson&page=2` correctly restores all state.
- **Search edge cases:** Clearing the search input (empty string) with active hue filters should show all paints in that hue group (not all paints globally).
- **Hue toggle:** Clicking an already-selected parent hue deselects it and clears the child hue. Clicking an already-selected child hue deselects just the child (parent stays active).

### Affected Files

| File | Change |
|------|--------|
| `src/modules/hues/services/hue-service.client.ts` | **New** — browser-side hue service factory |
| `src/modules/paints/components/paint-explorer.tsx` | **New** — main interactive component (search, hue filter, grid orchestration) |
| `src/app/paints/page.tsx` | **Modify** — refactor to thin server shell; fetch hues + counts; render PaintExplorer |
| `src/modules/paints/components/paginated-paint-grid.tsx` | **No change** — reused via `fetchPaints` prop + key-based remount |
| `src/modules/hues/components/itten-hue-card.tsx` | **No change** — already supports filter mode (`onSelect` prop) |
| `src/modules/hues/components/child-hue-card.tsx` | **No change** — already supports filter mode (`onSelect` prop) |
| `src/modules/paints/services/paint-service.ts` | **No change** — `searchPaints()` already exists with hue filtering support |

### Risks & Considerations

- **N+1 hue count queries:** Fetching paint counts per hue group requires one query per top-level hue (~13 queries). This runs server-side on initial page load and is acceptable for 13 items. Consider caching or a single aggregation query if hue count grows.
- **`searchPaints` multi-step approach:** The current implementation does 3-4 round-trips to Supabase (brand lookup → parallel ID queries → data + count). This is fine for interactive use but could be optimized with a Postgres function if performance becomes an issue.
- **PaginatedPaintGrid key remount:** Remounting the grid on every filter change loses scroll position and internal pagination state. This is intentional — filters always reset to page 1. However, if the remount causes a visible flash, consider adding a transition.
- **No hue-service.client.ts exists yet:** This is a blocker — PaintExplorer cannot fetch child hues without it. Creating it is Step 1.
- **Hue name collisions:** If two hues share the same lowercase name, URL-based resolution would be ambiguous. This is unlikely given Itten hue naming but worth noting.

## Existing Components & Services

| File                                                     | Description                                                          | Change needed                                                   |
| -------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------- |
| `src/app/paints/page.tsx`                                | Server-rendered paints page with read-only search input              | Refactor into thin server shell + client interactive component  |
| `src/modules/paints/components/paint-card.tsx`           | Paint card with swatch, name, brand, type; links to `/paints/[id]`   | No change                                                       |
| `src/modules/paints/components/paginated-paint-grid.tsx` | Client-side paginated grid with async page fetches                   | Reuse — pass filtered fetch function based on active search/hue |
| `src/modules/paints/services/paint-service.ts`           | Core paint queries (no search method yet)                            | Add `searchPaints()` method                                     |
| `src/modules/paints/services/paint-service.client.ts`    | Client-side paint service factory (browser Supabase client)          | No change — used by new client components                       |
| `src/modules/hues/components/itten-hue-card.tsx`         | Hue card that links to `/hues/[id]`                                  | Refactor: click filters paints; add separate "Details" link     |
| `src/modules/hues/components/child-hue-card.tsx`         | Child hue card that links to `/hues/[id]`                            | Refactor: click filters paints; add separate "Details" link     |
| `src/modules/hues/services/hue-service.ts`               | Hue queries: `getIttenHues()`, `getChildHues()`, `getIttenHueById()` | No change — called from client via `hue-service.client.ts`      |
| `src/modules/paints/components/hue-group-paint-grid.tsx` | Paginated grid filtered by hue group                                 | May be absorbed into the new unified page component             |
| `src/modules/paints/components/hue-paint-grid.tsx`       | Paginated grid filtered by child hue                                 | May be absorbed into the new unified page component             |
| `src/types/paint.ts`                                     | `Brand`, `ProductLine`, `Paint`, `PaintReference` types              | No change                                                       |
| `src/types/color.ts`                                     | `IttenHue` type                                                      | No change                                                       |

## Routes

| Route          | Description                                                             |
| -------------- | ----------------------------------------------------------------------- |
| `/paints`      | Interactive page — search, hue filter, child hue filter, paginated grid |
| `/paints/[id]` | Paint detail page (existing, unchanged)                                 |
| `/hues/[id]`   | Hue detail page (existing, unchanged — linked from "Details" buttons)   |
