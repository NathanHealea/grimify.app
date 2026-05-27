# Previously Viewed Palettes on the Collection Page

**Epic:** Collection Tracking
**Type:** Feature
**Status:** Completed
**Branch:** `feature/collection-previously-viewed-palettes`
**Merge into:** `main`

## Summary

Replace the `RecentPalettesPlaceholder` stub on the My Collection page with a live "Recently viewed palettes" section. When a user visits any palette detail page, that palette's ID is recorded in `localStorage`. The collection page reads those IDs and fetches their summaries to display up to 6 palette cards.

## Acceptance Criteria

- [x] Visiting a palette detail page records its ID in `localStorage` under the key `grimify:recently-viewed-palettes`
- [x] The stored list is deduplicated and capped at 10 IDs (most recent first)
- [x] The My Collection page shows a "Recently viewed palettes" section with up to 6 palette cards
- [x] Each card uses the existing `PaletteCard` component and links to the palette detail page
- [x] If no palettes have been viewed yet, an appropriate empty state is shown
- [x] The `RecentPalettesPlaceholder` component is removed

## Implementation Plan

Domain modules touched: `palettes` (service + action + util + tracker component), `collection` (replacement section component + page wiring).

### 1. Add `listPalettesByIds` to the palette service

In [src/modules/palettes/services/palette-service.ts](src/modules/palettes/services/palette-service.ts), add a method modeled on `listPalettesForUser` (same `select` projection so the `RawSummaryRow` mapping can be reused).

```ts
async listPalettesByIds(ids: string[]): Promise<PaletteSummary[]> { ... }
```

- **Empty input short-circuit:** if `ids.length === 0`, return `[]` immediately. A `.in('id', [])` filter is wasted IO.
- **Query shape:** `from('palettes').select('id, name, is_public, updated_at, profiles(display_name), palette_paints(paint_id, paints(hex))').in('id', ids)`. Include `profiles(display_name)` so cards can credit the owner when a public palette belongs to another user (matches `listPublicPalettes`).
- **Visibility:** RLS hides palettes the viewer can't see (deleted, made private since the visit, etc.). Caller treats missing rows as "drop silently."
- **Ordering:** result is unordered relative to the input. The caller re-orders by position in the input array.

### 2. Create `getRecentPaletteSummaries` server action

New file [src/modules/palettes/actions/get-recent-palette-summaries.ts](src/modules/palettes/actions/get-recent-palette-summaries.ts).

```ts
'use server'
export async function getRecentPaletteSummaries(ids: string[]): Promise<PaletteSummary[]> { ... }
```

- Top-of-file `'use server'` directive (matches the other actions in this module).
- Defensive: cap input length at 10 (`ids.slice(0, 10)`) to mirror the storage cap and avoid arbitrary client-driven query size.
- Calls `listPalettesByIds(ids)` via `getPaletteService()` from [src/modules/palettes/services/palette-service.server.ts](src/modules/palettes/services/palette-service.server.ts).
- Re-sorts results to match the input order: build a `Map<id, PaletteSummary>` from the response, then map the input `ids` through the map and drop misses.
- Returns a bare `PaletteSummary[]` (no `ActionResult` wrapper) — there is no failure mode that needs to surface to the user; missing IDs simply produce a shorter list.

### 3. Create `recently-viewed-palettes` localStorage util

New file [src/modules/palettes/utils/recently-viewed-palettes.ts](src/modules/palettes/utils/recently-viewed-palettes.ts). Exports:

- `const RECENTLY_VIEWED_KEY = 'grimify:recently-viewed-palettes'`
- `getRecentlyViewedPaletteIds(): string[]` — returns `[]` when `typeof window === 'undefined'`; reads `localStorage.getItem(RECENTLY_VIEWED_KEY)`; parses; validates the result is an array of strings; returns `[]` on any parse/shape failure (do not throw).
- `addRecentlyViewedPaletteId(id: string): void` — no-op when `typeof window === 'undefined'`. Reads current list via `getRecentlyViewedPaletteIds()`, removes any existing entry for `id`, prepends `id`, slices to first 10, writes back as JSON. Wrap the `setItem` call in a try/catch so quota errors are swallowed silently.

Constants live in this util file rather than a separate constants file (matches the file-per-export convention; the key is co-located with its only consumers).

### 4. Create `PaletteViewTracker` client component

New file [src/modules/palettes/components/palette-view-tracker.tsx](src/modules/palettes/components/palette-view-tracker.tsx).

```tsx
'use client'
import { useEffect } from 'react'
import { addRecentlyViewedPaletteId } from '@/modules/palettes/utils/recently-viewed-palettes'

export function PaletteViewTracker({ id }: { id: string }) {
  useEffect(() => { addRecentlyViewedPaletteId(id) }, [id])
  return null
}
```

`useEffect` deps are `[id]` (not `[]`) so re-renders with a different id still record. Returns `null` — does not affect layout.

### 5. Wire tracker into the palette detail page

Modify [src/app/palettes/[id]/page.tsx](src/app/palettes/[id]/page.tsx). The page already resolves `const { id } = await params`. Render the tracker inside the existing `<Main>` alongside `PaletteDetail`:

```tsx
<Main>
  {jsonLd && <JsonLd data={jsonLd} />}
  <PaletteViewTracker id={id} />
  <PaletteDetail ... />
</Main>
```

Tracker placement is after the visibility guards (`notFound()` calls) — we only record visits to palettes the viewer actually saw.

### 6. Create `RecentlyViewedPalettes` client component

New file [src/modules/collection/components/recently-viewed-palettes.tsx](src/modules/collection/components/recently-viewed-palettes.tsx). A `'use client'` component:

1. Local state: `summaries: PaletteSummary[] | null` (null = "still loading on first paint", `[]` = "loaded, none to show").
2. `useEffect` with `[]` deps: reads IDs via `getRecentlyViewedPaletteIds()`, slices to 6, calls `getRecentPaletteSummaries(...)`, stores the result in state. If the slice is empty, sets state to `[]` without calling the action.
3. SSR render: returns the section frame with the heading and a placeholder grid of three skeleton tiles (mirrors the placeholder's visual rhythm so the page doesn't reflow on hydration). This matches what `summaries === null` shows.
4. Loaded with results: renders the heading and a responsive grid of `PaletteCard` tiles. Reuse `PaletteCardGrid` from [src/modules/palettes/components/palette-card-grid.tsx](src/modules/palettes/components/palette-card-grid.tsx) — same `sm:grid-cols-2 lg:grid-cols-3` rhythm as elsewhere. Pass `canEditAll={false}` (these are "viewed", not "owned").
5. Loaded with zero results: render the heading plus a single muted line — `<p className="text-sm text-muted-foreground">No recently viewed palettes yet.</p>` Section is always rendered (don't hide it) so the page layout is stable across visits.

Heading is `<h2 className="text-xl font-semibold">Recently viewed palettes</h2>` — preserves the typographic level used by the placeholder it replaces.

### 7. Replace the placeholder on the collection page

Modify [src/app/collection/page.tsx](src/app/collection/page.tsx):

- Replace `import { RecentPalettesPlaceholder } from '@/modules/collection/components/recent-palettes-placeholder'` with `import { RecentlyViewedPalettes } from '@/modules/collection/components/recently-viewed-palettes'`.
- Replace `<RecentPalettesPlaceholder />` with `<RecentlyViewedPalettes />`.

Page stays a server component; the new section is a client island.

### 8. Delete the placeholder component

Remove [src/modules/collection/components/recent-palettes-placeholder.tsx](src/modules/collection/components/recent-palettes-placeholder.tsx). Verify with `grep -rn "RecentPalettesPlaceholder" src/` that no other importer remains before deleting.

### Affected Files

| File | Changes |
|------|---------|
| [src/modules/palettes/services/palette-service.ts](src/modules/palettes/services/palette-service.ts) | Add `listPalettesByIds(ids: string[])` method; empty-input short-circuit; reuse `listPalettesForUser`'s row mapping |
| [src/modules/palettes/actions/get-recent-palette-summaries.ts](src/modules/palettes/actions/get-recent-palette-summaries.ts) | New — `'use server'` action: caps input at 10, fetches via service, re-orders to match input order |
| [src/modules/palettes/utils/recently-viewed-palettes.ts](src/modules/palettes/utils/recently-viewed-palettes.ts) | New — exports `RECENTLY_VIEWED_KEY`, `getRecentlyViewedPaletteIds`, `addRecentlyViewedPaletteId` with SSR + quota guards |
| [src/modules/palettes/components/palette-view-tracker.tsx](src/modules/palettes/components/palette-view-tracker.tsx) | New — `'use client'`, `useEffect([id])`, renders `null` |
| [src/modules/collection/components/recently-viewed-palettes.tsx](src/modules/collection/components/recently-viewed-palettes.tsx) | New — `'use client'`, reads localStorage in `useEffect`, fetches via action, renders heading + grid + empty state |
| [src/app/palettes/[id]/page.tsx](src/app/palettes/[id]/page.tsx) | Render `<PaletteViewTracker id={id} />` inside `<Main>` (after visibility guards) |
| [src/app/collection/page.tsx](src/app/collection/page.tsx) | Swap placeholder import/render for `RecentlyViewedPalettes` |
| [src/modules/collection/components/recent-palettes-placeholder.tsx](src/modules/collection/components/recent-palettes-placeholder.tsx) | Delete |

### Tests

`CLAUDE.md` reports `Testing: none` with no test files in the repo — no unit tests to add. Manual verification:

- Open three palette detail pages → reload `/collection` → confirm three cards appear in most-recent-first order.
- Open the same palette twice in different orders → confirm dedupe (one card, position updated).
- Open 12 palettes → confirm only the 10 most recent are persisted and only the top 6 are rendered.
- Sign-out / clear `localStorage` → confirm the empty-state line renders.
- View a palette, delete it (or flip it private as another user), reload `/collection` → confirm the dropped row simply doesn't render (no error).

### Risks & Considerations

- **SSR hydration:** `localStorage` is unavailable during SSR. The util guards with `typeof window !== 'undefined'`, and `RecentlyViewedPalettes` defers all reads to `useEffect`, rendering a stable skeleton on both server and first client paint to avoid hydration mismatch.
- **RLS filtering:** `listPalettesByIds` returns only rows visible under RLS. A palette deleted or flipped to private after the visit silently disappears from the list — intended behavior, no toast needed.
- **Order preservation:** Supabase returns rows in arbitrary order from `.in('id', ...)`. The action re-sorts by the input ID positions before returning, so the client renders most-recent-first.
- **Input size cap:** The action caps `ids` at 10 to match the storage cap, even though the storage util already trims. Defense-in-depth against a corrupted or tampered `localStorage` value.
- **Quota errors:** `localStorage.setItem` can throw (private browsing, full quota). The util swallows the error — failing to record a visit is non-critical and should never break the detail page.
- **No tracking on edit page:** Only `/palettes/[id]` records visits; `/palettes/[id]/edit` does not. Matches the acceptance criterion that says "palette detail page."
