# Scheme Brand Filter Interaction

**Epic:** Color Analysis
**Type:** Bug
**Status:** Todo

## Steps to Reproduce

1. Click on **Mithril** (Army Painter) on the color wheel to select it
2. Select **Complementary** color scheme — scheme wedges and highlighted paints appear
3. Click the **Army Painter** brand filter

**Actual:** The selected paint is cleared, scheme wedges disappear, and all scheme indicators are lost.

**Expected:** Mithril remains selected (it belongs to Army Painter, which passes the filter). Scheme wedges stay visible. Non-Army Painter paints are dimmed by the brand filter. Scheme matches in the detail panel show only Army Painter paints within the scheme zones.

## Summary

When a user has a color selected with an active color scheme, toggling a brand filter causes the color scheme indicators (wedges and highlighted paints) to disappear. This happens because `handleBrandFilter` in `page.tsx` unconditionally clears `selectedGroup` and `selectedPaint` on every filter toggle, which removes the anchor point for scheme calculations.

The selected paint should only be cleared if it no longer passes the active filters. Filters should use AND logic: applying a brand filter should dim non-matching paints while preserving the selected paint and scheme visuals. The scheme matches list in the detail panel should also respect the brand filter, showing only scheme-matching paints from the selected brand(s).

## Acceptance Criteria

- [ ] Toggling a brand filter does not clear the selected paint or color scheme
- [ ] Scheme wedge overlays remain visible when a brand filter is active
- [ ] Paints are dimmed using AND logic: must match both brand filter AND scheme zone to appear highlighted
- [ ] Scheme matches in the detail panel are filtered by brand when a brand filter is active
- [ ] If the selected paint's brand is filtered out, the selection and scheme visuals are cleared (edge case)
- [ ] All existing filter combinations continue to work (search + brand, owned + brand, etc.)

## Implementation Plan

The bug has two root causes:

1. **`handleBrandFilter` clears selection** — `page.tsx:196-197` sets `selectedGroup` and `selectedPaint` to `null` on every brand filter toggle, destroying the scheme anchor.
2. **`schemeMatches` ignores brand filter** — `page.tsx:130-133` computes scheme matches from all `processedPaints` without filtering by `brandFilter`.

### Step 1: Stop clearing selection in `handleBrandFilter`

In `src/app/page.tsx`, remove the `setSelectedGroup(null)` and `setSelectedPaint(null)` calls from `handleBrandFilter`. Instead, only clear the selection if the currently selected paint's brand is being filtered out (i.e., the user deselects the brand of the currently selected paint).

```typescript
const handleBrandFilter = useCallback(
  (id: string) => {
    setBrandFilter((prev) => {
      if (id === 'all') return new Set();
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    // Only clear selection if the selected paint's brand would be filtered out
    // (handled via useEffect or inline check — see Step 3)
  },
  [],
);
```

### Step 2: Filter scheme matches by brand

In `src/app/page.tsx`, update the `schemeMatches` memo to apply the brand filter:

```typescript
const schemeMatches = useMemo<ProcessedPaint[]>(() => {
  if (colorScheme === 'none' || !selectedPaint) return [];
  return processedPaints.filter((p) => {
    if (p.id === selectedPaint.id) return false;
    const matchesBrand = brandFilter.size === 0 || brandFilter.has(p.brand);
    return matchesBrand && isSchemeMatching(p);
  });
}, [colorScheme, selectedPaint, processedPaints, isSchemeMatching, brandFilter]);
```

### Step 3: Clear selection when selected paint is filtered out

After `handleBrandFilter`, add logic to clear the selection if the selected paint's brand is no longer in the active filter set. This can be done by checking inside the `setBrandFilter` callback whether the new filter excludes the selected paint, or by adding a `useEffect`:

```typescript
// Clear selection if the selected paint's brand is filtered out
useEffect(() => {
  if (selectedPaint && brandFilter.size > 0 && !brandFilter.has(selectedPaint.brand)) {
    setSelectedGroup(null);
    setSelectedPaint(null);
  }
}, [brandFilter, selectedPaint]);
```

### Affected Files

| File | Changes |
|------|---------|
| `src/app/page.tsx` | Remove unconditional selection clearing from `handleBrandFilter`; add brand filter to `schemeMatches` memo; add edge-case clearing via `useEffect` |

### Risks & Considerations

- The `dimmed` logic in `ColorWheel.tsx:583` already applies AND logic (`!matchesBrand || ... || schemeDimmed`), so paint dot dimming is correct once the selection persists — no changes needed there.
- The scheme wedge rendering (`ColorWheel.tsx:390`) depends only on `colorScheme` and `selectedPaint`, which is correct — wedges show the theoretical zones regardless of brand filtering.
- Search already has its own clearing logic in the search input `onChange` handler, so removing the clearing from `handleBrandFilter` doesn't affect search behavior.
