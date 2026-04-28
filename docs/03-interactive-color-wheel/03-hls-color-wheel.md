# HSL Color Wheel

**Epic:** Interactive Color Wheel
**Type:** Feature
**Status:** Todo
**Branch:** `feature/hls-color-wheel`
**Merge into:** `v1/main`

## Summary

Add an HSL color wheel variant alongside the existing Munsell wheel. A toggle button on the `/wheel` page switches between the two views client-side — no navigation, no data reload. The HSL wheel places every paint by raw `hslToPosition()` coordinates against a continuous conic-gradient background, giving painters a perceptually accurate CSS color space view.

## Acceptance Criteria

- [ ] A toggle button on `/wheel` switches between the Munsell and HSL wheel views
- [ ] Switching views does not reload paint data — state is managed client-side
- [ ] The HSL wheel background shows the full hue spectrum (0–360°) as a continuous conic gradient disc
- [ ] A white radial gradient overlay fades from center outward to represent the lightness dimension
- [ ] Every paint on the HSL wheel is positioned using raw `hslToPosition(paint.hue, paint.lightness, OUTER_RADIUS)` — no ISCC-NBS cell logic
- [ ] Standard paint markers render as circles; metallic paints render as diamonds (reuses `PaintMarker`)
- [ ] Hovering a paint shows a tooltip with paint name, brand, and product line
- [ ] `npm run build` and `npm run lint` pass with no errors

## Routes

| Route    | Description                                            |
| -------- | ------------------------------------------------------ |
| `/wheel` | Color wheel page — hosts both Munsell and HSL variants |

## Implementation Plan

All new code lives in the existing `src/modules/color-wheel/` module. The `/wheel/page.tsx` server component already fetches `paints` and `hues`; those props are passed straight through to the new `ColorWheelContainer` client component which owns the view toggle state.

No separate `/wheel/hls` route is created — the switch is purely client-side.

### Step 1 — HslColorWheel component

Create `src/modules/color-wheel/components/hsl-color-wheel.tsx` as a `'use client'` component:

- **Props:** `paints: ColorWheelPaint[]`
- State: `hoveredPaint: ColorWheelPaint | null`, `tooltipPos: { x: number; y: number }`
- `containerRef` on the outer `<div>` for tooltip bounding
- SVG `viewBox="-500 -500 1000 1000" width="100%" height="100%"`
- Layer order (bottom to top):
  1. **HSL spectrum disc** — an absolutely-positioned `<div>` behind the SVG with `rounded-full` and a CSS `conic-gradient` covering 0–360°: `conic-gradient(hsl(0,80%,55%), hsl(30,80%,55%), hsl(60,80%,55%), hsl(90,80%,55%), hsl(120,80%,55%), hsl(150,80%,55%), hsl(180,80%,55%), hsl(210,80%,55%), hsl(240,80%,55%), hsl(270,80%,55%), hsl(300,80%,55%), hsl(330,80%,55%), hsl(360,80%,55%))`
  2. **Lightness overlay** — SVG `<radialGradient id="lightnessOverlay-hsl">` white (opacity 0.9) at 0% → transparent at 70%, applied as `<circle r={450} fill="url(#lightnessOverlay-hsl)" />`
  3. **Paint markers** — `<PaintMarker>` per paint; all positioned via `hslToPosition(paint.hue, paint.lightness, 450)`
- Hover and tooltip logic mirrors `MunsellColorWheel` exactly

Container layout:
```tsx
<div className="relative aspect-square w-full max-w-2xl mx-auto" ref={containerRef}>
  <div className="absolute inset-0 rounded-full" style={{ background: 'conic-gradient(...)' }} />
  <svg viewBox="-500 -500 1000 1000" width="100%" height="100%" className="relative">
    <defs>
      <radialGradient id="lightnessOverlay-hsl" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="white" stopOpacity={0.9} />
        <stop offset="70%" stopColor="white" stopOpacity={0} />
      </radialGradient>
    </defs>
    <circle r={450} fill="url(#lightnessOverlay-hsl)" />
    {paints.map(paint => {
      const { x, y } = hslToPosition(paint.hue, paint.lightness, 450)
      return <PaintMarker key={paint.id} paint={paint} cx={x} cy={y} onHover={handleHover} />
    })}
  </svg>
  {hoveredPaint && <Tooltip ... />}
</div>
```

### Step 2 — ColorWheelContainer component

Create `src/modules/color-wheel/components/color-wheel-container.tsx` as a `'use client'` component:

- **Props:** `paints: ColorWheelPaint[]`, `hues: ColorWheelHue[]`
- State: `view: 'munsell' | 'hsl'`, initialized to `'munsell'`
- Renders a two-button toggle above the wheel:
  - "Munsell" button — active when `view === 'munsell'`, calls `setView('munsell')`
  - "HSL" button — active when `view === 'hsl'`, calls `setView('hsl')`
  - Style: use the project's `.btn` / `.btn-primary` classes; active button gets a filled/active style, inactive gets ghost or outline
- Renders `<MunsellColorWheel paints={paints} hues={hues} />` when `view === 'munsell'`
- Renders `<HslColorWheel paints={paints} />` when `view === 'hsl'`
- Wrap in a `<div className="flex flex-col gap-4 w-full max-w-2xl mx-auto">`

### Step 3 — Update `/wheel/page.tsx`

Modify `src/app/wheel/page.tsx`:

- Replace the direct `<MunsellColorWheel paints={paints} hues={hues} />` render with `<ColorWheelContainer paints={paints} hues={hues} />`
- No change to data fetching — paint and hue data are still fetched once on the server and passed as props

### Affected Files

| Action | File                                                               | Description                                      |
| ------ | ------------------------------------------------------------------ | ------------------------------------------------ |
| Create | `src/modules/color-wheel/components/hsl-color-wheel.tsx`          | HSL wheel client component                       |
| Create | `src/modules/color-wheel/components/color-wheel-container.tsx`    | Toggle wrapper — owns `view` state, renders both |
| Modify | `src/app/wheel/page.tsx`                                           | Swap `MunsellColorWheel` for `ColorWheelContainer` |

### Risks & Considerations

- **Conic gradient browser support**: `conic-gradient` is supported in all modern browsers (Chrome 69+, Firefox 83+, Safari 12.1+). No polyfill needed.
- **`radialGradient` id collision**: `MunsellColorWheel` may define a gradient with the same id. Use `lightnessOverlay-hsl` in `HslColorWheel` to avoid cross-contamination if both SVGs ever exist in the DOM simultaneously.
- **Marker density at center**: Very light paints cluster near the center. The `maxRadius * 0.9` cap in `hslToPosition` and the lightness overlay handle this visually.
- **No ISCC-NBS jitter**: Paints with identical HSL values will overlap. This is intentional — it reflects true color space density.
- **Both wheels mount together**: When `ColorWheelContainer` renders, only one wheel is visible at a time; the other is not mounted (conditional render), so there's no hidden SVG overhead.
