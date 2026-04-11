# Map Schemes to Available Paints

**Epic:** Color Scheme Explorer
**Type:** Feature
**Status:** Todo

## Summary

For each color in a generated scheme, find and suggest the closest matching real paints from the database, bridging the gap between abstract color theory and actual available products.

## Acceptance Criteria

- [ ] Each scheme color shows the top 3-5 closest matching paints
- [ ] Matches are ranked by Delta E (perceptual distance)
- [ ] Users can filter suggested paints by brand
- [ ] Users can filter to show only paints they own (if authenticated)
- [ ] Clicking a suggested paint opens its detail view
- [ ] The entire scheme can be saved as a palette (links to Community & Social epic)
- [ ] `npm run build` and `npm run lint` pass with no errors

## Key Files

| Action   | File                                          | Description                                       |
| -------- | --------------------------------------------- | ------------------------------------------------- |
| Create   | `src/components/scheme-paint-suggestions.tsx` | Paint suggestions for scheme colors               |
| Modify   | `src/app/schemes/page.tsx`                    | Integrate paint suggestions below scheme display  |
| Existing | `src/modules/paint/match-engine.ts`           | Reuse matching engine with target hue/color input |

## Implementation

### 1. Scheme-to-paint mapping

Extend the matching engine to accept a raw HSL/hex color (not just an existing paint ID) and find the closest paints. For each scheme color, run the matcher and return top results.

### 2. Paint suggestion display

Below each scheme color swatch, display a horizontal scrollable list of suggested paints as small cards. Each card shows the paint swatch, name, brand, and Delta E score.

### 3. Filters

Brand filter and "my collection" toggle apply to all scheme color suggestions simultaneously. This helps painters plan a scheme using only paints from brands they prefer or already own.

## Notes

- This feature bridges color theory with practical paint selection — a core value proposition of Grimify.
- Depends on the color matching engine from Cross-Brand Comparison.
- The "save as palette" action connects to the Community & Social epic (palette sharing).
