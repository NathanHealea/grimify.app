# Color Scheme Generation

**Epic:** Color Scheme Explorer
**Type:** Feature
**Status:** Todo

## Summary

Provide tools for generating color schemes (complementary, split-complementary, analogous, triadic, tetradic) from a selected base color or paint, helping painters make intentional, harmonious color choices.

## Acceptance Criteria

- [ ] Users can select a base color (via paint picker or manual hex/hue input)
- [ ] The app generates complementary, split-complementary, analogous, triadic, and tetradic schemes
- [ ] Each scheme type is selectable via tabs or toggles
- [ ] Generated scheme colors are displayed as swatches with their hue/hex values
- [ ] Users can adjust scheme parameters (e.g., analogous angle spread)
- [ ] `npm run build` and `npm run lint` pass with no errors

## Routes

| Route | Description |
|---|---|
| `/schemes` | Color scheme explorer page |

## Key Files

| Action | File | Description |
|---|---|---|
| Create | `src/app/schemes/page.tsx` | Scheme explorer page |
| Create | `src/modules/color/scheme-generator.ts` | Color scheme generation logic |
| Create | `src/components/scheme-display.tsx` | Scheme visualization component |

## Implementation

### 1. Scheme generation logic

Pure functions that take a base hue and return scheme hues:

- **Complementary**: base + 180
- **Split-complementary**: base + 150, base + 210
- **Analogous**: base - 30, base, base + 30 (configurable angle)
- **Triadic**: base, base + 120, base + 240
- **Tetradic**: base, base + 90, base + 180, base + 270

All angles normalized to 0-360.

### 2. Scheme explorer page

A page with:
- Base color picker (select a paint from the database or enter a custom hex)
- Scheme type selector (tabs)
- Generated color swatches for the active scheme
- For each scheme color, show the computed hue, hex, and nearest matching paints

### 3. Scheme display component

Visual display of the scheme colors as large swatches in a row, with connecting lines or arcs showing their relationship on the color wheel.

## Notes

- Scheme generation operates on hue only. Saturation and lightness are inherited from the base color but can be adjusted.
- This feature works without authentication — anyone can explore schemes.
- The nearest matching paints for each scheme color will use the matching engine from Cross-Brand Comparison.
