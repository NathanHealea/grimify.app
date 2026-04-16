# Paint Search and Hue Filtering

**Epic:** Paint Data & Search
**Type:** Feature
**Status:** Completed
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

- [x] Search input triggers async typeahead after 3+ characters with 300ms debounce
- [x] Search results update the paint grid without a page reload
- [x] Clicking a top-level hue card filters the paint grid to that hue group (async fetch)
- [x] When a top-level hue is selected, its child hues appear below the hue cards
- [x] Clicking a child hue card filters the paint grid to just that child hue (async fetch)
- [x] Each hue card has a "Details" button that links to `/hues/[id]`
- [x] Clicking a hue card to filter does NOT navigate away from `/paints`
- [x] Clearing the search input or deselecting a hue returns to the default all-paints view
- [x] Active hue filter is visually indicated (selected state on the card)
- [x] Search and hue filter state syncs to URL params (`?q=...&hue=parent,child`)
- [x] Only clicking a paint card navigates to `/paints/[id]`
- [x] Loading states shown during async fetches
- [x] Empty state shown when no results match
- [x] `npm run build` and `npm run lint` pass with no errors

## Implementation Plan

### Step 1: Create `hue-service.client.ts`

Create a browser-side hue service factory — mirrors the existing `paint-service.client.ts` pattern. This is a prerequisite for `PaintExplorer` to fetch child hues client-side.

**New file:** `src/modules/hues/services/hue-service.client.ts`

- Import `createClient` from `@/lib/supabase/client` and `createHueService` from `./hue-service`.
- Export `getHueService()` that returns `createHueService(createClient())`.

### Step 2: Create the `PaintExplorer` client component

**New file:** `src/modules/paints/components/paint-explorer.tsx`

This is the core deliverable — a `'use client'` component that owns all interactive state and orchestrates search, hue filtering, and pagination on `/paints`.

#### 2a. Props (SSR hydration)

| Prop | Type | Purpose |
|------|------|---------|
| `initialPaints` | `PaintWithBrand[]` | First page of paints (server-rendered) |
| `initialTotalCount` | `number` | Total paint count for initial view |
| `ittenHues` | `IttenHue[]` | All top-level Itten hues (fetched server-side, avoids client round-trip) |
| `huePaintCounts` | `Record<string, number>` | Paint count per top-level hue group (server-fetched) |

#### 2b. Internal state

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

#### 2c. URL sync strategy

- Read URL params on mount to restore state: `q`, `hue`, `page`, `size`.
- Write URL params via `router.replace()` on every state change using `useSearchParams()` as the base (preserves existing params like `page` and `size`).
- The `hue` param is a comma-separated list of hue names: `hue=red` (parent only), `hue=red,crimson` (parent + child). Names are lowercase.
- Hue names are resolved to IDs by matching against the `ittenHues` prop (for parents) or the fetched `childHues` array (for children) using case-insensitive name comparison.

#### 2d. Debounce implementation

Use a `useEffect` + `setTimeout` pattern — no external dependency needed:

```ts
useEffect(() => {
  if (searchQuery.length > 0 && searchQuery.length < 3) return
  const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300)
  return () => clearTimeout(timer)
}, [searchQuery])
```

Fires after 300ms of inactivity. Skips queries shorter than 3 characters (except empty string, which clears the search).

#### 2e. Data fetching on filter change

When `debouncedQuery`, `selectedHueName`, or `selectedChildHueName` changes, run a `useEffect` that:

1. Resolves hue names to IDs from the loaded hue arrays.
2. Determines which paint service method to call:
   - **No search, no hue:** `getAllPaints({ limit, offset: 0 })` + `getTotalPaintCount()`
   - **Hue only (child):** `getPaintsByIttenHueId(childHueId, { limit, offset: 0 })` + `getPaintCountByIttenHueId(childHueId)`
   - **Hue only (parent, no child):** `getPaintsByHueGroup(parentHueId, { limit, offset: 0 })` + `getPaintCountByHueGroup(parentHueId)`
   - **Search (with or without hue):** `searchPaints({ query, hueId?, hueIds?, limit, offset: 0 })`
3. Updates `gridPaints` and `gridTotalCount` with results.
4. Resets pagination to page 1 (removes `page` from URL).
5. Updates URL params (`q`, `hue`).

When a parent hue is newly selected, also fetch:
- `hueService.getChildHues(parentHueId)` → `childHues`
- `paintService.getPaintCountByIttenHueId(childId)` for each child → `childHuePaintCounts`

#### 2f. PaginatedPaintGrid integration

Reuse the existing `PaginatedPaintGrid` by passing a `fetchPaints` callback that incorporates the current search + hue state. Use a `key` derived from the filter state to force remount when filters change — this cleanly resets PaginatedPaintGrid's internal page state to 1.

```tsx
<PaginatedPaintGrid
  key={`${debouncedQuery}-${parentHueId}-${childHueId}`}
  initialPaints={gridPaints}
  totalCount={gridTotalCount}
  basePath="/paints"
  fetchPaints={fetchPaintsWithFilters}
/>
```

The `fetchPaintsWithFilters` callback mirrors the fetch logic from 2e but accepts `{ limit, offset }` from PaginatedPaintGrid for pagination. PaginatedPaintGrid already preserves all URL params (including `q` and `hue`) when updating `page`/`size` via `new URLSearchParams(searchParams.toString())`.

#### 2g. Rendering layout

```
┌──────────────────────────────────────────────────┐
│ <input class="input" />                [Clear All] │  ← search + clear row
├──────────────────────────────────────────────────┤
│ IttenHueCard  IttenHueCard  IttenHueCard  ...    │  ← flex-wrap row of top-level hues
├──────────────────────────────────────────────────┤
│ ChildHueCard  ChildHueCard  ChildHueCard  ...    │  ← conditional child hue row
├──────────────────────────────────────────────────┤
│ PaginatedPaintGrid                               │  ← reused grid with filtered data
└──────────────────────────────────────────────────┘
```

- Search input uses the `.input` class from `src/styles/input.css`.
- Clear All button uses `.btn .btn-ghost`.
- `IttenHueCard` rendered in filter mode (`onSelect` prop) — already has "Details" link and `ring-2 ring-primary` selected state.
- `ChildHueCard` rendered in filter mode (`onSelect` prop) — same dual-mode support.
- `isFiltering` state applies `opacity-50 transition-opacity` to the grid area during filter transitions.

#### 2h. Clear All

Resets `searchQuery`, `debouncedQuery`, `selectedHueName`, `selectedChildHueName`, `childHues` to defaults. Removes `q`, `hue`, `page` from URL. Reloads unfiltered paint data.

#### 2i. Hue selection behavior

- **Select parent hue:** Sets `selectedHueName`, clears `selectedChildHueName`, fetches child hues + child paint counts, fetches filtered paints.
- **Deselect parent hue** (click same pill): Clears `selectedHueName`, `selectedChildHueName`, `childHues`. Reverts to unfiltered (or search-only) results.
- **Select child hue:** Sets `selectedChildHueName`, fetches paints filtered to that child hue only.
- **Deselect child hue** (click same pill): Clears `selectedChildHueName`. Reverts to parent-hue-filtered results.

### Step 3: Refactor `src/app/paints/page.tsx`

Convert the server page into a thin data-fetching shell that renders `PaintExplorer`.

**Changes:**
- Add import for `getHueService` from `hue-service.server.ts`.
- Add import for `PaintExplorer`.
- Fetch in parallel: `getAllPaints`, `getTotalPaintCount`, `getIttenHues`.
- After hues are loaded, fetch `getPaintCountByHueGroup` for each hue (~13 parallel queries).
- Pass all fetched data as props to `<PaintExplorer />`.
- Keep the page heading and subtitle in the server component above `PaintExplorer`.

### Step 4: Verify and handle edge cases

- **Empty state:** When `gridPaints` is empty after a search/filter, PaginatedPaintGrid already shows "No paints available." Verify this works correctly with combined search + hue filters.
- **Loading states:** `isFiltering` shows opacity during filter transitions. PaginatedPaintGrid already handles `isPending` for page changes via `useTransition`.
- **URL restoration:** Verify that loading `/paints?q=citadel&hue=red,crimson&page=2` correctly restores all state — search input prefilled, parent hue selected, child hue selected, grid on page 2.
- **Search + filter interaction:** Clearing the search input with active hue filters should show all paints in that hue group (not all paints globally).
- **Hue toggle:** Clicking an already-selected parent hue deselects it and clears the child hue. Clicking an already-selected child hue deselects just the child (parent stays active).

### Affected Files

| File | Change |
|------|--------|
| `src/modules/hues/services/hue-service.client.ts` | **New** — browser-side hue service factory |
| `src/modules/paints/components/paint-explorer.tsx` | **New** — main interactive component (search, hue filter, grid orchestration) |
| `src/app/paints/page.tsx` | **Modify** — add hue data fetching; render PaintExplorer with props |
| `src/modules/paints/components/paginated-paint-grid.tsx` | **No change** — reused via `fetchPaints` prop + key-based remount |
| `src/modules/hues/components/itten-hue-card.tsx` | **No change** — already supports filter mode (`onSelect` prop) |
| `src/modules/hues/components/child-hue-card.tsx` | **No change** — already supports filter mode (`onSelect` prop) |
| `src/modules/paints/services/paint-service.ts` | **No change** — `searchPaints()` already exists with `hueId`/`hueIds` support |

### Risks & Considerations

- **N+1 hue count queries:** Fetching paint counts per hue group requires one query per top-level hue (~13 queries). These run server-side in parallel on initial page load and are acceptable for 13 items. Consider a single aggregation query if the count grows.
- **`searchPaints` round-trips:** The current implementation does 3-4 Supabase queries (brand lookup → parallel ID queries → data + count). Fine for interactive use; could be optimized with a Postgres function if latency becomes an issue.
- **PaginatedPaintGrid key remount:** Remounting the grid on every filter change loses scroll position and internal pagination state. This is intentional — filters always reset to page 1. If the remount causes a visible flash, consider wrapping in a CSS transition.
- **No `hue-service.client.ts`:** This is a blocker — PaintExplorer cannot fetch child hues without it. Step 1 resolves this.
- **Hue name collisions:** URL-based name resolution would be ambiguous if two hues share the same lowercase name. Unlikely given Itten hue naming but worth noting.

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
