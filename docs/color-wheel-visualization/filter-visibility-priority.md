# Filter Visibility Priority

**Epic:** Color Wheel Visualization
**Type:** Bug
**Status:** Todo

## Summary

When multiple filters are active simultaneously (brand filter, search, color scheme), the highest-priority filter should determine paint visibility on the wheel. Currently, brand filter and search use AND logic — a paint must match both to be visible. When color schemes are added, this AND approach means scheme-matched paints get dimmed if they don't also match the search query, which is incorrect.

The expected priority cascade (lowest → highest):

1. **Brand filter** — always applies as the base constraint
2. **Search** — determines visibility when no color scheme is active
3. **Color scheme** — when active, takes over visibility from search

## Current Behavior

```ts
const matchesBrand = brandFilter.size === 0 || group.paints.some((p) => brandFilter.has(p.brand))
const matchesSearch = searchMatchIds.size === 0 || group.paints.some((p) => searchMatchIds.has(p.id))
const dimmed = !matchesBrand || !matchesSearch
```

Both filters must match (AND logic). When color schemes are added with the same pattern, a user who searches "red" and then activates a Complementary scheme would see complementary paints dimmed if they don't also contain "red" — defeating the purpose of the scheme.

## Expected Behavior

When a higher-priority filter is active, it takes over from lower-priority filters for determining which paints are highlighted vs dimmed:

- **Only brand filter active:** paints matching the brand are visible
- **Search active (no scheme):** paints matching search AND brand filter are visible
- **Color scheme active:** paints matching scheme AND brand filter are visible (search dimming is overridden)

Brand filter always applies as a base constraint. The "override" is between search and color scheme — whichever is the highest active filter wins.

## Acceptance Criteria

- [ ] Brand filter always constrains the visible set of paints
- [ ] When a color scheme is active, scheme matches determine visibility (search does not dim scheme matches)
- [ ] When no color scheme is active, search matches determine visibility (current behavior)
- [ ] When only brand filter is active, all brand-matched paints are visible (current behavior)

## Implementation Plan

### Step 1 — Update dimming logic in `ColorWheel.tsx`

**File:** `src/components/ColorWheel.tsx`

When the color scheme feature is implemented (see `docs/color-analysis/color-scheme-modes.md`), the dimming logic in the paint groups rendering loop (~line 502) should use priority-based evaluation instead of AND logic.

Add `schemeMatchIds: Set<string>` as a new prop (this will come from the color scheme feature). Update the dimming calculation:

```ts
const matchesBrand = brandFilter.size === 0 || group.paints.some((p) => brandFilter.has(p.brand))
const matchesSearch = searchMatchIds.size === 0 || group.paints.some((p) => searchMatchIds.has(p.id))
const matchesScheme = schemeMatchIds.size === 0 || group.paints.some((p) => schemeMatchIds.has(p.id))

const hasActiveScheme = schemeMatchIds.size > 0
const dimmed = !matchesBrand || (hasActiveScheme ? !matchesScheme : !matchesSearch)
```

**Logic:**
- Brand filter is always checked (`!matchesBrand` always dims)
- If a scheme is active → use scheme for the highlight/dim decision
- If no scheme → use search for the highlight/dim decision
- If neither → nothing dims beyond brand filter

### Step 2 — Update search highlight when scheme is active

**File:** `src/components/ColorWheel.tsx`

When a color scheme is active, the yellow search highlight rings should not render — the scheme takes over the visual highlighting. Update the `searchHighlight` prop passed to `PaintDot`:

```ts
searchHighlight={searchMatchIds.size > 0 && !hasActiveScheme && matchesSearch}
```

This prevents search rings from cluttering the wheel when the user is using a color scheme.

### Step 3 — Integrate with color scheme implementation

**File:** `docs/color-analysis/color-scheme-modes.md`

Update Step 5 (dimming logic) of the color scheme modes doc to reference this priority-based approach instead of simple OR/AND logic. The scheme doc's current plan uses:

```ts
const dimmed = brandDimmed || schemeDimmed
```

Replace with the priority-based logic from Step 1 above, which also accounts for search.

### Files Changed

| File | Changes |
|------|---------|
| `src/components/ColorWheel.tsx` | Update dimming logic to use priority cascade, adjust search highlight |
| `docs/color-analysis/color-scheme-modes.md` | Update Step 5 to reference priority-based dimming |

## Risks & Considerations

- **Implementation timing:** This bug describes behavior that only manifests when color schemes are implemented. The fix should be integrated as part of the color scheme feature work, not as a standalone change.
- **Brand filter always applies:** The priority cascade does NOT mean color schemes override brand filter. A Vallejo-only brand filter will still hide Citadel paints even if they match the scheme. Brand filter is the base constraint; search and scheme compete for the "highlight" layer on top.
- **Search badge counts:** The navbar badges should continue to reflect search + brand filter counts even when a scheme is active. The scheme only affects visual dimming on the wheel, not the reported counts.
