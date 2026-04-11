# Paint Search by Name, Hex, and Brand

**Epic:** Paint Data & Search
**Type:** Feature
**Status:** Todo

## Summary

Provide a fast, flexible search interface that lets painters find paints by name, hex color code, or brand.

## Acceptance Criteria

- [ ] Users can search paints by name (partial match, case-insensitive)
- [ ] Users can search by hex code (exact or partial match)
- [ ] Users can filter results by brand
- [ ] Search results display paint name, brand, product line, and color swatch
- [ ] Search is responsive and returns results quickly (debounced input)
- [ ] Empty state is shown when no results match
- [ ] `npm run build` and `npm run lint` pass with no errors

## Routes

| Route | Description |
|---|---|
| `/search` | Paint search page with input and results |

## Key Files

| Action | File | Description |
|---|---|---|
| Create | `src/app/search/page.tsx` | Search page with input and result list |
| Create | `src/modules/paint/search.ts` | Server-side search query logic |
| Create | `src/components/paint-card.tsx` | Paint result card with color swatch |

## Implementation

### 1. Search page

A search page with a text input that searches across paint name and hex fields. An optional brand filter dropdown narrows results. Results are displayed as a grid of paint cards.

### 2. Search query

Server-side search using Supabase `ilike` for name matching and exact/prefix match for hex codes. Joins through `product_lines` and `brands` to include brand information in results.

### 3. Paint card component

A reusable card component showing:
- Color swatch (rendered div with background-color from hex)
- Paint name
- Brand and product line
- Paint type badge (if applicable)

## Notes

- Search should be usable without authentication (public page).
- Consider full-text search or trigram indexes for better fuzzy matching in the future.
- Debounce client-side input to avoid excessive queries.
