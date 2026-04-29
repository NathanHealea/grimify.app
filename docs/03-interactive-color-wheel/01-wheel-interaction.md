# Zoom, Pan, and Paint Detail Interaction

**Epic:** Interactive Color Wheel
**Type:** Feature
**Status:** Todo
**Branch:** `feature/wheel-interaction`
**Merge into:** `v1/main`

## Summary

Add zoom, pan, and click-to-detail interactions to the color wheel so users can navigate dense areas and inspect individual paints.

## Acceptance Criteria

- [ ] Users can zoom in/out on the color wheel (scroll wheel, pinch gesture, or zoom controls)
- [ ] Users can pan/drag the wheel when zoomed in
- [ ] Clicking a paint marker opens a detail panel or modal with full paint info
- [ ] Paint detail shows: name, brand, product line, hex code, color swatch, and paint type
- [ ] Zoom level persists during the session
- [ ] Touch gestures work on mobile (pinch-to-zoom, drag-to-pan)
- [ ] `npm run build` and `npm run lint` pass with no errors

## Key Files

| Action | File                                                                              | Description                                      |
| ------ | --------------------------------------------------------------------------------- | ------------------------------------------------ |
| Create | `src/modules/color-wheel/hooks/use-wheel-hover.ts`                                | Shared hover/tooltip state and position logic    |
| Create | `src/modules/color-wheel/hooks/use-wheel-transform.ts`                            | Zoom/pan state, session persistence, event wiring|
| Create | `src/modules/color-wheel/hooks/use-wheel-paint-selection.ts`                      | Click-to-detail selection state                  |
| Create | `src/modules/color-wheel/components/paint-detail-panel.tsx`                       | Dismissible detail panel for a selected paint    |
| Modify | `src/modules/color-wheel/components/paint-marker.tsx`                             | Add optional `onClick` callback prop             |
| Modify | `src/modules/color-wheel/components/munsell-color-wheel.tsx`                      | Consume all three hooks; wire zoom/pan/click     |
| Modify | `src/modules/color-wheel/components/hsl-color-wheel.tsx`                          | Consume all three hooks; wire zoom/pan/click     |

## Implementation

All interaction logic lives in hooks under `src/modules/color-wheel/hooks/` so both `MunsellColorWheel` and `HslColorWheel` share the same behavior without duplicating code.

### 1. `useWheelHover` hook

**File:** `src/modules/color-wheel/hooks/use-wheel-hover.ts`

Both wheels already have identical hover/tooltip logic copied inline. Extract it into a reusable hook.

The hook owns:
- `containerRef: RefObject<HTMLDivElement>` — passed to each wheel's root div
- `hoveredPaint: ColorWheelPaint | null` state
- `tooltipPos: { x: number; y: number }` state
- `handleHover(paint, event)` — calculates tooltip position from `containerRef.getBoundingClientRect()` and clamps it within the container bounds

Returns: `{ containerRef, hoveredPaint, tooltipPos, handleHover }`

Each wheel: removes its local `hoveredPaint`, `tooltipPos`, `containerRef`, and `handleHover`, then destructures from `useWheelHover()`.

### 2. `useWheelTransform` hook

**File:** `src/modules/color-wheel/hooks/use-wheel-transform.ts`

Manages SVG zoom and pan. Uses an SVG-layer transform (applied to a `<g>` wrapping all wheel content) so tooltip DOM positioning via `clientX/Y` + `getBoundingClientRect()` remains accurate.

State:
- `scale: number` — current zoom level; persisted to `sessionStorage` so it survives view toggles; min `1`, max `10`
- `translate: { x: number; y: number }` — pan offset in SVG units

Zoom centered on cursor: when the mouse wheel fires, compute the SVG-space cursor position before and after the scale change and adjust `translate` to keep that point fixed under the cursor.

Event handlers returned:
- `onWheel(e)` — zoom in/out, centered on cursor; calls `e.preventDefault()`
- `onPointerDown(e)` — begin drag pan (only when `scale > 1`)
- `onPointerMove(e)` — update translate while dragging
- `onPointerUp(e)` / `onPointerLeave(e)` — end drag
- `onTouchStart(e)` — detect two-finger pinch baseline (`initialPinchDistance`)
- `onTouchMove(e)` — update scale from pinch delta; single-finger drag pans
- `onTouchEnd(e)` — end gesture

Also returns:
- `svgTransform: string` — `"translate(tx, ty) scale(s)"` ready to set on a `<g>` element's `transform` attribute
- `resetTransform()` — resets scale to `1`, translate to `{0, 0}`

Each wheel:
1. Attaches `onWheel`, `onPointerDown/Move/Up/Leave`, `onTouchStart/Move/End` to the root container div.
2. Wraps all sector paths and paint markers in `<g transform={svgTransform}>`.
3. The tooltip div remains outside the `<g>`, so it is not affected by the SVG transform.

### 3. `useWheelPaintSelection` hook

**File:** `src/modules/color-wheel/hooks/use-wheel-paint-selection.ts`

Manages the clicked-paint state that drives the detail panel.

Returns:
- `selectedPaint: ColorWheelPaint | null`
- `handlePaintClick(paint: ColorWheelPaint)` — sets selected paint
- `clearSelection()` — sets to `null`

### 4. `PaintMarker` — add `onClick` prop

**File:** `src/modules/color-wheel/components/paint-marker.tsx`

Add optional `onClick?: (paint: ColorWheelPaint) => void` prop. Wire it to the `onClick` event of the circle/polygon. This fires independently of hover so both can coexist.

### 5. `PaintDetailPanel` component

**File:** `src/modules/color-wheel/components/paint-detail-panel.tsx`

A dismissible overlay panel. Rendered by each wheel (or by `ColorWheelContainer`) when `selectedPaint` is non-null.

Displays:
- Color swatch (filled div using `paint.hex`)
- Name
- Brand name
- Product line name
- Hex code
- Paint type (`is_metallic` → "Metallic", otherwise "Standard")

Dismiss triggers:
- Click the close button
- Click outside the panel (pointer-down on the backdrop)
- Press `Escape` (`useEffect` adds/removes a `keydown` listener)

Props: `paint: ColorWheelPaint`, `onClose: () => void`

### 6. Integrate into `MunsellColorWheel` and `HslColorWheel`

For each component:

1. Remove inline `hoveredPaint`, `tooltipPos`, `containerRef`, `handleHover` — replace with `useWheelHover()`
2. Add `useWheelTransform()` and attach event handlers to root div
3. Add `useWheelPaintSelection()` and pass `handlePaintClick` to each `PaintMarker`
4. Wrap sector/marker SVG content in `<g transform={svgTransform}>`
5. Render `<PaintDetailPanel>` when `selectedPaint` is non-null

## Notes

- Use SVG `transform` attribute on a `<g>` wrapper (not CSS transform on the SVG element) — this keeps the coordinate system consistent for tooltip positioning.
- Use `useCallback` for all event handlers returned from hooks to keep references stable.
- Zoom session persistence: read initial scale from `sessionStorage` in the hook's initial state; write on each scale change via `useEffect`.
- The detail panel should be rendered as an absolute overlay inside the wheel's root div (same stacking context as the tooltip).
