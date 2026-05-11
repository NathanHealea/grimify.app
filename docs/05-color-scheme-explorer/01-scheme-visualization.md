# Scheme Visualization on the Color Wheel

**Epic:** Color Scheme Explorer
**Type:** Feature
**Status:** Todo
**Branch:** `feature/scheme-visualization`
**Merge into:** `main`

## Summary

Overlay color scheme relationships directly on the interactive color wheel, showing the geometric relationship between scheme colors as lines, arcs, or highlighted sectors.

## Acceptance Criteria

- [ ] When a scheme is active, the color wheel highlights the scheme colors
- [ ] Lines or shapes connect scheme colors on the wheel (e.g., triangle for triadic)
- [ ] The base color is visually distinguished from derived scheme colors
- [ ] Scheme overlay updates in real-time as the user changes the base color or scheme type
- [ ] The overlay can be toggled on/off
- [ ] Scheme visualization integrates with the existing color wheel component
- [ ] `npm run build` and `npm run lint` pass with no errors

## Key Files

| Action   | File                                            | Description                                 |
| -------- | ----------------------------------------------- | ------------------------------------------- |
| Create   | `src/components/color-wheel/scheme-overlay.tsx` | SVG/Canvas overlay for scheme visualization |
| Modify   | `src/components/color-wheel/color-wheel.tsx`    | Integrate scheme overlay layer              |
| Existing | `src/modules/color/scheme-generator.ts`         | Scheme generation logic                     |

## Implementation

### 1. Scheme overlay component

A transparent layer rendered on top of the color wheel that draws:

- Highlighted markers at each scheme hue position
- Connecting lines between scheme colors (straight lines for complementary, triangle for triadic, etc.)
- A subtle sector highlight or glow along the hue arcs

### 2. Integration with color wheel

The color wheel accepts an optional `activeScheme` prop. When set, the overlay renders on top of the paint markers. The base color can be set by clicking a paint on the wheel.

### 3. Interactive base color selection

Clicking a paint marker or a position on the wheel sets it as the scheme base color. The scheme overlay updates immediately to show the relationships.

## Notes

- The overlay should not obscure paint markers — use semi-transparent lines and subtle highlighting.
- Consider animating the transition when switching scheme types.
- On mobile, the overlay should be simplified to avoid clutter on smaller screens.
