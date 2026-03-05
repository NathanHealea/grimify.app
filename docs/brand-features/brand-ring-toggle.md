# Brand Ring Toggle

**Epic:** Brand Features
**Type:** Feature
**Status:** In Progress

## Summary

A toggle that adds colored arc segments around paint circles to indicate brand ownership. For paints with duplicate hex values across brands, the ring is split into segments with a duplicate count badge.

## Acceptance Criteria

- [x] "Brand Ring" toggle adds colored arc segments around paint circles
- [x] Arc color indicates brand ownership
- [x] For paints with duplicate hex values across brands, the ring is split into segments (one per brand)
- [x] A yellow badge shows the duplicate count on paints with duplicates

## Implementation Plan

### Step 1: Add brand colors to brand data

**File:** [brands.json](src/data/brands.json)

Add a `color` field to each brand entry. These colors are used for ring arc segments.

```json
{ "id": "citadel", "color": "#1E56A0" }
{ "id": "army-painter", "color": "#C62828" }
{ "id": "vallejo", "color": "#F9A825" }
{ "id": "green-stuff-world", "color": "#2E7D32" }
```

**File:** [paint.ts](src/types/paint.ts)

Update the `Brand` interface to include the new `color` field.

### Step 2: Add `showBrandRing` state and enable toggle

**File:** [page.tsx](src/app/page.tsx)

- Add `const [showBrandRing, setShowBrandRing] = useState(false)` state.
- Replace the disabled Brand Ring toggle (lines 127–132) with an active toggle that calls `setShowBrandRing`.
- Remove `cursor-not-allowed` and `disabled` from the label/input.
- Pass `showBrandRing` to the `ColorWheel` component.

### Step 3: Accept `showBrandRing` in ColorWheel

**File:** [ColorWheel.tsx](src/components/ColorWheel.tsx)

- Add `showBrandRing: boolean` to `ColorWheelProps`.
- Pass it through to `PaintDot`.

### Step 4: Render brand ring arcs in PaintDot

**File:** [ColorWheel.tsx](src/components/ColorWheel.tsx)

When `showBrandRing` is true, render colored arc segments around each paint circle:

1. **Determine unique brands** in `group.paints` — collect distinct `paint.brand` values.
2. **Look up brand color** from the `brands` array (imported from `@/data/index`).
3. **Compute arc geometry:**
   - Ring inner radius: `r + 1` (just outside the paint circle).
   - Ring outer radius: `r + 4` (3-unit thick ring).
   - Divide 360° equally among the unique brands.
   - Use the existing `buildHueRingPath()` function to generate each arc path, but translated to the dot's `(cx, cy)` position via a `<g transform="translate(cx, cy)">` wrapper.
4. **Render each arc** as a `<path>` with `fill={brandColor}`, `stroke="rgba(0,0,0,0.3)"`, `strokeWidth={0.5}`, and `pointerEvents="none"`.
5. **SVG layer order:** Render brand ring arcs _before_ the main circle and selection ring so the circle paints over the inner edge cleanly, OR render after the circle but ensure the ring sits outside.

**For single-brand groups:** One full 360° arc in the brand color.
**For multi-brand groups:** N equal arc segments, each in its brand's color.

### Step 5: Adjust yellow duplicate badge behavior

The yellow badge already renders for multi-paint groups (`isMulti`). The acceptance criteria calls for it specifically on "paints with duplicates" when brand ring is on. Current behavior should be sufficient — the badge already shows count on groups with >1 paint. No change needed unless the badge should only appear when brand ring is toggled on (clarify with acceptance criteria).

### Risks & Considerations

- **`buildHueRingPath` coordinate system:** The function generates arcs centered at `(0, 0)`. To position arcs around a paint dot, wrap the arc paths in a `<g transform="translate(cx, cy)">` group.
- **Arc sweep direction:** `buildHueRingPath` uses counter-clockwise sweep (matching hue ring convention). This works fine for brand arcs; just ensure the start/end angles divide evenly.
- **Very dark/light paints:** Brand ring arcs may be hard to see against the wheel background. A thin dark stroke on each arc helps visibility.
- **Zoom behavior:** Ring arcs scale naturally with SVG viewBox zoom — no special handling needed.
- **Performance:** One extra `<path>` per brand per group is negligible. No memoization needed beyond what exists.
- **Brand data import:** `PaintDot` needs access to brand metadata. Pass `brands` array as a prop or import directly in ColorWheel.
