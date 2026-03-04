# Interactive Color Wheel

**Epic:** Color Wheel Visualization
**Type:** Feature
**Status:** In Progress

## Summary

SVG-based circular visualization that maps miniature paints by hue (angle) and lightness (radius). Light colors sit near the center, dark colors at the edge. Six labeled color segments divide the wheel: Red, Yellow, Green, Cyan, Blue, and Magenta. A continuous hue ring around the outer edge provides a color reference.

The interactive color wheel is centered on the page and takes up the majority of the viewport.

## Acceptance Criteria

- [x] SVG-based color wheel renders paints positioned by hue (angle) and lightness (radius)
- [x] Light colors appear near the center, dark colors at the edge
- [x] Six labeled color segments divide the wheel: Red, Yellow, Green, Cyan, Blue, and Magenta
- [x] A continuous hue ring around the outer edge provides a color reference
- [x] Scroll to zoom in/out (0.4x to 8x range)
- [x] Click and drag to pan/reposition the wheel
- [x] Reset button restores default zoom and pan
- [x] Paint labels appear automatically when zoom exceeds 2x
- [x] Color wheel is centered on the page and takes up the majority of the viewport
- [x] Dark background for optimal paint color visibility
- [x] Touch gestures: pinch-to-zoom and single-finger drag on mobile

## Design Notes

- **Background**: Dark/black to maximize paint swatch visibility
- **Mobile**: Full touch gesture support (pinch-to-zoom, drag-to-pan)
- **SVG coordinate system**: Wheel centered at (0, 0) with configurable radius. ViewBox controls visible area.
- **HSL mapping**: Hue (0-360) maps to angle. Lightness (0-1) maps to radius — `l=1` (white) at center, `l=0` (black) at edge. Saturation ignored for positioning but preserved in paint dot color.

## File Structure

```
src/
  utils/
    colorUtils.ts            # hex↔HSL conversion, wheel positioning math
  components/
    ColorWheel.tsx           # SVG color wheel with zoom/pan and paint dots
  app/
    page.tsx                 # Main page — dark bg, centered wheel, reset button
    globals.css              # Dark theme base styles
    layout.tsx               # Root layout (add dark class/meta)
```

## Implementation Plan

### Step 1: Create color utility functions

Create `src/utils/colorUtils.ts` with:

- `hexToHsl(hex: string): { h: number; s: number; l: number }` — convert hex color to HSL
- `hslToHex(h: number, s: number, l: number): string` — convert HSL back to hex (for hue ring)
- `paintToWheelPosition(h: number, l: number, wheelRadius: number): { x: number; y: number }` — convert hue + lightness to SVG x,y coordinates on the wheel. Hue determines angle (0° = right, rotating counter-clockwise). Lightness determines distance from center: `l=1` (white) at center, `l=0` (black) at edge. The radius formula is `wheelRadius * (1 - l)`.
- Color segment constants: 6 segments with name, start angle, end angle, and label position

**Segment definitions:**

| Segment | Hue Start | Hue End |
|---------|-----------|---------|
| Red     | 330°      | 30°     |
| Yellow  | 30°       | 90°     |
| Green   | 90°       | 150°    |
| Cyan    | 150°      | 210°    |
| Blue    | 210°      | 270°    |
| Magenta | 270°      | 330°    |

### Step 2: Create the ColorWheel SVG component

Create `src/components/ColorWheel.tsx` as a `'use client'` component. It receives `paints: Paint[]` and `brands: Brand[]` as props.

**SVG structure (layered bottom to top):**

1. **Hue ring** — Outer ring of colored arc segments approximating a continuous hue gradient. Use 360 thin arc paths (1° each) colored by `hslToHex(degree, 100%, 50%)`. Ring sits between `wheelRadius` and `wheelRadius + ringWidth`.

2. **Segment dividers** — 6 lines radiating from center to the hue ring outer edge at each segment boundary (30°, 90°, 150°, 210°, 270°, 330°). Thin, semi-transparent white lines.

3. **Segment labels** — Text labels ("Red", "Yellow", etc.) positioned at the midpoint angle of each segment, just inside the hue ring. White text, semi-transparent, oriented along the radius.

4. **Paint dots** — One `<circle>` per paint, positioned using `paintToWheelPosition()`, filled with the paint's hex color. Small radius (e.g. 4-6px in SVG units). Add a thin dark stroke for visibility against the dark background.

**Component state:**
- `zoom: number` (default 1, range 0.4–8)
- `pan: { x: number; y: number }` (default { 0, 0 })
- `isDragging: boolean`

**ViewBox calculation:**
The SVG viewBox is derived from zoom and pan. Base viewBox shows the full wheel. Zooming narrows the viewBox; panning shifts it.

### Step 3: Add zoom and pan interactions

Add event handlers to the SVG element in `ColorWheel.tsx`:

**Mouse interactions:**
- `onWheel` — adjust zoom level. Zoom toward cursor position (not center). Clamp to 0.4–8.
- `onMouseDown` / `onMouseMove` / `onMouseUp` — drag to pan. Set `isDragging` on mousedown, update pan on mousemove, clear on mouseup. Use `cursor: grab` / `cursor: grabbing`.

**Touch interactions:**
- Single-finger drag → pan (same as mouse drag)
- Two-finger pinch → zoom. Track distance between two touch points; ratio change maps to zoom change. Zoom toward midpoint of the two fingers.
- Use `onTouchStart` / `onTouchMove` / `onTouchEnd`.

**Prevent defaults:**
- `touch-action: none` on the SVG to prevent browser scroll/zoom interference
- `e.preventDefault()` on wheel events to prevent page scroll

### Step 4: Add reset button

Add a reset button in `page.tsx` that calls a reset function passed down from the ColorWheel (or lift zoom/pan state to page). Button restores zoom to 1 and pan to (0, 0).

Style: small floating button in the bottom-right corner, semi-transparent white on dark background, with a reset/home icon or "Reset" text.

### Step 5: Add auto-labels at zoom > 2x

When `zoom > 2`, render a `<text>` element next to each visible paint dot showing the paint name. Use small font size, white fill with dark shadow/stroke for readability. Offset slightly from the dot to avoid overlap.

Only render labels for paints currently within the visible viewBox (performance optimization for 500+ paints).

### Step 6: Wire into page with dark background

Update `src/app/globals.css`:
- Set `body` background to dark color (e.g. `#0a0a0a` or `#111`)
- Set default text color to white

Update `src/app/layout.tsx`:
- Add `className="dark"` to `<html>` if needed for Tailwind dark mode
- Add appropriate meta theme-color

Update `src/app/page.tsx`:
- Import `paints` and `brands` from `@data/index`
- Mark as `'use client'`
- Render `<ColorWheel>` centered in a full-viewport container
- Include the reset button
- Own the zoom/pan state so reset button can control it

## Risks & Considerations

- **Performance with 500+ paint dots** — SVG should handle this fine, but label rendering at zoom > 2x should be culled to visible viewport
- **Touch event handling** — Must be carefully tested; pinch-to-zoom conflicts with browser zoom if not properly prevented
- **Hue ring rendering** — 360 individual arcs is performant but could also be done with a conic-gradient on a `<foreignObject>` or a single `<circle>` with `conic-gradient` stroke; individual arcs are the most compatible approach
- **Lightness-to-radius mapping** — Pure whites (l=1) and pure blacks (l=0) will cluster at center and edge respectively. Most miniature paints fall in the 0.2–0.8 lightness range, which spreads them nicely across the wheel
