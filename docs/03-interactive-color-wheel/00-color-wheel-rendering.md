# Color Wheel Rendering and Paint Mapping

**Epic:** Interactive Color Wheel
**Type:** Feature
**Status:** Done
**Branch:** `feature/color-wheel-rendering`
**Merge into:** `v1/main`

## Summary

Render an interactive color wheel that maps paints by hue (angle) and lightness (radius), giving painters a spatial view of available colors.

## Acceptance Criteria

- [x] A color wheel is rendered on the page using Canvas or SVG
- [x] Paints are plotted as dots/markers on the wheel based on their hue and lightness
- [x] Hue determines the angular position (0-360 degrees)
- [x] Lightness determines the radial position (lighter = closer to center)
- [x] The wheel is responsive and scales to the viewport
- [x] Paint markers show a tooltip or popover with paint name and brand on hover/tap
- [x] The wheel loads paint data from the database
- [x] `npm run build` and `npm run lint` pass with no errors

## Routes

| Route           | Description           |
| --------------- | --------------------- |
| `/` or `/wheel` | Main color wheel view |

## Key Files

| Action | File                                                          | Description                                  |
| ------ | ------------------------------------------------------------- | -------------------------------------------- |
| Create | `src/components/color-wheel/color-wheel.tsx`                  | Main color wheel component                   |
| Create | `src/components/color-wheel/paint-marker.tsx`                 | Individual paint dot on the wheel            |
| Create | `src/modules/color/color-math.ts`                             | HSL to polar coordinate conversion utilities |
| Create | `src/app/(main)/page.tsx` and `src/app/(main)/wheel/page.tsx` | Page hosting the wheel                       |

## Implementation

### 1. Color math utilities

Functions to convert HSL values to polar coordinates for wheel placement:

- `hslToPosition(hue, saturation, lightness, radius)` — returns `{ x, y }` for placing a paint on the wheel
- Hue maps to angle, lightness maps to distance from center

### 2. Color wheel component

A Canvas or SVG-based wheel with:

- Background gradient showing the color spectrum (hue around the circumference)
- Paint markers rendered as small colored circles at their computed positions
- Responsive sizing via container queries or viewport units
- Wheel sections colors represented by munsell colors
- Sub section are divided by ISCC-NBS sub-hue based 

### 3. Paint markers

Each marker represents a paint, rendered with its hex color as background. On hover/tap, shows paint name, brand, and product line.

### 4. Data loading

Server component fetches all paints (or paginated subset) with their HSL values and passes to the wheel component.

## Notes

- Consider Canvas for performance with thousands of paints; SVG for simpler interactivity with fewer paints.
- The wheel is the core visual differentiator of the app — performance and visual clarity are critical.
- Metallic paints may need a distinct marker style (e.g., shimmer effect or different shape).

## Implementation Plan

All color wheel code lives in a new domain module: `src/modules/color-wheel/`. Components belong there, not in `src/components/color-wheel/` as noted in Key Files above.

The wheel is a fully SVG-based visualization: 11 Munsell hue sectors (pie slices colored with each hue's `hex_code` from the database) with thin ISCC-NBS sub-hue divider lines, a radial gradient overlay for the lightness dimension, and interactive paint marker dots on top. `viewBox="-500 -500 1000 1000"` with `width="100%" height="100%"` handles responsiveness. Both the `/` and `/wheel` routes render the same component.

### Step 1 — Types

Create `src/modules/color-wheel/types/color-wheel-paint.ts`:

- `ColorWheelPaint` — lightweight paint projection: `id`, `name`, `hex`, `hue`, `saturation`, `lightness`, `is_metallic`, `brand_name`, `product_line_name`

Create `src/modules/color-wheel/types/color-wheel-hue.ts`:

- `ColorWheelHue` — hue data for sector rendering: `id`, `name`, `hex_code`, `sort_order`, `children: ColorWheelHue[]`
- Populated by flattening the parent + child hue queries into a tree

### Step 2 — Color math utilities

Create `src/modules/color-wheel/utils/hsl-to-position.ts`:

- `hslToPosition(hue, lightness, maxRadius)` → `{ x: number; y: number }`
  - Angle: `theta = (hue - 90) * (Math.PI / 180)` (−90° puts hue 0° at the top)
  - Radius: `r = (1 - lightness / 100) * maxRadius` (100% lightness = center, 0% = outer edge)
  - Returns `{ x: r * Math.cos(theta), y: r * Math.sin(theta) }`

Create `src/modules/color-wheel/utils/sector-path.ts`:

- `sectorPath(startAngleDeg, endAngleDeg, outerRadius)` → SVG path `d` string for a pie slice
  - Used to draw each Munsell hue sector
- `sortOrderToStartAngle(sortOrder, totalHues)` → start angle in degrees, where `sortOrder` is 0-indexed

### Step 3 — Paint service method

Add `getColorWheelPaints(): Promise<ColorWheelPaint[]>` to `src/modules/paints/services/paint-service.ts`:

- Selects `id, name, hex, hue, saturation, lightness, is_metallic` plus `product_lines!inner(name, brands!inner(name))`
- Filters `is_discontinued = false`, orders by `hue` ascending
- Maps to `ColorWheelPaint[]` (flattens `brand_name` and `product_line_name` from nested join)

### Step 4 — Hue service method

Add `getColorWheelHues(): Promise<ColorWheelHue[]>` to `src/modules/hues/services/hue-service.ts`:

- Fetches all top-level Munsell hues ordered by `sort_order` (11 hues)
- For each, fetches its ISCC-NBS child hues ordered by `sort_order`
- Returns `ColorWheelHue[]` each with a populated `children` array
- Used by the wheel to draw sectors and sub-dividers

### Step 5 — PaintMarker component

Create `src/modules/color-wheel/components/paint-marker.tsx`:

- **Props:** `paint: ColorWheelPaint`, `cx: number`, `cy: number`, `onHover: (paint: ColorWheelPaint | null, event: MouseEvent) => void`
- Standard paints: SVG `<circle>` at `(cx, cy)` with `r={5}`, `fill={paint.hex}`, thin white stroke
- Metallic paints: SVG `<polygon>` (diamond shape) centered at `(cx, cy)`, same fill and stroke
- Calls `onHover` on `onMouseEnter` / `onMouseLeave`

### Step 6 — ColorWheel component

Create `src/modules/color-wheel/components/color-wheel.tsx` as a `'use client'` component:

- **Props:** `paints: ColorWheelPaint[]`, `hues: ColorWheelHue[]`
- State: `hoveredPaint: ColorWheelPaint | null`, `tooltipPos: { x: number; y: number }`
- SVG layer order (bottom to top):
  1. **Munsell sectors** — one `<path>` per top-level hue, filled with `hue.hex_code`, computed via `sectorPath()`; each sector spans `360 / 11` degrees based on `sort_order`
  2. **ISCC-NBS sub-dividers** — thin `<line>` elements at each child hue boundary within each Munsell sector (10 lines per sector × 11 sectors = 110 lines); low-opacity white stroke so they read as subtle structure
  3. **Lightness overlay** — SVG `<radialGradient>` from white (opacity 0.85 at center) to transparent (at 70% radius); applied as a `<circle r={450}>` fill
  4. **Paint markers** — `<PaintMarker>` per paint, positioned via `hslToPosition(paint.hue, paint.lightness, 450)`
- Container:
  ```
  <div className="relative aspect-square w-full max-w-2xl mx-auto" ref={containerRef}>
    <svg viewBox="-500 -500 1000 1000" width="100%" height="100%">
      {/* Munsell sectors, sub-dividers, lightness overlay, paint markers */}
    </svg>
    {hoveredPaint && <Tooltip paint={hoveredPaint} pos={tooltipPos} />}
  </div>
  ```
- `handleHover(paint, event)`: converts `clientX/Y` to container-relative coords via `getBoundingClientRect`
- Tooltip: absolutely positioned `card`-styled div showing paint name, brand, product line; clamped to stay within container bounds

### Step 7 — Loading UI

Create `src/app/loading.tsx` and `src/app/wheel/loading.tsx`:

- Next.js App Router automatically wraps each `page.tsx` in a Suspense boundary when a co-located `loading.tsx` exists, so the loading UI shows while `getColorWheelPaints()` and `getColorWheelHues()` resolve.
- Both files are identical and render a full-viewport centered skeleton:
  - A circular `div` matching the wheel's `max-w-2xl aspect-square` dimensions
  - Animated pulse via Tailwind's `animate-pulse` class
  - The circle uses a `bg-muted rounded-full` style so it reads as a placeholder for the color wheel shape

### Step 8 — Pages

Update `src/app/page.tsx` (route `/`) and create `src/app/wheel/page.tsx` (route `/wheel`):

- Both are identical server components:
  1. Fetch `paintService.getColorWheelPaints()` via `src/modules/paints/services/paint-service.server.ts`
  2. Fetch `hueService.getColorWheelHues()` via `src/modules/hues/services/hue-service.server.ts`
  3. Render `<ColorWheel paints={paints} hues={hues} />` in a full-viewport `<main>`

### Affected Files

| Action | File                                                    | Description                               |
| ------ | ------------------------------------------------------- | ----------------------------------------- |
| Create | `src/modules/color-wheel/types/color-wheel-paint.ts`    | `ColorWheelPaint` type                    |
| Create | `src/modules/color-wheel/types/color-wheel-hue.ts`      | `ColorWheelHue` type                      |
| Create | `src/modules/color-wheel/utils/hsl-to-position.ts`      | HSL → SVG position math                   |
| Create | `src/modules/color-wheel/utils/sector-path.ts`          | SVG pie sector path + angle utilities     |
| Create | `src/modules/color-wheel/components/paint-marker.tsx`   | Individual paint dot (SVG circle/diamond) |
| Create | `src/modules/color-wheel/components/color-wheel.tsx`    | Main wheel client component               |
| Modify | `src/modules/paints/services/paint-service.ts`          | Add `getColorWheelPaints()`               |
| Modify | `src/modules/hues/services/hue-service.ts`              | Add `getColorWheelHues()`                 |
| Create | `src/app/loading.tsx`                                   | Pulsing circle skeleton for `/`           |
| Create | `src/app/wheel/loading.tsx`                             | Pulsing circle skeleton for `/wheel`      |
| Modify | `src/app/page.tsx`                                      | Fetch data and render `ColorWheel`        |
| Create | `src/app/wheel/page.tsx`                                | Identical server component at `/wheel`    |

### Risks & Considerations

<<<<<<< HEAD
- **Performance**: With thousands of paints, SVG can degrade. If the paint count exceeds ~2,000, consider clustering nearby markers by hue band or adding a paint-count threshold that switches to a density heatmap.
- **Lightness mapping**: Pure whites (lightness ≈ 95-100%) and pure blacks (lightness ≈ 0-5%) cluster at center and outer edge respectively. These zones may look sparse — consider capping radius to 90% of max to leave a white gutter.
- **Tooltip positioning**: The tooltip must not overflow the viewport. Add bounds-clamping when computing tooltip top/left from mouse coords.
- **Metallic marker shape**: The diamond polygon needs to be sized consistently with the circle radius so both read at the same visual weight.

## Implementation Plan

All color wheel code lives in a new domain module: `src/modules/color-wheel/`. Components belong there, not in `src/components/color-wheel/` as noted in Key Files above.

The wheel is a fully SVG-based visualization: 11 Munsell hue sectors (pie slices colored with each hue's `hex_code` from the database) with thin ISCC-NBS sub-hue divider lines, a radial gradient overlay for the lightness dimension, and interactive paint marker dots on top. `viewBox="-500 -500 1000 1000"` with `width="100%" height="100%"` handles responsiveness. Both the `/` and `/wheel` routes render the same component.

### Step 1 — Types

Create `src/modules/color-wheel/types/color-wheel-paint.ts`:

- `ColorWheelPaint` — lightweight paint projection: `id`, `name`, `hex`, `hue`, `saturation`, `lightness`, `is_metallic`, `brand_name`, `product_line_name`

Create `src/modules/color-wheel/types/color-wheel-hue.ts`:

- `ColorWheelHue` — hue data for sector rendering: `id`, `name`, `hex_code`, `sort_order`, `children: ColorWheelHue[]`
- Populated by flattening the parent + child hue queries into a tree

### Step 2 — Color math utilities

Create `src/modules/color-wheel/utils/hsl-to-position.ts`:

- `hslToPosition(hue, lightness, maxRadius)` → `{ x: number; y: number }`
  - Angle: `theta = (hue - 90) * (Math.PI / 180)` (−90° puts hue 0° at the top)
  - Radius: `r = (1 - lightness / 100) * maxRadius` (100% lightness = center, 0% = outer edge)
  - Returns `{ x: r * Math.cos(theta), y: r * Math.sin(theta) }`

Create `src/modules/color-wheel/utils/sector-path.ts`:

- `sectorPath(startAngleDeg, endAngleDeg, outerRadius)` → SVG path `d` string for a pie slice
  - Used to draw each Munsell hue sector
- `sortOrderToStartAngle(sortOrder, totalHues)` → start angle in degrees, where `sortOrder` is 0-indexed

### Step 3 — Paint service method

Add `getColorWheelPaints(): Promise<ColorWheelPaint[]>` to `src/modules/paints/services/paint-service.ts`:

- Selects `id, name, hex, hue, saturation, lightness, is_metallic` plus `product_lines!inner(name, brands!inner(name))`
- Filters `is_discontinued = false`, orders by `hue` ascending
- Maps to `ColorWheelPaint[]` (flattens `brand_name` and `product_line_name` from nested join)

### Step 4 — Hue service method

Add `getColorWheelHues(): Promise<ColorWheelHue[]>` to `src/modules/hues/services/hue-service.ts`:

- Fetches all top-level Munsell hues ordered by `sort_order` (11 hues)
- For each, fetches its ISCC-NBS child hues ordered by `sort_order`
- Returns `ColorWheelHue[]` each with a populated `children` array
- Used by the wheel to draw sectors and sub-dividers

### Step 5 — PaintMarker component

Create `src/modules/color-wheel/components/paint-marker.tsx`:

- **Props:** `paint: ColorWheelPaint`, `cx: number`, `cy: number`, `onHover: (paint: ColorWheelPaint | null, event: MouseEvent) => void`
- Standard paints: SVG `<circle>` at `(cx, cy)` with `r={5}`, `fill={paint.hex}`, thin white stroke
- Metallic paints: SVG `<polygon>` (diamond shape) centered at `(cx, cy)`, same fill and stroke
- Calls `onHover` on `onMouseEnter` / `onMouseLeave`

### Step 6 — ColorWheel component

Create `src/modules/color-wheel/components/color-wheel.tsx` as a `'use client'` component:

- **Props:** `paints: ColorWheelPaint[]`, `hues: ColorWheelHue[]`
- State: `hoveredPaint: ColorWheelPaint | null`, `tooltipPos: { x: number; y: number }`
- SVG layer order (bottom to top):
  1. **Munsell sectors** — one `<path>` per top-level hue, filled with `hue.hex_code`, computed via `sectorPath()`; each sector spans `360 / 11` degrees based on `sort_order`
  2. **ISCC-NBS sub-dividers** — thin `<line>` elements at each child hue boundary within each Munsell sector (10 lines per sector × 11 sectors = 110 lines); low-opacity white stroke so they read as subtle structure
  3. **Lightness overlay** — SVG `<radialGradient>` from white (opacity 0.85 at center) to transparent (at 70% radius); applied as a `<circle r={450}>` fill
  4. **Paint markers** — `<PaintMarker>` per paint, positioned via `hslToPosition(paint.hue, paint.lightness, 450)`
- Container:
  ```
  <div className="relative aspect-square w-full max-w-2xl mx-auto" ref={containerRef}>
    <svg viewBox="-500 -500 1000 1000" width="100%" height="100%">
      {/* Munsell sectors, sub-dividers, lightness overlay, paint markers */}
    </svg>
    {hoveredPaint && <Tooltip paint={hoveredPaint} pos={tooltipPos} />}
  </div>
  ```
- `handleHover(paint, event)`: converts `clientX/Y` to container-relative coords via `getBoundingClientRect`
- Tooltip: absolutely positioned `card`-styled div showing paint name, brand, product line; clamped to stay within container bounds

### Step 7 — Loading UI

Create `src/app/loading.tsx` and `src/app/wheel/loading.tsx`:

- Next.js App Router automatically wraps each `page.tsx` in a Suspense boundary when a co-located `loading.tsx` exists, so the loading UI shows while `getColorWheelPaints()` and `getColorWheelHues()` resolve.
- Both files are identical and render a full-viewport centered skeleton:
  - A circular `div` matching the wheel's `max-w-2xl aspect-square` dimensions
  - Animated pulse via Tailwind's `animate-pulse` class
  - The circle uses a `bg-muted rounded-full` style so it reads as a placeholder for the color wheel shape

### Step 8 — Pages

Update `src/app/page.tsx` (route `/`) and create `src/app/wheel/page.tsx` (route `/wheel`):

- Both are identical server components:
  1. Fetch `paintService.getColorWheelPaints()` via `src/modules/paints/services/paint-service.server.ts`
  2. Fetch `hueService.getColorWheelHues()` via `src/modules/hues/services/hue-service.server.ts`
  3. Render `<ColorWheel paints={paints} hues={hues} />` in a full-viewport `<main>`

### Affected Files

| Action | File                                                    | Description                               |
| ------ | ------------------------------------------------------- | ----------------------------------------- |
| Create | `src/modules/color-wheel/types/color-wheel-paint.ts`    | `ColorWheelPaint` type                    |
| Create | `src/modules/color-wheel/types/color-wheel-hue.ts`      | `ColorWheelHue` type                      |
| Create | `src/modules/color-wheel/utils/hsl-to-position.ts`      | HSL → SVG position math                   |
| Create | `src/modules/color-wheel/utils/sector-path.ts`          | SVG pie sector path + angle utilities     |
| Create | `src/modules/color-wheel/components/paint-marker.tsx`   | Individual paint dot (SVG circle/diamond) |
| Create | `src/modules/color-wheel/components/color-wheel.tsx`    | Main wheel client component               |
| Modify | `src/modules/paints/services/paint-service.ts`          | Add `getColorWheelPaints()`               |
| Modify | `src/modules/hues/services/hue-service.ts`              | Add `getColorWheelHues()`                 |
| Create | `src/app/loading.tsx`                                   | Pulsing circle skeleton for `/`           |
| Create | `src/app/wheel/loading.tsx`                             | Pulsing circle skeleton for `/wheel`      |
| Modify | `src/app/page.tsx`                                      | Fetch data and render `ColorWheel`        |
| Create | `src/app/wheel/page.tsx`                                | Identical server component at `/wheel`    |

### Risks & Considerations

=======
>>>>>>> aafb845 (docs(color-wheel-rendering): update implementation plan for Munsell sectors and dual routes)
- **Munsell sector angles**: The 11 hues must be sorted by `sort_order` before computing angles; each spans exactly `360 / 11 ≈ 32.7°`. Normalize by array index, not raw `sort_order` value, to handle gaps.
- **ISCC-NBS dividers**: Each Munsell sector has 11 child hues = 10 internal dividers. Divider angle = `sectorStart + (childIndex / childCount) * sectorWidth`. Use low-opacity white stroke so dividers read as subtle guides, not hard borders.
- **Performance**: SVG with ~2,000 markers + 110 divider lines is fine. Above 3,000 paints, consider grouping nearby markers into a single enlarged dot.
- **Lightness edge cases**: Cap radius at 90% of max to leave a visible outer ring for very dark paints (lightness ≈ 0%).
- **Tooltip overflow**: Clamp `tooltipPos.x/y` against container width/height to prevent clipping at edges.
- **Metallic marker size**: Diamond half-diagonal should be `r * 1.4` to match the visual weight of a circle with radius `r`.
