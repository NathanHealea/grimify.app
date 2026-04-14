# Paint Search and Hue Filtering

**Epic:** Paint Data & Search
**Type:** Feature
**Status:** Todo

## Summary

Refactor `/paints` into a single interactive page where all actions — search, hue filtering, and child hue drilling — happen asynchronously without page navigation. The only navigation away from the page is clicking a paint card (→ `/paints/[id]`) or a hue "Details" button (→ `/hues/[id]`).

### Current behavior

- `/paints` is a server-rendered page with a read-only search input placeholder
- Itten hue cards are `<Link>` components that navigate to `/hues/[id]`
- The paint grid paginates client-side but there is no search or hue filtering on this page

### Target behavior

- `/paints` becomes a fully interactive client-driven page
- Typing 3+ characters triggers async typeahead search (debounced)
- Clicking a top-level hue card filters the paint grid to that hue group and reveals its child hues — no navigation
- Clicking a child hue card further filters paints to just that child hue — no navigation
- Each hue card has a separate "Details" button/link that navigates to `/hues/[id]`
- Clearing search or hue filters returns to the default all-paints view

## Acceptance Criteria

- [ ] Search input triggers async typeahead after 3+ characters with 300ms debounce
- [ ] Search results update the paint grid without a page reload
- [ ] Clicking a top-level hue card filters the paint grid to that hue group (async fetch)
- [ ] When a top-level hue is selected, its child hues appear below the hue cards
- [ ] Clicking a child hue card filters the paint grid to just that child hue (async fetch)
- [ ] Each hue card has a "Details" button that links to `/hues/[id]`
- [ ] Clicking a hue card to filter does NOT navigate away from `/paints`
- [ ] Clearing the search input or deselecting a hue returns to the default all-paints view
- [ ] Active hue filter is visually indicated (selected state on the card)
- [ ] Search and hue filter state syncs to URL params (`?q=...&hue=...&childHue=...`)
- [ ] Only clicking a paint card navigates to `/paints/[id]`
- [ ] Loading states shown during async fetches
- [ ] Empty state shown when no results match
- [ ] `npm run build` and `npm run lint` pass with no errors

## Existing Components & Services

| File                                                     | Description                                                           | Change needed                                                     |
| -------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `src/app/paints/page.tsx`                                | Server-rendered paints page with read-only search input               | Refactor into thin server shell + client interactive component    |
| `src/modules/paints/components/paint-card.tsx`           | Paint card with swatch, name, brand, type; links to `/paints/[id]`   | No change                                                         |
| `src/modules/paints/components/paginated-paint-grid.tsx` | Client-side paginated grid with async page fetches                    | Reuse — pass filtered fetch function based on active search/hue   |
| `src/modules/paints/services/paint-service.ts`           | Core paint queries (no search method yet)                             | Add `searchPaints()` method                                       |
| `src/modules/paints/services/paint-service.client.ts`    | Client-side paint service factory (browser Supabase client)           | No change — used by new client components                         |
| `src/modules/hues/components/itten-hue-card.tsx`         | Hue card that links to `/hues/[id]`                                  | Refactor: click filters paints; add separate "Details" link       |
| `src/modules/hues/components/child-hue-card.tsx`         | Child hue card that links to `/hues/[id]`                            | Refactor: click filters paints; add separate "Details" link       |
| `src/modules/hues/services/hue-service.ts`              | Hue queries: `getIttenHues()`, `getChildHues()`, `getIttenHueById()` | No change — called from client via `hue-service.client.ts`        |
| `src/modules/paints/components/hue-group-paint-grid.tsx` | Paginated grid filtered by hue group                                 | May be absorbed into the new unified page component               |
| `src/modules/paints/components/hue-paint-grid.tsx`       | Paginated grid filtered by child hue                                 | May be absorbed into the new unified page component               |
| `src/types/paint.ts`                                     | `Brand`, `ProductLine`, `Paint`, `PaintReference` types              | No change                                                         |
| `src/types/color.ts`                                     | `IttenHue` type                                                      | No change                                                         |

## Routes

| Route          | Description                                                              |
| -------------- | ------------------------------------------------------------------------ |
| `/paints`      | Interactive page — search, hue filter, child hue filter, paginated grid  |
| `/paints/[id]` | Paint detail page (existing, unchanged)                                  |
| `/hues/[id]`   | Hue detail page (existing, unchanged — linked from "Details" buttons)    |

## Key Files

| Action | File                                                     | Description                                                            |
| ------ | -------------------------------------------------------- | ---------------------------------------------------------------------- |
| Modify | `src/app/paints/page.tsx`                                | Thin server shell: fetch initial data, render client component         |
| Create | `src/modules/paints/components/paint-explorer.tsx`       | Client component orchestrating search, hue filter, and paint grid      |
| Create | `src/modules/paints/components/paint-search-input.tsx`   | Debounced text input with 3-char minimum typeahead                     |
| Modify | `src/modules/hues/components/itten-hue-card.tsx`         | Add `onClick` filter callback + separate "Details" link to `/hues/[id]`|
| Modify | `src/modules/hues/components/child-hue-card.tsx`         | Add `onClick` filter callback + separate "Details" link to `/hues/[id]`|
| Modify | `src/modules/paints/services/paint-service.ts`           | Add `searchPaints()` method                                            |

## Implementation

### 1. Add `searchPaints()` to paint service

Add a method to `paint-service.ts` that searches paints by name or hex with optional filters:

```typescript
async searchPaints(options: {
  query: string
  brandId?: number
  paintType?: string
  hueId?: string
  limit?: number
  offset?: number
}): Promise<{ paints: PaintWithBrand[]; count: number }>
```

- Name matching: `ilike '%query%'` (case-insensitive partial match)
- Hex matching: if query starts with `#`, match against `hex` with `ilike` prefix
- Optional `hueId` filter: combine search with hue filtering
- Returns both paginated results and total count

### 2. Refactor `paints/page.tsx` into thin server shell

The server component fetches initial data (hues, first page of paints, total count, paint counts per hue) and passes it to a new `PaintExplorer` client component. The page itself becomes a thin wrapper.

```tsx
// src/app/paints/page.tsx (simplified)
export default async function PaintsPage({ searchParams }) {
  // Fetch initial hues, paints, counts (same as current)
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <h1>Paints</h1>
      <PaintExplorer
        initialHues={hues}
        initialPaints={initialPaints}
        initialTotalCount={totalPaints}
        huePaintCounts={paintCounts}
      />
    </div>
  )
}
```

### 3. Create `PaintExplorer` client component

The central `'use client'` component that manages all interactive state:

**State:**
- `searchQuery` — current search text (empty = no search active)
- `activeHueId` — selected top-level hue ID (null = no hue filter)
- `activeChildHueId` — selected child hue ID (null = no child filter)
- `childHues` — child hues for the active top-level hue (fetched async)
- `paints` / `totalCount` — current paint results
- `isPending` — loading state via `useTransition`

**Behavior:**
- On search input (3+ chars, debounced 300ms): call `searchPaints()`, update grid
- On top-level hue click: set `activeHueId`, fetch child hues via `hueService.getChildHues()`, fetch paints via `paintService.getPaintsByHueGroup()`, show child hue cards
- On child hue click: set `activeChildHueId`, fetch paints via `paintService.getPaintsByIttenHueId()`, update grid
- On clear (search cleared or hue deselected): reset to initial all-paints view
- Syncs state to URL params: `?q=...&hue=...&childHue=...`

**Layout:**
```
┌─────────────────────────────────────┐
│ Search input                        │
├─────────────────────────────────────┤
│ Hue cards (top-level, always shown) │
│ [Red] [Orange] [Yellow] ...         │
├─────────────────────────────────────┤
│ Child hue cards (when hue selected) │
│ [Crimson] [Scarlet] [Ruby] ...      │
├─────────────────────────────────────┤
│ Paginated paint grid                │
│ (filtered by search / hue / child)  │
└─────────────────────────────────────┘
```

### 4. Create `PaintSearchInput` component

A focused `'use client'` component for the search input:
- Controlled text input
- Debounces onChange by 300ms
- Only fires the search callback when input is 3+ characters (or when cleared)
- Shows a "clear" button when text is present
- Displays "Type 3+ characters to search" hint when 1-2 characters entered

### 5. Refactor hue card components

Modify `itten-hue-card.tsx` and `child-hue-card.tsx` to support two interactions:

- **Card click** → calls an `onSelect` callback (filters paints, no navigation)
- **"Details" button** → links to `/hues/[id]` (navigates to the hue detail page)
- **Selected state** → visually highlighted when active (e.g., ring, border color change)

Both components gain new props:
```typescript
{
  hue: IttenHue
  paintCount: number
  isSelected?: boolean      // visual selected state
  onSelect?: () => void     // filter callback (replaces Link wrapper)
}
```

When `onSelect` is provided, the card body triggers the filter. The "Details" button is always a `<Link>` to `/hues/[id]`. When `onSelect` is not provided (e.g., used on `/hues/[id]` page), the card behaves as a plain link like today.

### 6. URL param sync

Sync interactive state to URL search params so the view is shareable:

| Param      | Value                       | Effect                                 |
| ---------- | --------------------------- | -------------------------------------- |
| `q`        | Search query string         | Activates search filter                |
| `hue`      | Top-level hue UUID          | Activates hue group filter             |
| `childHue` | Child hue UUID              | Activates child hue filter             |
| `page`     | Page number                 | Pagination offset                      |
| `size`     | Page size (25/50/100/200)   | Items per page                         |

On page load, `PaintExplorer` reads these params to restore the view state.

## Notes

- Search is usable without authentication (public page).
- The 3-character minimum prevents overly broad queries and reduces database load.
- The `/hues/[id]` page remains unchanged — it is the dedicated detail view for a hue with full breadcrumbs, child hue listing, and paginated paint grid.
- Consider `pg_trgm` trigram indexes for better fuzzy matching in the future.
- `hue-group-paint-grid.tsx` and `hue-paint-grid.tsx` may become unused after this refactor if all filtering is handled by `PaintExplorer`. They should be kept for use on `/hues/[id]` unless that page is also refactored.
