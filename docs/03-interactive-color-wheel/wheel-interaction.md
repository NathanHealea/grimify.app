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

| Action | File                                                | Description                        |
| ------ | --------------------------------------------------- | ---------------------------------- |
| Modify | `src/components/color-wheel/color-wheel.tsx`        | Add zoom/pan transform handling    |
| Create | `src/components/color-wheel/paint-detail-panel.tsx` | Detail panel for selected paint    |
| Create | `src/hooks/use-wheel-transform.ts`                  | Zoom and pan state management hook |

## Implementation

### 1. Zoom and pan

A custom hook (`useWheelTransform`) manages transform state (scale, translateX, translateY). Handles:

- Mouse wheel for zoom
- Mouse drag for pan
- Touch pinch for mobile zoom
- Touch drag for mobile pan
- Zoom min/max bounds

### 2. Paint detail panel

When a paint marker is clicked, display a slide-out panel or modal with full paint information. Include a link to the brand/product line browse page and options to add to collection (if authenticated).

### 3. Marker clustering

At low zoom levels where paints overlap, consider clustering nearby paints and showing a count badge. Expanding on zoom reveals individual markers.

## Notes

- Use CSS `transform` for smooth zoom/pan rather than re-rendering the wheel.
- Consider `requestAnimationFrame` for smooth gesture handling.
- Detail panel should be dismissible via clicking outside or pressing Escape.
