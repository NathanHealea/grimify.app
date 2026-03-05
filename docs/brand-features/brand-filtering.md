# Brand Filtering

**Epic:** Brand Features
**Type:** Feature
**Status:** Todo

## Summary

Filter the color wheel to show paints from a single brand or all brands. Each brand button uses the brand's color for visual identification.

## Acceptance Criteria

- [ ] Filter options: All, Citadel, Army Painter, Vallejo, Green Stuff World
- [ ] Selecting a brand shows only paints from that brand on the wheel
- [ ] "All" shows paints from every brand
- [ ] Each brand button uses the brand's color

## Implementation Plan

### Step 1: Add brand colors to data

Add a `color` field to `Brand` type and `brands.json` for visual identification in the filter UI.

**Files:**
- `src/types/paint.ts` — Add `color: string` to `Brand` interface
- `src/data/brands.json` — Add `color` hex value to each brand entry:
  - Citadel: `#C7A74D` (gold)
  - Army Painter: `#D32F2F` (red)
  - Vallejo: `#1565C0` (blue)
  - Green Stuff World: `#2E7D32` (green)

### Step 2: Add brand filter state

Add a `brandFilter` state to `src/app/page.tsx` representing the active filter — either `'all'` or a specific brand ID string.

```ts
const [brandFilter, setBrandFilter] = useState<string>('all')
```

No new type needed — the filter value is `'all'` or one of the brand `.id` strings.

### Step 3: Filter paints by brand

Insert a `filteredPaints` useMemo between `processedPaints` and `paintGroups` in `page.tsx`:

```ts
const filteredPaints = useMemo(
  () => brandFilter === 'all'
    ? processedPaints
    : processedPaints.filter((p) => p.brand === brandFilter),
  [processedPaints, brandFilter],
)
```

Update the `paintGroups` useMemo to use `filteredPaints` instead of `processedPaints`.

### Step 4: Enable brand filter UI

Replace the disabled checkboxes in `page.tsx` (sidebar Brand Filter section, ~lines 136-149) with active toggle buttons:

- Add an "All" button as the first option
- One button per brand, rendered from the `brands` array
- Active button gets a filled/highlighted style; inactive buttons are outlined
- Each brand button uses the brand's `color` for its background/border when active
- The "All" button uses a neutral style
- Clicking a button sets `brandFilter` to that brand's ID or `'all'`

### Step 5: Update header stats

Make the navbar badges reflect the current filter:

- Compute `filteredPaintCount` and `filteredColorCount` from `filteredPaints` (or derive from `paintGroups.length` for colors)
- Update the badges to show filtered counts (e.g., "45 paints" instead of "190 paints" when a brand is selected)
- Optionally show "X / Y paints" format so users see both filtered and total

### Step 6: Clear selection on filter change

When the brand filter changes and the currently selected group/paint is no longer visible, clear the selection. Add a `useEffect` or handle inline:

```ts
useEffect(() => {
  if (selectedGroup && !paintGroups.some((g) => g.key === selectedGroup.key)) {
    setSelectedGroup(null)
    setSelectedPaint(null)
  }
}, [paintGroups, selectedGroup])
```

### Affected Files

| File | Changes |
|------|---------|
| `src/types/paint.ts` | Add `color` to `Brand` interface |
| `src/data/brands.json` | Add `color` field to each brand |
| `src/app/page.tsx` | Add filter state, filtered paints memo, update paintGroups dep, replace filter UI, update badges, handle selection invalidation |
