# Search

**Epic:** Color Analysis
**Type:** Feature
**Status:** In Progress

## Summary

Text search across paint name, hex code, and brand name. Matching paints are visually highlighted on the wheel and listed in the detail panel.

## Acceptance Criteria

- [x] Text input searches across paint name, hex code, and brand name
- [x] Matching paints are highlighted on the wheel with a yellow ring and glow filter
- [x] Non-matching paints dim
- [x] Results appear in the detail panel as a scrollable list
- [x] A clear button (✕) resets the search

## Implementation Plan

### Step 1 — Add search state to `app/page.tsx`

Add a `searchQuery` string state variable alongside the existing state. Add a derived `searchResults` via `useMemo` that filters `processedPaints` by case-insensitive substring match against `name`, `hex`, and brand display name (resolve brand ID → display name via `brands` array). Return an empty array when query is blank.

Derive a `searchMatchIds` Set from `searchResults` for O(1) lookups during rendering.

**Files:** `app/page.tsx`

### Step 2 — Enable the search input in the navbar

The navbar already has a disabled search `<input>` with a `MagnifyingGlassIcon`. Enable it by:

1. Removing the `disabled` attribute.
2. Binding `value` to `searchQuery` and `onChange` to `setSearchQuery`.
3. Adding a clear button (✕) that appears when `searchQuery` is non-empty. Clicking it sets `searchQuery` to `''`.
4. Clearing `selectedGroup` and `selectedPaint` when search query changes (same pattern as brand filter).

**Files:** `app/page.tsx`

### Step 3 — Add search highlight and dim logic to `ColorWheel.tsx`

Pass `searchMatchIds: Set<string>` as a new prop to `ColorWheel`.

Update the `PaintDot` dimming logic to combine brand filter and search:

```
const matchesSearch = searchMatchIds.size === 0 || group.paints.some(p => searchMatchIds.has(p.id))
const matchesBrand = brandFilter.size === 0 || group.paints.some(p => brandFilter.has(p.brand))
const dimmed = !matchesSearch || !matchesBrand
```

For matching paint dots when search is active, add a yellow ring highlight:
- Add an SVG `<circle>` with `stroke="#facc15"` (yellow-400), `strokeWidth={2}`, `fill="none"` around matching dots.
- Add an SVG `<filter>` for a subtle glow effect (`feGaussianBlur` + `feMerge`) and apply it to the highlight circle.

**Files:** `app/components/ColorWheel.tsx`

### Step 4 — Show search results in DetailPanel

The DetailPanel already accepts `matches: ProcessedPaint[]` and `hasSearch: boolean` props. When a search is active:

1. Pass `searchResults` as `matches` and `hasSearch={searchQuery.length > 0}` from `page.tsx`.
2. When `hasSearch` is true and no group is selected, show the search results list in the detail panel (the existing `MatchesList` component already handles this rendering).
3. Clicking a result in the list should select that paint group and paint (existing `onSelectPaint` handler).

**Files:** `app/page.tsx` (prop wiring), `app/components/DetailPanel.tsx` (if any adjustments needed)

### Step 5 — Update navbar badges

Update the paint/color count badges to reflect search filtering. When search is active, show filtered counts (e.g., "12 / 190 paints") similar to how brand filtering shows counts.

**Files:** `app/page.tsx`

### Risks & Considerations

- **Combined filters:** Search and brand filter must compose — a paint must match both to be visible. If brand filter is active and search is active, only paints matching both should be fully opaque.
- **Performance:** With ~190 paints, substring search on every keystroke is fine. No debounce needed.
- **Yellow highlight vs selection:** The yellow search ring must be visually distinct from the white dashed selection ring. Use a solid yellow stroke with glow vs the existing white dashed stroke.
- **Clear on selection:** Decide whether selecting a search result should clear the search query. Recommendation: keep the search active so the user can browse multiple results.
