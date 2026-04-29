# Color Wheel Zoom — Paint Marker Scaling

**Epic:** Interactive Color Wheel
**Type:** Refactor
**Status:** Completed
**Branch:** `refactor/color-wheel-zoom-marker-scale`
**Merge into:** `v1/main`

## Summary

When zooming in on the color wheel, paint markers currently stay at a fixed SVG radius. Because zoom is implemented by shrinking the viewBox, each SVG unit occupies more screen pixels as you zoom in — so markers appear physically larger and begin to overlap, making dense areas harder to read rather than easier.

This refactor scales marker size inversely with zoom level so markers maintain a constant apparent screen size (or shrink slightly), eliminating overlap growth and enabling more precise inspection at high zoom.

## Acceptance Criteria

- [x] Paint markers on both the Munsell and HSL color wheels scale down proportionally as zoom increases
- [x] At zoom level 1, markers are the same size as before (no visual regression)
- [x] At zoom level 10 (max), markers are visibly smaller and non-overlapping in dense regions
- [x] Marker stroke width also scales with zoom so the white outline stays proportional
- [x] Diamond markers (metallic paints) scale the same way as circle markers
- [x] `npm run build` and `npm run lint` pass with no errors

## Implementation Plan

The approach is to expose the raw `zoom` value from `useWheelTransform`, pass it through each wheel component to `PaintMarker`, and scale the marker geometry by `1 / zoom`. This is the minimal change needed — no new hooks, no new utils, no coordinate system changes.

### Step 1 — Expose `zoom` from `useWheelTransform`

**File:** `src/modules/color-wheel/hooks/use-wheel-transform.ts`

Add `zoom: number` to the `WheelTransformState` interface (after `viewBox`). Return the existing `zoom` state value from the hook.

```ts
export interface WheelTransformState {
  viewBox: string
  zoom: number          // ← add this
  resetTransform: () => void
  // ...rest unchanged
}

// In the return object:
return {
  viewBox: viewBoxStr,
  zoom,                  // ← add this
  // ...rest unchanged
}
```

### Step 2 — Scale geometry in `PaintMarker`

**File:** `src/modules/color-wheel/components/paint-marker.tsx`

Add a `zoom` prop (default `1`). Scale the circle radius, diamond half-size, and stroke width by `1 / zoom`.

```tsx
export function PaintMarker({
  paint, cx, cy, onHover, onClick, zoom = 1,
}: {
  // ...existing props
  zoom?: number
}) {
  const r = RADIUS / zoom
  const d = (RADIUS * 1.4) / zoom
  const shared = {
    fill: paint.hex,
    stroke: 'white',
    strokeWidth: 1 / zoom,
    // ...rest unchanged
  }

  if (paint.is_metallic) {
    const points = `${cx},${cy - d} ${cx + d},${cy} ${cx},${cy + d} ${cx - d},${cy}`
    return <polygon points={points} {...shared} />
  }

  return <circle cx={cx} cy={cy} r={r} {...shared} />
}
```

Remove the `DIAMOND_HALF` constant since the value is now computed inline.

### Step 3 — Pass `zoom` through `MunsellColorWheel`

**File:** `src/modules/color-wheel/components/munsell-color-wheel.tsx`

Destructure `zoom` from `useWheelTransform`:

```tsx
const { viewBox, zoom, onWheel, ... } = useWheelTransform(VIEW_BOX)
```

Pass `zoom` to each `<PaintMarker />`:

```tsx
<PaintMarker key={paint.id} paint={paint} cx={x} cy={y} zoom={zoom} onHover={handleHover} onClick={handlePaintClick} />
```

### Step 4 — Pass `zoom` through `HslColorWheel`

**File:** `src/modules/color-wheel/components/hsl-color-wheel.tsx`

Same change as Step 3 — destructure `zoom` from `useWheelTransform`, pass it to each `<PaintMarker />`.

### Affected Files

| File | Changes |
|------|---------|
| `src/modules/color-wheel/hooks/use-wheel-transform.ts` | Add `zoom: number` to `WheelTransformState`; return `zoom` from the hook |
| `src/modules/color-wheel/components/paint-marker.tsx` | Add `zoom?: number` prop; scale `r`, diamond half-size, and `strokeWidth` by `1 / zoom` |
| `src/modules/color-wheel/components/munsell-color-wheel.tsx` | Destructure `zoom` from `useWheelTransform`; pass to `PaintMarker` |
| `src/modules/color-wheel/components/hsl-color-wheel.tsx` | Destructure `zoom` from `useWheelTransform`; pass to `PaintMarker` |

### Risks & Considerations

- At high zoom (10×), markers will be 10× smaller in SVG units — they remain perfectly clickable/hoverable since SVG hit areas scale with `r`, but verify they are still large enough to interact with on a small screen.
- The `strokeWidth: 1 / zoom` change means the white outline scales with the fill. At zoom 1 it stays 1px — same as before. No visual regression at baseline.
- If future requirements want markers to shrink faster than `1/zoom` (e.g., to give more "breathing room" at mid-zoom levels), the scale formula can be changed to `RADIUS / Math.sqrt(zoom)` without touching any other code.
