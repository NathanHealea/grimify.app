# Color Scheme Modes

**Epic:** Color Analysis
**Type:** Feature
**Status:** Completed

## Summary

Select a paint then choose a color scheme to highlight matching paints on the wheel. Non-matching paints dim to near-invisible. Matching regions are shown as translucent wedge overlays.

## Acceptance Criteria

- [x] User can select a color scheme after selecting a paint
- [x] Complementary scheme highlights paints with hue distance > 155°
- [x] Split Complementary scheme highlights paints with hue distance between 120°–180°
- [x] Analogous scheme highlights paints with hue distance < 45°
- [x] Non-matching paints dim to near-invisible when a scheme is active
- [x] Matching regions are shown as translucent wedge overlays on the wheel
- [x] A "No Scheme" option shows all paints without filtering

| Scheme               | Matching Rule                  |
|----------------------|--------------------------------|
| Complementary        | Hue distance > 155°            |
| Split Complementary  | Hue distance between 120°–180° |
| Analogous            | Hue distance < 45°             |

## Implementation Plan

### Step 1 — Add `ColorScheme` type

**File:** `src/types/paint.ts`

Add a union type for the scheme modes:

```ts
export type ColorScheme = 'none' | 'complementary' | 'split-complementary' | 'analogous'
```

### Step 2 — Add color utility functions

**File:** `src/utils/colorUtils.ts`

Add two functions:

1. **`hueDistance(h1: number, h2: number): number`** — Returns the shortest angular distance between two hues (0–180°). Formula: `min(|h1 - h2|, 360 - |h1 - h2|)`.

2. **`getSchemeMatches(selectedPaint, allPaints, scheme): ProcessedPaint[]`** — Filters `allPaints` by scheme rules against the selected paint's hue:
   - `'complementary'` → hue distance > 155°
   - `'split-complementary'` → hue distance between 120°–180°
   - `'analogous'` → hue distance < 45°
   - `'none'` → returns `[]`

3. **`getSchemeWedges(hue, scheme): { startDeg, endDeg }[]`** — Returns the angular ranges for translucent wedge overlays based on the selected hue and scheme:
   - `'complementary'` → single wedge: `hue + 155°` to `hue - 155°` (through 180°)
   - `'split-complementary'` → two wedges: `hue + 120°` to `hue + 180°` and `hue - 180°` to `hue - 120°`
   - `'analogous'` → single wedge: `hue - 45°` to `hue + 45°`

### Step 3 — Add scheme state to page.tsx

**File:** `src/app/page.tsx`

1. Add state: `const [colorScheme, setColorScheme] = useState<ColorScheme>('none')`
2. Add a `useMemo` for `schemeMatches` that calls `getSchemeMatches(selectedPaint, processedPaints, colorScheme)` — depends on `selectedPaint`, `processedPaints`, and `colorScheme`.
3. Reset `colorScheme` to `'none'` when `selectedPaint` is cleared (inside `handleGroupClick` deselection path).
4. Pass `colorScheme`, `setColorScheme`, and `schemeMatches` down to child components.

### Step 4 — Enable scheme selector buttons in sidebar

**File:** `src/app/page.tsx`

Replace the disabled scheme buttons (lines 154–161) with functional buttons:

- Remove `disabled` attribute.
- Highlight the active scheme button (e.g., `btn-primary` when selected, `btn-ghost` otherwise).
- Only enable buttons when a paint is selected (`selectedPaint !== null`); disable otherwise.
- `onClick` calls `setColorScheme()` with the corresponding value.
- Button labels: `None`, `Complementary`, `Split-Comp`, `Analogous`.

### Step 5 — Add dimming logic for non-matching paints

**File:** `src/components/ColorWheel.tsx`

Extend the existing `dimmed` prop logic. Currently dimming is:

```ts
const dimmed = brandFilter.size > 0 && !group.paints.some((p) => brandFilter.has(p.brand))
```

Add scheme dimming: a paint group is dimmed if a scheme is active AND none of its paints appear in `schemeMatches`. Combine with brand filter dimming using OR logic:

```ts
const brandDimmed = brandFilter.size > 0 && !group.paints.some((p) => brandFilter.has(p.brand))
const schemeDimmed = schemeMatches.length > 0 && !group.paints.some((p) => schemeMatchSet.has(p.id))
const dimmed = brandDimmed || schemeDimmed
```

Pass `schemeMatches` (or a pre-built `Set` of matched paint IDs) as a new prop to `ColorWheel`.

### Step 6 — Render scheme wedge overlays on the wheel

**File:** `src/components/ColorWheel.tsx`

Add translucent wedge overlays using the existing `buildHueRingPath()` function:

1. Accept new props: `colorScheme` and `selectedPaint`.
2. Compute wedge ranges using `getSchemeWedges(selectedPaint.hue, colorScheme)`.
3. Render `<path>` elements spanning the full wheel radius (inner=0, outer=WHEEL_RADIUS) with a semi-transparent fill (e.g., `fill="white"`, `opacity={0.08}`).
4. Place these overlays below the paint dots but above the segment backgrounds in the SVG layer order.

### Step 7 — Wire scheme matches into DetailPanel

**File:** `src/app/page.tsx` → `DetailPanel`

Update the `DetailPanel` props currently hardcoded:

- Change `matches={[]}` to `matches={schemeMatches}`
- Change `scheme="None"` to `scheme={colorScheme}`

The `MatchesList` component in `DetailPanel.tsx` already renders matches when the array is non-empty — no changes needed in `DetailPanel.tsx` itself.

### Files Changed

| File | Change |
|------|--------|
| `src/types/paint.ts` | Add `ColorScheme` type |
| `src/utils/colorUtils.ts` | Add `hueDistance()`, `getSchemeMatches()`, `getSchemeWedges()` |
| `src/app/page.tsx` | Add scheme state, useMemo, reset logic, enable buttons, pass props |
| `src/components/ColorWheel.tsx` | Add scheme dimming, render wedge overlays |
