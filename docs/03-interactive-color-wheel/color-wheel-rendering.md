# Color Wheel Rendering and Paint Mapping

**Epic:** Interactive Color Wheel
**Type:** Feature
**Status:** Todo

## Summary

Render an interactive color wheel that maps paints by hue (angle) and lightness (radius), giving painters a spatial view of available colors.

## Acceptance Criteria

- [ ] A color wheel is rendered on the page using Canvas or SVG
- [ ] Paints are plotted as dots/markers on the wheel based on their hue and lightness
- [ ] Hue determines the angular position (0-360 degrees)
- [ ] Lightness determines the radial position (lighter = closer to center)
- [ ] The wheel is responsive and scales to the viewport
- [ ] Paint markers show a tooltip or popover with paint name and brand on hover/tap
- [ ] The wheel loads paint data from the database
- [ ] `npm run build` and `npm run lint` pass with no errors

## Routes

| Route           | Description           |
| --------------- | --------------------- |
| `/` or `/wheel` | Main color wheel view |

## Key Files

| Action | File                                                         | Description                                  |
| ------ | ------------------------------------------------------------ | -------------------------------------------- |
| Create | `src/components/color-wheel/color-wheel.tsx`                 | Main color wheel component                   |
| Create | `src/components/color-wheel/paint-marker.tsx`                | Individual paint dot on the wheel            |
| Create | `src/modules/color/color-math.ts`                            | HSL to polar coordinate conversion utilities |
| Create | `src/app/(main)/page.tsx` or `src/app/(main)/wheel/page.tsx` | Page hosting the wheel                       |

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

### 3. Paint markers

Each marker represents a paint, rendered with its hex color as background. On hover/tap, shows paint name, brand, and product line.

### 4. Data loading

Server component fetches all paints (or paginated subset) with their HSL values and passes to the wheel component.

## Notes

- Consider Canvas for performance with thousands of paints; SVG for simpler interactivity with fewer paints.
- The wheel is the core visual differentiator of the app — performance and visual clarity are critical.
- Metallic paints may need a distinct marker style (e.g., shimmer effect or different shape).
