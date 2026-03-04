# Header Stats

**Epic:** UI & Layout
**Type:** Feature
**Status:** In Progress

## Summary

A stats display showing total paint count, unique color count, and search match count when searching.

## Acceptance Criteria

- [x] Displays total paint count
- [ ] Displays unique color count
- [ ] Displays search match count when a search is active

## Current State

The stats section lives in `src/app/page.tsx` lines 48-50, inside the sidebar navbar:

```tsx
<div className="navbar-end w-auto justify-end gap-2">
  <span className="badge badge-sm">{paints.length} paints</span>
  <span className="badge badge-sm">{brands.length} brands</span>
</div>
```

The `paints` array is imported from `@/data/index` and contains all 158 paints as `Paint` objects (`{ name, hex, type, brand }`). Some paints across brands share the same hex value — these are "duplicate colors" that should be deduplicated for the unique count.

No search state or filtering logic exists yet. The search input in the sidebar (lines 42-46) is disabled.

## Implementation Plan

### Part A: Unique Color Count

Add a badge showing how many distinct hex colors exist across all paints.

#### Step 1: Compute unique color count

In `src/app/page.tsx`, add a `useMemo` that deduplicates paints by hex value:

```tsx
const uniqueColorCount = useMemo(
  () => new Set(paints.map((p) => p.hex.toLowerCase())).size,
  [paints],
)
```

Place this near the top of the component, after the existing state declarations. Since `paints` is a static import (not state), the dependency array `[paints]` ensures it only recomputes if the reference changes (effectively once).

#### Step 2: Add the badge

Add a new badge after the existing "paints" badge in the stats navbar-end section:

```tsx
<span className="badge badge-sm">{uniqueColorCount} colors</span>
```

#### Files Changed

| File | Action | Description |
|------|--------|-------------|
| `src/app/page.tsx` | Modify | Add `useMemo` for unique color count, add badge to stats section |

---

### Part B: Search Match Count

Add a badge that appears only when a search is active, showing how many paints match the query.

> **Dependency:** This plan assumes the Search feature (`docs/color-analysis/search.md`) has been implemented, providing a `searchQuery` state and a derived `filteredPaints` or `searchMatches` array in `page.tsx`. If search is not yet implemented, implement it first or add the search state as part of this work.

#### Step 1: Add the conditional badge

In the stats navbar-end section, add a badge that renders only when a search query is active:

```tsx
{searchQuery && (
  <span className="badge badge-sm badge-warning">{searchMatches.length} matches</span>
)}
```

Use `badge-warning` (yellow) to visually distinguish the search count from the static stats. The `searchMatches` array should already exist as a `useMemo` derivative of `paints` filtered by `searchQuery` (from the Search feature implementation).

If search state doesn't exist yet, add minimal state to support this:

```tsx
const [searchQuery, setSearchQuery] = useState('')

const searchMatches = useMemo(
  () =>
    searchQuery
      ? paints.filter(
          (p) =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.hex.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.brand.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : [],
  [paints, searchQuery],
)
```

#### Step 2: Wire the search input

Enable the disabled search input and connect it to `searchQuery` state:

```tsx
<input
  type="text"
  placeholder="Search paints..."
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
/>
```

#### Files Changed

| File | Action | Description |
|------|--------|-------------|
| `src/app/page.tsx` | Modify | Add search state, computed matches, conditional badge, wire search input |

## Risks & Considerations

- **Hex case sensitivity:** Paint hex values may vary in case (`#FF0000` vs `#ff0000`). The unique color computation normalizes to lowercase to avoid false duplicates.
- **Search scope overlap:** Part B introduces search state that overlaps with the full Search feature doc. If Search is implemented first, Part B only needs the badge — no new state or input wiring.
- **Badge overflow:** Three badges fit comfortably in the navbar-end. If more stats are added later, consider a compact layout or tooltip approach.
