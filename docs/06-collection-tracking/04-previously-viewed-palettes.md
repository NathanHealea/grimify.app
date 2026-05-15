# Previously Viewed Palettes on the Collection Page

**Epic:** Collection Tracking
**Type:** Feature
**Status:** Todo
**Branch:** `feature/collection-previously-viewed-palettes`
**Merge into:** `main`

## Summary

Replace the `RecentPalettesPlaceholder` stub on the My Collection page with a live "Recently viewed palettes" section. When a user visits any palette detail page, that palette's ID is recorded in `localStorage`. The collection page reads those IDs and fetches their summaries to display up to 6 palette cards.

## Acceptance Criteria

- [ ] Visiting a palette detail page records its ID in `localStorage` under the key `grimify:recently-viewed-palettes`
- [ ] The stored list is deduplicated and capped at 10 IDs (most recent first)
- [ ] The My Collection page shows a "Recently viewed palettes" section with up to 6 palette cards
- [ ] Each card uses the existing `PaletteCard` component and links to the palette detail page
- [ ] If no palettes have been viewed yet, an appropriate empty state is shown
- [ ] The `RecentPalettesPlaceholder` component is removed

## Implementation Plan

### 1. Add `listPalettesByIds` to the palette service

In `src/modules/palettes/services/palette-service.ts`, add a new method that fetches `PaletteSummary[]` for a given array of IDs. Uses `in` filtering on the `palettes` table (same shape as `listPalettesForUser`). Returns only IDs that exist and are visible to the caller (RLS enforced). The result is an unsorted array — the caller is responsible for re-ordering by the original ID order.

### 2. Create `getRecentPaletteSummaries` server action

New file `src/modules/palettes/actions/get-recent-palette-summaries.ts`. Accepts `ids: string[]`, calls `listPalettesByIds`, and returns `PaletteSummary[]` ordered to match the input ID order. Used by the client-side `RecentlyViewedPalettes` component to fetch data after reading IDs from `localStorage`.

### 3. Create `recently-viewed-palettes` localStorage util

New file `src/modules/palettes/utils/recently-viewed-palettes.ts`. Exports:

- `RECENTLY_VIEWED_KEY = 'grimify:recently-viewed-palettes'`
- `getRecentlyViewedPaletteIds(): string[]` — reads and parses the array from `localStorage`; returns `[]` on parse failure or if `localStorage` is unavailable (SSR guard)
- `addRecentlyViewedPaletteId(id: string): void` — prepends `id`, deduplicates, trims to max 10, and writes back to `localStorage`

### 4. Create `PaletteViewTracker` client component

New file `src/modules/palettes/components/palette-view-tracker.tsx`. A `'use client'` component that accepts `id: string`. On mount (`useEffect` with `[]` deps), calls `addRecentlyViewedPaletteId(id)`. Renders nothing (`null`). Placed on the palette detail page to passively record visits without affecting layout.

### 5. Wire tracker into the palette detail page

Modify `src/app/palettes/[id]/page.tsx` to render `<PaletteViewTracker id={params.id} />` alongside the existing palette detail content.

### 6. Create `RecentlyViewedPalettes` client component

New file `src/modules/collection/components/recently-viewed-palettes.tsx`. A `'use client'` component that:

1. Reads IDs from `localStorage` via `getRecentlyViewedPaletteIds()` inside a `useEffect` (avoids SSR mismatch)
2. Calls `getRecentPaletteSummaries(ids.slice(0, 6))` to fetch summaries
3. Renders a section with heading "Recently viewed palettes" and a responsive grid using existing `PaletteCard` components
4. Shows an empty state ("No recently viewed palettes yet") if the ID list is empty or no summaries are returned

### 7. Replace the placeholder on the collection page

Modify `src/app/collection/page.tsx`:
- Replace `import { RecentPalettesPlaceholder }` with `import { RecentlyViewedPalettes }`
- Replace `<RecentPalettesPlaceholder />` with `<RecentlyViewedPalettes />`

### 8. Delete the placeholder component

Remove `src/modules/collection/components/recent-palettes-placeholder.tsx`.

### Affected Files

| File | Changes |
|------|---------|
| `src/modules/palettes/services/palette-service.ts` | Add `listPalettesByIds(ids: string[])` method |
| `src/modules/palettes/actions/get-recent-palette-summaries.ts` | New — server action fetching summaries by ID array |
| `src/modules/palettes/utils/recently-viewed-palettes.ts` | New — localStorage read/write helpers |
| `src/modules/palettes/components/palette-view-tracker.tsx` | New — client component recording palette visits |
| `src/modules/collection/components/recently-viewed-palettes.tsx` | New — replaces placeholder with live section |
| `src/app/palettes/[id]/page.tsx` | Add `<PaletteViewTracker id={params.id} />` |
| `src/app/collection/page.tsx` | Swap placeholder import/render for `RecentlyViewedPalettes` |
| `src/modules/collection/components/recent-palettes-placeholder.tsx` | Delete |

### Risks & Considerations

- `localStorage` is unavailable during SSR — `getRecentlyViewedPaletteIds` must guard against this (check `typeof window !== 'undefined'`), and the `RecentlyViewedPalettes` component must defer reading IDs to `useEffect` to avoid hydration mismatches.
- The `listPalettesByIds` query returns only palettes visible under RLS. If a viewed palette was deleted or made private after the visit, it simply won't appear — no error handling needed.
- ID ordering from `localStorage` must be preserved after the server fetch; sort the returned summaries by their position in the input ID array before rendering.
