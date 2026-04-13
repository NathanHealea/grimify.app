# Color Distance Algorithm and Matching Engine

**Epic:** Cross-Brand Comparison
**Type:** Feature
**Status:** Todo

## Summary

Implement a color distance algorithm that can find the closest matching paints across brands, enabling cross-brand comparison and substitute discovery.

## Acceptance Criteria

- [ ] A color distance function computes perceptual similarity between two colors
- [ ] Given a paint, the engine returns the N closest matches from other brands
- [ ] Matching accounts for perceptual color difference (not just RGB euclidean distance)
- [ ] Results are ranked by similarity score
- [ ] Matching can be scoped to specific brands or across all brands
- [ ] `npm run build` and `npm run lint` pass with no errors

## Key Files

| Action | File                                  | Description                                         |
| ------ | ------------------------------------- | --------------------------------------------------- |
| Create | `src/modules/color/color-distance.ts` | Color distance algorithms (CIEDE2000 or similar)    |
| Create | `src/modules/color/color-convert.ts`  | Color space conversion utilities (RGB to LAB, etc.) |
| Create | `src/modules/paint/match-engine.ts`   | Paint matching query logic                          |

## Implementation

### 1. Color space conversion

Implement conversion from RGB to CIELAB color space, which better represents human color perception. This involves:

- RGB to XYZ conversion
- XYZ to LAB conversion

### 2. Color distance function

Implement CIEDE2000 (or Delta E 2000) for perceptual color distance. This is the industry standard for comparing how different two colors appear to the human eye, accounting for hue, lightness, and chroma differences.

### 3. Matching engine

A function that takes a paint ID and returns the closest matches:

- Fetches the source paint's color values
- Computes distance against all other paints (optionally filtered by brand)
- Returns top N results sorted by distance score
- Includes the distance score in results for display

## Key Design Decisions

- **CIEDE2000 over simple RGB distance** — RGB euclidean distance doesn't match human perception. Two colors can be numerically close in RGB but look very different. CIEDE2000 accounts for this.
- **Server-side computation** — Matching runs on the server to avoid sending the entire paint database to the client. Results are cached or computed on demand.
- **Precomputed LAB values** — Consider storing LAB values in the database to avoid repeated conversion.

## Notes

- For MVP, computing distance against all paints on each request is acceptable. For scale, consider precomputing a distance matrix or using spatial indexing.
- A Delta E value under 2.0 is generally considered imperceptible to the human eye.
- Metallic paints may need special handling as their perceived color varies with viewing angle.
