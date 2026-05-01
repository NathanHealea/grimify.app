# HSL Color Wheel — Itten Segment Boundary Rendering

**Epic:** Interactive Color Wheel
**Type:** Refactor
**Status:** Todo
**Branch:** `refactor/hsl-wheel-itten-segment-rendering`
**Merge into:** `v1/main`

## Summary

Refactor `hsl-color-wheel.tsx` so the three-band segment wedges are drawn using the exact `hueStart` / `hueEnd` boundaries defined in `COLOR_SEGMENTS` rather than the `midAngle ± 15` approximation used today.

Visually the segments are identical for all 11 segments that don't cross the 0° boundary, but the Red segment (hueStart = 345°, hueEnd = 15°) requires a wrap-around normalisation. Using the explicit boundaries makes the rendering semantically correct, removes the implicit assumption that every segment is exactly 30° and centered on a round number, and aligns with how the beta reference (`grimify.app.beta/src/components/ColorWheel.tsx`) treats segment data.

## Acceptance Criteria

- [ ] The 12 segment background wedges in `HslColorWheel` are rendered using `seg.hueStart` and `seg.hueEnd` from `COLOR_SEGMENTS` — not `seg.midAngle ± 15`
- [ ] The Red segment (hueStart = 345°, hueEnd = 15°) renders correctly at the top of the wheel with no visual gap or overlap
- [ ] No other rendering layers (hue ring, divider lines, labels, paint markers) are changed
- [ ] `npm run build` and `npm run lint` pass with no errors

## Implementation Plan

The entire change is confined to the `segmentWedges` `useMemo` in `src/modules/color-wheel/components/hsl-color-wheel.tsx`.

### Step 1 — Understand the angle convention mismatch

`sector-path.ts` uses **wheel-position degrees**: 0° = top (12 o'clock), clockwise. `COLOR_SEGMENTS` uses the same convention. The existing code works around the Red segment wrap (345°→15° crossing 0°) by passing `midAngle - 15 = -15` instead of `hueStart = 345`, relying on the fact that -15° and 345° are equivalent in trigonometry.

The refactor makes this normalisation explicit:

```ts
// Normalise a wrap-around segment so sector-path functions receive a
// negative start angle rather than a value > end.
// Example: Red (hueStart=345, hueEnd=15) → start=-15, end=15
const start = seg.hueEnd < seg.hueStart ? seg.hueStart - 360 : seg.hueStart
const end = seg.hueEnd
```

### Step 2 — Update `segmentWedges` in `hsl-color-wheel.tsx`

Replace the current `segmentWedges` memo:

**Before:**
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
const segmentWedges = useMemo(
  () =>
    COLOR_SEGMENTS.flatMap((seg) => {
      // Normalise wrap-around segments (e.g. Red: hueStart=345, hueEnd=15 → start=-15)
      const start = seg.hueEnd < seg.hueStart ? seg.hueStart - 360 : seg.hueStart
      const end = seg.hueEnd
      return [
        <path
          key={`light-${seg.midAngle}`}
          d={sectorPath(start, end, LIGHT_RADIUS)}
          fill={hslToHex(seg.midAngle, 0.8, 0.75)}
          fillOpacity={0.25}
          stroke="none"
        />,
        <path
          key={`medium-${seg.midAngle}`}
          d={annularSectorPath(start, end, LIGHT_RADIUS, MEDIUM_RADIUS)}
          fill={hslToHex(seg.midAngle, 0.8, 0.5)}
          fillOpacity={0.25}
          stroke="none"
        />,
        <path
          key={`dark-${seg.midAngle}`}
          d={annularSectorPath(start, end, MEDIUM_RADIUS, WHEEL_RADIUS)}
          fill={hslToHex(seg.midAngle, 0.8, 0.25)}
          fillOpacity={0.25}
          stroke="none"
        />,
      ]
    }),
  []
)
```

### Affected Files

| File | Changes |
|------|---------|
| `src/modules/color-wheel/components/hsl-color-wheel.tsx` | Replace `midAngle ± 15` with normalised `hueStart` / `hueEnd` in `segmentWedges` |

### Risks & Considerations

- **Visually identical for all but Red.** For every segment except Red, `hueStart = midAngle - 15` and `hueEnd = midAngle + 15`, so the rendered output is byte-for-byte equivalent. The only meaningful change is that Red no longer relies on the implicit `-15 ≡ 345` coincidence.
- **`sector-path.ts` is unchanged.** Negative start angles are already handled correctly by the trig in `sectorPath` / `annularSectorPath` — no changes needed there.
- **No test coverage required.** As per project testing conventions, there are no component tests for this module.
