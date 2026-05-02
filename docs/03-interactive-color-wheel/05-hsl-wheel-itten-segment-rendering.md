# HSL Color Wheel — Itten Segment Rendering Refactor

**Epic:** Interactive Color Wheel
**Type:** Refactor
**Status:** Done
**Branch:** `refactor/hsl-wheel-itten-segment-rendering`
**Merge into:** `v1/main`

## Summary

Refactor the segment-wedge rendering in `hsl-color-wheel.tsx` to match the data-driven approach used by the beta reference (`grimify.app.beta/src/components/ColorWheel.tsx`), while keeping the project's 12-segment Itten wheel and existing `sector-path.ts` utilities.

Three changes, all confined to the `segmentWedges` `useMemo`:

1. **Bands as data, not JSX.** Replace the three repeated `<path>` literals with a `bands` array (`innerR`, `outerR`, `lightness`) and a single `flatMap` × `map` — matches the beta and makes adjustments a one-line edit.
2. **Use exact `hueStart` / `hueEnd` with wrap-around handling.** Today the code uses `midAngle ± 15`, which only works because every Itten segment happens to be exactly 30° wide and centred on its midAngle. Switch to the segment's declared boundaries and normalise the Red wrap-around (345°→15°) the same way the beta does — by adding 360° to `hueEnd` when it precedes `hueStart`.
3. **Match the beta's visual constants.** Bump saturation `0.8 → 1` and lower fill opacity `0.25 → 0.1` so the segment tinting reads the same as the beta wheel.

The hue ring, divider lines, segment labels, scheme overlays, and paint markers are untouched.

## Acceptance Criteria

- [x] `segmentWedges` is built from a single `bands` array and a single nested `flatMap`/`map` — no per-band JSX duplication
- [x] Each segment's bands are drawn from `seg.hueStart` to `seg.hueEnd`, with `hueEnd + 360` applied when `hueEnd < hueStart` (Red only)
- [x] All three bands render via `annularSectorPath` (its built-in `innerRadius <= 0` short-circuit produces the inner pie-slice)
- [x] Band fills use `hslToHex(seg.midAngle, 1, band.lightness)` and `fillOpacity={0.1}`
- [x] The Red segment renders as one continuous wedge across the 0° boundary — no gap, no overlap, no second path
- [x] Hue ring, dividers, labels, scheme overlays, and paint markers are visually unchanged
- [x] `npm run build` and `npm run lint` pass with no errors

## Implementation Plan

All work is in `src/modules/color-wheel/components/hsl-color-wheel.tsx`. No utility files or other modules change.

### Step 1 — Why a `bands` array

The beta builds segment wedges by iterating segments × bands:

```ts
const bands = [
  { innerR: 0,                      outerR: WHEEL_RADIUS / 3,       lightness: 0.75 },
  { innerR: WHEEL_RADIUS / 3,       outerR: (WHEEL_RADIUS * 2) / 3, lightness: 0.5  },
  { innerR: (WHEEL_RADIUS * 2) / 3, outerR: WHEEL_RADIUS,           lightness: 0.25 },
]
return COLOR_SEGMENTS.flatMap((seg) => bands.map((band) => /* path */))
```

The project already has `LIGHT_RADIUS` and `MEDIUM_RADIUS` constants for these radii, so the `bands` array can reference them directly.

### Step 2 — Wrap-around normalisation

`sector-path.ts` requires `endAngleDeg > startAngleDeg` for its `largeArc` math (`endAngleDeg - startAngleDeg > 180`) to behave correctly. For the Red segment, `hueStart = 345`, `hueEnd = 15` — so we add 360° to `hueEnd`:

```ts
const start = seg.hueStart
const end = seg.hueEnd < seg.hueStart ? seg.hueEnd + 360 : seg.hueEnd
```

This is the same normalisation the beta uses (`grimify.app.beta/src/components/ColorWheel.tsx:261`), and it works with `sectorPath`/`annularSectorPath` because the `(angle - 90) * DEG_TO_RAD` shift is invariant under +360°.

### Step 3 — Replace `segmentWedges`

**Before** (`src/modules/color-wheel/components/hsl-color-wheel.tsx:114-140`):

```tsx
const segmentWedges = useMemo(
  () =>
    COLOR_SEGMENTS.flatMap((seg) => [
      <path
        key={`light-${seg.midAngle}`}
        d={sectorPath(seg.midAngle - 15, seg.midAngle + 15, LIGHT_RADIUS)}
        fill={hslToHex(seg.midAngle, 0.8, 0.75)}
        fillOpacity={0.25}
        stroke="none"
      />,
      <path
        key={`medium-${seg.midAngle}`}
        d={annularSectorPath(seg.midAngle - 15, seg.midAngle + 15, LIGHT_RADIUS, MEDIUM_RADIUS)}
        fill={hslToHex(seg.midAngle, 0.8, 0.5)}
        fillOpacity={0.25}
        stroke="none"
      />,
      <path
        key={`dark-${seg.midAngle}`}
        d={annularSectorPath(seg.midAngle - 15, seg.midAngle + 15, MEDIUM_RADIUS, WHEEL_RADIUS)}
        fill={hslToHex(seg.midAngle, 0.8, 0.25)}
        fillOpacity={0.25}
        stroke="none"
      />,
    ]),
  []
)
```

**After:**

```tsx
const segmentWedges = useMemo(() => {
  const bands = [
    { innerR: 0,             outerR: LIGHT_RADIUS,  lightness: 0.75, label: 'light'  },
    { innerR: LIGHT_RADIUS,  outerR: MEDIUM_RADIUS, lightness: 0.5,  label: 'medium' },
    { innerR: MEDIUM_RADIUS, outerR: WHEEL_RADIUS,  lightness: 0.25, label: 'dark'   },
  ]
  return COLOR_SEGMENTS.flatMap((seg) => {
    // Red wraps 345°→15°; normalise so end > start for the arc math.
    const start = seg.hueStart
    const end = seg.hueEnd < seg.hueStart ? seg.hueEnd + 360 : seg.hueEnd
    return bands.map((band) => (
      <path
        key={`${band.label}-${seg.midAngle}`}
        d={annularSectorPath(start, end, band.innerR, band.outerR)}
        fill={hslToHex(seg.midAngle, 1, band.lightness)}
        fillOpacity={0.1}
        stroke="none"
      />
    ))
  })
}, [])
```

Notes:
- All three bands now go through `annularSectorPath`. The utility's `innerRadius <= 0` branch (sector-path.ts:57) returns a pie-slice identical to `sectorPath`, so the inner band is unchanged.
- React keys preserve the existing `${role}-${midAngle}` shape so the diff is minimal in DOM terms.
- `sectorPath` is still imported and used by `schemeWedgeOverlays` later in the file — leave the import alone.

### Step 4 — Verify

1. `npm run build` — must compile cleanly.
2. `npm run lint` — must pass.
3. Manually load `/wheel`, switch to the HSL view, and confirm:
   - Red segment renders as one continuous wedge spanning the 12 o'clock position
   - All 12 segments are visible with the brighter / lower-opacity tinting
   - Hue ring, dividers, labels, paint markers all look the same as before
   - Selecting a paint and applying a colour scheme still draws the harmony wedges correctly

### Affected Files

| File | Changes |
|------|---------|
| `src/modules/color-wheel/components/hsl-color-wheel.tsx` | Rewrite `segmentWedges` memo: introduce `bands` array, use `hueStart`/`hueEnd` with wrap-around, switch all bands to `annularSectorPath`, update saturation `0.8 → 1` and opacity `0.25 → 0.1` |

### Risks & Considerations

- **Visual delta is intentional but noticeable.** Switching `(saturation 0.8, opacity 0.25)` to `(saturation 1, opacity 0.1)` changes how prominent the segment tinting is. The two changes partially offset (more saturated, less opaque), but the result is closer to the beta's softer wash than the current denser tint. If the project prefers the current look, drop those two constant changes — the structural refactor (bands array + exact boundaries) still stands on its own.
- **Wrap-around math.** The `+360` normalisation only matters for Red. For the other 11 segments, `hueEnd > hueStart` already, so `start`/`end` come straight from the segment record. The arc-math constants in `sector-path.ts` are unchanged, so no regressions in `schemeWedgeOverlays` or any other caller.
- **`sectorPath` still in use.** `schemeWedgeOverlays` (lines 209-244) calls `sectorPath` directly with explicit wrap splitting; it is unaffected by this refactor and the import stays.
- **No test coverage to update.** Per project conventions there are no component tests for this module.
- **Keys are stable across the rewrite.** `light-0`, `medium-0`, `dark-0`, etc. remain the same, so React reconciles in place.
