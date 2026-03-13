# Hue Value Suggestions

**Epic:** Color Analysis
**Type:** Feature
**Status:** Todo

## Summary

When a paint is selected, show a list of paints in the same hue family but with different lightness values. This helps miniature painters find highlight, midtone, and shadow paints within the same color family to build smooth color transitions and better color combinations.

## Acceptance Criteria

- [ ] When a paint is selected, a "Tonal Values" section appears in the DetailPanel below the paint details
- [ ] The section lists paints within a narrow hue range (±15°) of the selected paint, sorted by lightness (light to dark)
- [ ] The selected paint is visually indicated in the list (highlighted or marked)
- [ ] Each entry shows a color swatch, paint name, brand icon, and lightness percentage
- [ ] Paints are grouped into value bands: Highlight (L > 70%), Midtone (30% ≤ L ≤ 70%), Shadow (L < 30%)
- [ ] The list respects active brand filters (only shows paints from enabled brands)
- [ ] Clicking a paint in the list selects it (same behavior as scheme matches)
- [ ] The section is hidden when no paint is selected
- [ ] Empty state: if no other paints share the hue range, show "No tonal matches found"

## Implementation Plan

### Step 1: Create hue matching utility

**`src/utils/colorUtils.ts`** — Add a function to find paints within a hue tolerance:

```typescript
/** Find paints with similar hue, sorted by lightness (light to dark) */
export function findTonalMatches(
  selectedPaint: ProcessedPaint,
  allPaints: ProcessedPaint[],
  hueTolerance: number = 15
): ProcessedPaint[] {
  const selectedHsl = hexToHsl(selectedPaint.hex)
  return allPaints
    .filter((p) => p.id !== selectedPaint.id && hueDistance(hexToHsl(p.hex).h, selectedHsl.h) <= hueTolerance)
    .sort((a, b) => hexToHsl(b.hex).l - hexToHsl(a.hex).l) // light to dark
}
```

This reuses the existing `hueDistance` function. The tolerance of ±15° keeps results tight within the same color family while still finding useful matches.

### Step 2: Compute tonal matches in page.tsx

**`src/app/page.tsx`** — Add a `useMemo` for tonal matches, following the same pattern as `schemeMatches`:

```typescript
const tonalMatches = useMemo<ProcessedPaint[]>(() => {
  if (!selectedPaint) return []
  const matches = findTonalMatches(selectedPaint, processedPaints)
  // Respect brand filter
  if (brandFilter.size > 0) {
    return matches.filter((p) => brandFilter.has(p.brand))
  }
  return matches
}, [selectedPaint, processedPaints, brandFilter])
```

Pass `tonalMatches` to DetailPanel as a new prop.

### Step 3: Add TonalValues component to DetailPanel

**`src/components/DetailPanel.tsx`** — Add a new `TonalValues` sub-component, placed after the collection button and before the MatchesList:

```typescript
interface TonalValuesProps {
  tonalMatches: ProcessedPaint[]
  selectedPaint: ProcessedPaint
  brands: Brand[]
  onSelectPaint: (paint: ProcessedPaint) => void
}
```

The component groups paints into value bands:
- **Highlight** — lightness > 70%
- **Midtone** — lightness 30%–70%
- **Shadow** — lightness < 30%

Each band is rendered as a labeled group with paint entries showing:
- Color swatch (small square)
- Paint name (truncated)
- Brand icon
- Lightness percentage (right-aligned, monospace)

The selected paint's lightness band is indicated with a subtle marker or highlight.

Layout follows the existing `MatchesList` pattern: compact vertical list with hover state, scrollable within a max height.

### Step 4: Update DetailPanel props and render

**`src/components/DetailPanel.tsx`** — Add `tonalMatches: ProcessedPaint[]` to `DetailPanelProps`. Render `<TonalValues>` in the single-paint detail view (the `if (paint)` branch), between the collection button and the scheme/search matches:

```tsx
<button /* collection toggle */ />
<TonalValues
  tonalMatches={tonalMatches}
  selectedPaint={paint}
  brands={brands}
  onSelectPaint={onSelectPaint}
/>
<MatchesList /* existing scheme/search matches */ />
```

### Affected Files

| File | Changes |
|------|---------|
| `src/utils/colorUtils.ts` | Add `findTonalMatches()` utility function |
| `src/app/page.tsx` | Add `tonalMatches` memo, pass to DetailPanel |
| `src/components/DetailPanel.tsx` | Add `TonalValues` component, add `tonalMatches` prop |

### Risks & Considerations

- **Performance:** `findTonalMatches` calls `hexToHsl` for every paint on each selection change. With 439 paints this is negligible, but if the dataset grows significantly, pre-computing HSL values could help. The existing codebase already calls `hexToHsl` per-paint in multiple memos without issue.
- **Hue tolerance tuning:** ±15° is a starting point. Very saturated colors may need tighter tolerance, while desaturated colors (grays, browns) may have unreliable hue values. Consider showing a note for very low-saturation paints (S < 10%) where hue is essentially meaningless.
- **Low-saturation paints:** Paints with very low saturation (near gray) have unstable hue values. The hue distance calculation may produce unexpected groupings for these paints. Consider filtering out paints with saturation below a threshold (e.g., S < 5%) from tonal matches, or grouping them separately as "Neutrals."
- **Overlap with scheme matches:** When an analogous color scheme is active, tonal matches will overlap significantly with scheme matches (both use hue proximity). The UI should make clear these are different tools — tonal values focus on lightness variation within a narrow hue, while analogous focuses on hue variation.
