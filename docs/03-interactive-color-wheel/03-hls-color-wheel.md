# HSL Color Wheel

**Epic:** Interactive Color Wheel
**Type:** Feature
**Status:** Done
**Branch:** `feature/hls-color-wheel`
**Merge into:** `v1/main`

## Summary

Add an HSL color wheel variant alongside the existing Munsell wheel. A toggle button on the `/wheel` page switches between the two views client-side — no navigation, no data reload. The HSL wheel places every paint by raw `hslToPosition()` coordinates against a continuous conic-gradient background, giving painters a perceptually accurate CSS color space view.

## Acceptance Criteria

- [x] A toggle button on `/wheel` switches between the Munsell and HSL wheel views
- [x] Switching views does not reload paint data — state is managed client-side
- [x] The HSL wheel background shows the full hue spectrum (0–360°) as a continuous conic gradient disc
- [x] A white radial gradient overlay fades from center outward to represent the lightness dimension
- [x] Every paint on the HSL wheel is positioned using raw `hslToPosition(paint.hue, paint.lightness, OUTER_RADIUS)` — no ISCC-NBS cell logic
- [x] Standard paint markers render as circles; metallic paints render as diamonds (reuses `PaintMarker`)
- [x] Hovering a paint shows a tooltip with paint name, brand, and product line
- [x] `npm run build` and `npm run lint` pass with no errors

## Routes

| Route    | Description                                            |
| -------- | ------------------------------------------------------ |
| `/wheel` | Color wheel page — hosts both Munsell and HSL variants |

## Implementation Plan

All new code lives in the existing `src/modules/color-wheel/` module. The `/wheel/page.tsx` server component already fetches `paints` and `hues`; those props are passed straight through to the `ColorWheelContainer` client component which owns the view toggle state.

No separate `/wheel/hls` route is created — the switch is purely client-side.

### Step 1 — Color utility functions

Create the following utilities under `src/modules/color-wheel/utils/`. One export per file per project conventions.

#### `hex-to-hsl.ts`

```ts
export function hexToHsl(hex: string): { h: number; s: number; l: number }
```

Converts a 6-digit hex string (e.g. `"#ff4400"`) to HSL. Returns `h` in degrees (0–360), `s` and `l` as fractions (0–1).

#### `hsl-to-hex.ts`

```ts
export function hslToHex(h: number, s: number, l: number): string
```

Converts HSL (h in degrees 0–360, s/l as fractions 0–1) to a 6-digit hex string. Used to compute hue ring arc fill colors.

#### `paint-to-wheel-position.ts`

```ts
export function paintToWheelPosition(
  h: number,
  l: number,
  wheelRadius: number,
): { x: number; y: number }
```

Maps a paint's hue and lightness fraction to SVG coordinates.

- **Angle convention:** `h=0` (red) = right (+x axis), rotation **counter-clockwise** (standard CSS hue direction). In SVG: `x = r * cos(h_rad)`, `y = -r * sin(h_rad)`.
- **Radius formula:** `r = wheelRadius * (1 - l)`. `l=1` (white) → center; `l=0` (black) → outer edge. No 0.9 cap.

#### `color-segments.ts`

```ts
export interface ColorSegment {
  name: string
  hueStart: number  // degrees
  hueEnd: number    // degrees
  midAngle: number  // degrees — center of segment
}

export const COLOR_SEGMENTS: ColorSegment[]
export const SEGMENT_BOUNDARIES: number[]  // 12 boundary angles in degrees
```

Defines the 12 Itten color wheel segments. Each spans 30°. `SEGMENT_BOUNDARIES` is the sorted list of all 12 boundary angles.

**Itten segment definitions:**

| Segment       | Hue Start | Hue End | Mid Angle |
| ------------- | --------- | ------- | --------- |
| Red           | 345°      | 15°     | 0°        |
| Red-Orange    | 15°       | 45°     | 30°       |
| Orange        | 45°       | 75°     | 60°       |
| Yellow-Orange | 75°       | 105°    | 90°       |
| Yellow        | 105°      | 135°    | 120°      |
| Yellow-Green  | 135°      | 165°    | 150°      |
| Green         | 165°      | 195°    | 180°      |
| Blue-Green    | 195°      | 225°    | 210°      |
| Blue          | 225°      | 255°    | 240°      |
| Blue-Violet   | 255°      | 285°    | 270°      |
| Violet        | 285°      | 315°    | 300°      |
| Red-Violet    | 315°      | 345°    | 330°      |

`SEGMENT_BOUNDARIES = [15, 45, 75, 105, 135, 165, 195, 225, 255, 285, 315, 345]`

### Step 2 — HslColorWheel component

Create `src/modules/color-wheel/components/hsl-color-wheel.tsx` as a `'use client'` component.

- **Props:** `paints: ColorWheelPaint[]`
- **Constants:** `WHEEL_RADIUS = 450`, `RING_WIDTH = 70`
- **State:** `hoveredPaint: ColorWheelPaint | null`, `tooltipPos: { x: number; y: number }`
- `containerRef` on the outer `<div>` for tooltip bounding
- **SVG:** `viewBox="-600 -600 1200 1200" width="100%" height="100%"`

**SVG layer order (bottom to top):**

1. **Segment background wedges** — 12 Itten sectors, each with three concentric lightness bands drawn using `sectorPath` / `annularSectorPath` from `sector-path.ts`:
   - Light inner band: 0 → `WHEEL_RADIUS/3`, fill `hsl(midAngle, 80%, 75%)`, `fillOpacity={0.25}`
   - Medium band: `WHEEL_RADIUS/3` → `2*WHEEL_RADIUS/3`, fill `hsl(midAngle, 80%, 50%)`, `fillOpacity={0.25}`
   - Dark outer band: `2*WHEEL_RADIUS/3` → `WHEEL_RADIUS`, fill `hsl(midAngle, 80%, 25%)`, `fillOpacity={0.25}`

   > `sector-path.ts` uses **0° = top, clockwise**. `COLOR_SEGMENTS` angles are in CSS hue space (**0° = right, counter-clockwise**). Convert before passing: the `midAngle` value maps to `sector-path.ts` angle via the same shift used in `hslToPosition` — pass `midAngle - 15` as `startAngleDeg` and `midAngle + 15` as `endAngleDeg` (this works because the Itten sectors are centered on hue values that align with `hslToPosition`'s convention).

2. **Hue ring** — 360 thin arc paths (1° each) for a smooth continuous gradient. Arc at degree `d` filled with `hslToHex(d, 1, 0.5)`. Ring spans `WHEEL_RADIUS` → `WHEEL_RADIUS + RING_WIDTH`. Use `annularSectorPath(d, d + 1.5, WHEEL_RADIUS, WHEEL_RADIUS + RING_WIDTH)`.

3. **Segment divider lines** — 12 lines from `(0, 0)` to the hue ring outer edge at each `SEGMENT_BOUNDARIES` angle. `stroke="rgba(255,255,255,0.3)"`, `strokeWidth={1}`.

4. **Segment labels** — 12 text labels at `r = WHEEL_RADIUS + RING_WIDTH + 26` at each segment's `midAngle`. Tinted: `fill={hslToHex(midAngle, 0.8, 0.55)}`, `fillOpacity={0.7}`, `fontSize={14}`, `fontWeight={600}`.

5. **Scheme wedge overlays** *(optional)* — rendered when `selectedHue?: number` and `colorScheme?: ColorScheme` props are provided. One full-radius wedge per harmony point, `fillOpacity={0.15}`. Supported schemes: `'complementary' | 'analogous' | 'triadic' | 'split-complementary' | 'tetradic'`. Handle 0°/360° wrap-around by splitting into two paths.

6. **Paint markers** — one `<PaintMarker>` per paint, direct `<svg>` children (not wrapped in `<g>`). Position via `paintToWheelPosition(paint.hue / 360, paint.lightness / 100, WHEEL_RADIUS)`.

**Hover / tooltip:** `containerRef.getBoundingClientRect()` for position, absolute `<div>` showing paint name, brand, product line.

### Step 3 — ColorWheelContainer component

Create `src/modules/color-wheel/components/color-wheel-container.tsx` as a `'use client'` component:

- **Props:** `paints: ColorWheelPaint[]`, `hues: ColorWheelHue[]`
- State: `view: 'munsell' | 'hsl'`, initialized to `'munsell'`
- Two-button toggle using `.btn` / `.btn-primary` / `.btn-ghost` classes
- Renders `<MunsellColorWheel paints={paints} hues={hues} />` when `view === 'munsell'`
- Renders `<HslColorWheel paints={paints} />` when `view === 'hsl'`
- Wrap in `<div className="flex w-full max-w-2xl flex-col items-center gap-4">`

### Step 4 — Update `/wheel/page.tsx`

Modify `src/app/wheel/page.tsx`:

- Replace `<MunsellColorWheel paints={paints} hues={hues} />` with `<ColorWheelContainer paints={paints} hues={hues} />`
- No change to data fetching

### Affected Files

| Action | File                                                                | Description                                        |
| ------ | ------------------------------------------------------------------- | -------------------------------------------------- |
| Create | `src/modules/color-wheel/utils/hex-to-hsl.ts`                      | hexToHsl conversion utility                        |
| Create | `src/modules/color-wheel/utils/hsl-to-hex.ts`                      | hslToHex conversion utility                        |
| Create | `src/modules/color-wheel/utils/paint-to-wheel-position.ts`         | paintToWheelPosition coordinate mapping            |
| Create | `src/modules/color-wheel/utils/color-segments.ts`                  | Itten 12-segment constants and boundary angles     |
| Create | `src/modules/color-wheel/components/hsl-color-wheel.tsx`           | HSL wheel client component                         |
| Create | `src/modules/color-wheel/components/color-wheel-container.tsx`     | Toggle wrapper — owns `view` state, renders both   |
| Modify | `src/app/wheel/page.tsx`                                            | Swap `MunsellColorWheel` for `ColorWheelContainer` |

### Risks & Considerations

- **Angle convention mismatch:** `paintToWheelPosition` uses 0°=right/counter-clockwise (CSS hue space). `sector-path.ts` uses 0°=top/clockwise. Always align segment angles to the `sector-path.ts` convention before calling `sectorPath` / `annularSectorPath`.
- **Red segment wrap-around:** Red spans 345°→15°, crossing 0°. Passing `startAngle=-15, endAngle=15` to `sectorPath` handles this correctly since the arc math works with negative angles.
- **Paint radius at full edge:** With `r = WHEEL_RADIUS * (1 - l)`, a black paint (`l=0`) lands exactly at the hue ring boundary. Very dark paints visually border the ring — intentional.
- **No ISCC-NBS jitter:** Paints with identical HSL values will overlap. This reflects true color space density.
- **Both wheels mount conditionally:** Only one wheel is in the DOM at a time — no hidden SVG overhead.
