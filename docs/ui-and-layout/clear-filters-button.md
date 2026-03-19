# Clear Filters Button

**Epic:** UI & Layout
**Type:** Feature
**Status:** Todo

## Summary

Add a "Clear Filters" button that resets all active filters (brand filter, color scheme, owned filter, and selection state) while preserving the current search bar value. This gives users a quick way to return to an unfiltered view without losing their search context.

## Acceptance Criteria

- [ ] A "Clear Filters" button appears in the stats overlay (bottom center of the color wheel) when any non-search filter is active
- [ ] Clicking the button clears: brand filter, color scheme, owned filter, selected paint, and selected group
- [ ] The search bar value is preserved after clearing
- [ ] The button is hidden when no non-search filters are active
- [ ] The button has a clear visual affordance (e.g., an X icon or "Clear Filters" label)

## Implementation Plan

### Step 1: Add `handleClearFilters` callback in `page.tsx`

Create a new `useCallback` in `src/app/page.tsx` that resets all filter state except `searchQuery`:

```ts
const handleClearFilters = useCallback(() => {
  setBrandFilter(new Set())
  setColorScheme('none')
  setOwnedFilter(false)
  setSelectedGroup(null)
  setSelectedPaint(null)
}, [])
```

### Step 2: Add a derived boolean for non-search filter activity

The existing `isAnyFilterActive` includes search. Add a new derived value that excludes search:

```ts
const isNonSearchFilterActive = isFiltered || isSchemeActive || ownedFilter
```

### Step 3: Add the Clear Filters button to the stats overlay

In the stats overlay `<div>` at the bottom center of the color wheel (around line 464), conditionally render a "Clear Filters" button when `isNonSearchFilterActive` is true:

```tsx
{isNonSearchFilterActive && (
  <button
    className='btn btn-ghost btn-xs text-base-content/60'
    onClick={handleClearFilters}>
    Clear Filters
  </button>
)}
```

Place it after the stats text spans so it appears inline with the paint/color/brand counts.

### Affected Files

| File | Changes |
|------|---------|
| `src/app/page.tsx` | Add `handleClearFilters` callback, `isNonSearchFilterActive` derived value, and Clear Filters button in stats overlay |

### Risks & Considerations

- The `showBrandRing` and `showOwnedRing` toggles are visual indicators, not filters — they should **not** be cleared by this button
- If the user has a search query active AND other filters, clearing filters should still show the search-filtered results (the button preserves search)
- Button placement in the stats overlay keeps it discoverable but non-intrusive; an alternative placement would be in the sidebar Filters panel header
