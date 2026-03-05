# Brand Legend

**Epic:** Brand Features
**Type:** Feature
**Status:** Todo

## Summary

A side panel legend showing each brand's color dot, icon, name, and the count of paints currently visible on the wheel.

## Acceptance Criteria

- [ ] Displays each brand's color dot
- [ ] Displays each brand's icon
- [ ] Displays each brand's name
- [ ] Displays the count of paints currently visible per brand (respects active brand filter)

## Implementation Plan

### Step 1 — Add `color` field to brand data model

Brands currently have `id`, `name`, `icon`, and `types` but no representative color for the legend dot.

**Files:**

- `src/types/paint.ts` — Add `color: string` to the `Brand` interface
- `src/data/brands.json` — Add a `color` hex value to each brand:
  - Citadel → `#1a56db` (blue — Games Workshop branding)
  - Army Painter → `#4a8c3f` (green — Army Painter branding)
  - Vallejo → `#c0392b` (red — Vallejo branding)
  - Green Stuff World → `#2ecc71` (green — GSW branding)

### Step 2 — Compute paint counts per brand

In `src/app/page.tsx`, add a `useMemo` that derives a `Map<string, number>` mapping brand id → visible paint count from `processedPaints`. This count will naturally respect brand filtering once that feature is implemented, since it derives from the same processed/filtered paint list.

```ts
const brandPaintCounts = useMemo(() => {
  const counts = new Map<string, number>()
  brands.forEach((b) => counts.set(b.id, 0))
  processedPaints.forEach((p) => {
    counts.set(p.brand, (counts.get(p.brand) ?? 0) + 1)
  })
  return counts
}, [processedPaints])
```

### Step 3 — Create `BrandLegend` component

New file: `src/components/BrandLegend.tsx`

**Props:**

- `brands: Brand[]` — brand metadata array
- `paintCounts: Map<string, number>` — brand id → visible paint count

**Rendering:** A vertical list where each row is a flex container with:

1. Color dot — small `div` with `backgroundColor` set to brand color, styled with `rounded-full border border-base-300` (matching existing dot patterns)
2. Icon — brand emoji rendered as text
3. Name — brand name as `text-sm`
4. Count — right-aligned badge showing the number of visible paints (e.g., `text-xs text-base-content/60`)

Follow existing styling conventions from the sidebar sections (section header with `text-xs font-semibold uppercase text-base-content/60`, flex column with `gap-2`).

### Step 4 — Add `BrandLegend` to sidebar

In `src/app/page.tsx`, add a new `<section>` in the sidebar content for the Brand Legend, placed between the "Brand Ring" toggle section and the "Brand Filter" section (above the brand filter checkboxes). This positioning groups brand-related UI together.

Pass `brands` and `brandPaintCounts` as props to the `BrandLegend` component.

### Risks / Notes

- Brand colors are subjective — chosen to approximate each manufacturer's real-world branding. User may want to adjust.
- When brand filtering is later implemented, `brandPaintCounts` should derive from the filtered paint list instead of `processedPaints` to satisfy the "respects active brand filter" acceptance criterion. The current implementation is forward-compatible — just swap the source array.
