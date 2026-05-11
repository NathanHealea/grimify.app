# Side-by-Side Paint Comparison UI

**Epic:** Cross-Brand Comparison
**Type:** Feature
**Status:** Todo
**Branch:** `feature/comparison-ui`
**Merge into:** `main`

## Summary

Provide a UI for comparing two or more paints side by side, showing their color swatches, properties, and similarity score.

## Acceptance Criteria

- [ ] Users can select two or more paints to compare
- [ ] Selected paints are shown side by side with large color swatches
- [ ] Comparison shows: name, brand, product line, hex, paint type, and Delta E score
- [ ] Users can add/remove paints from the comparison
- [ ] A "find similar" button on any paint triggers comparison with closest matches
- [ ] Comparison state persists via URL params (shareable comparisons)
- [ ] `npm run build` and `npm run lint` pass with no errors

## Routes

| Route                         | Description                          |
| ----------------------------- | ------------------------------------ |
| `/compare`                    | Comparison page with selected paints |
| `/compare?paints=id1,id2,id3` | Shareable comparison URL             |

## Key Files

| Action | File                                       | Description                             |
| ------ | ------------------------------------------ | --------------------------------------- |
| Create | `src/app/compare/page.tsx`                 | Comparison page                         |
| Create | `src/components/paint-comparison-card.tsx` | Side-by-side paint card                 |
| Create | `src/components/paint-picker.tsx`          | Paint selector for adding to comparison |

## Implementation

### 1. Comparison page

Displays selected paints in a row (or stacked on mobile). Each paint shows a large swatch and properties. Delta E scores between each pair are displayed.

### 2. Paint picker

A search-based picker component for adding paints to the comparison. Reuses the search logic from the Paint Search feature.

### 3. "Find similar" flow

From any paint detail view, a "Find similar" button navigates to the comparison page pre-populated with the source paint and its closest matches from the matching engine.

## Notes

- Limit comparison to a reasonable number of paints (e.g., 6) to keep the UI readable.
- Consider a color blend preview showing what a 50/50 mix of two paints would look like.
- URL params enable sharing comparisons with other painters.
