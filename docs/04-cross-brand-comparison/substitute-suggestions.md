# Substitute Suggestions for Discontinued Paints

**Epic:** Cross-Brand Comparison
**Type:** Feature
**Status:** Todo

## Summary

Surface substitute suggestions for discontinued paints, helping painters find available alternatives when a paint they need is no longer sold.

## Acceptance Criteria

- [ ] Discontinued paints are visually marked in search results and detail views
- [ ] Discontinued paint detail pages show a "Substitutes" section with closest available matches
- [ ] Substitutes are ranked by color similarity (Delta E)
- [ ] Users can filter substitutes by brand
- [ ] A dedicated "discontinued paints" browse page lists all discontinued paints with their top substitutes
- [ ] `npm run build` and `npm run lint` pass with no errors

## Routes

| Route | Description |
|---|---|
| `/discontinued` | Browse all discontinued paints with substitutes |

## Key Files

| Action | File | Description |
|---|---|---|
| Create | `src/app/discontinued/page.tsx` | Discontinued paints listing with substitutes |
| Modify | Paint detail panel/page | Add substitutes section for discontinued paints |
| Existing | `src/modules/paint/match-engine.ts` | Reuse matching engine, excluding discontinued paints from results |

## Implementation

### 1. Discontinued badge

Add a visual indicator (badge, strikethrough, or icon) to paint cards and detail views when `is_discontinued` is true.

### 2. Substitute section

On discontinued paint detail views, automatically run the matching engine (excluding other discontinued paints) and display the top 5 substitutes with Delta E scores.

### 3. Discontinued browse page

A filterable list of all discontinued paints, each showing the paint swatch, original brand/line, and top 3 available substitutes inline.

## Notes

- Substitutes should only suggest paints that are currently available (not discontinued themselves).
- This feature depends on the color matching engine from the Cross-Brand Comparison epic.
- Community-sourced substitute suggestions could be added later as a social feature.
