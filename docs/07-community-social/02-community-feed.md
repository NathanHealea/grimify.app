# Community Feed and Discovery

**Epic:** Community & Social
**Type:** Feature
**Status:** Todo
**Branch:** `feature/community-feed`
**Merge into:** `v1/main`

## Summary

Provide a central feed where users can discover recently shared recipes, palettes, and collections from the community.

## Acceptance Criteria

- [ ] A community feed page shows recent recipes, palettes, and shared collections
- [ ] Feed items show author, title, preview (color swatches), and timestamp
- [ ] Feed is paginated or infinite-scrolling
- [ ] Users can filter the feed by content type (recipes, palettes, collections)
- [ ] Feed items link to their detail pages
- [ ] Feed is accessible without authentication (public)
- [ ] `npm run build` and `npm run lint` pass with no errors

## Routes

| Route        | Description         |
| ------------ | ------------------- |
| `/community` | Community feed page |

## Key Files

| Action | File                                | Description                      |
| ------ | ----------------------------------- | -------------------------------- |
| Create | `src/app/(main)/community/page.tsx` | Community feed page              |
| Create | `src/components/feed-card.tsx`      | Unified feed item card component |

## Implementation

### 1. Feed query

A server-side query that unions recent recipes, palettes, and shared collections, sorted by creation date. Returns a unified feed item shape with type discriminator.

### 2. Feed card

A polymorphic card component that renders differently based on content type:

- **Recipe**: Title, author, step count, first few paint swatches
- **Palette**: Title, author, color strip preview
- **Collection**: Username, paint count, mini color wheel or swatch grid

### 3. Filtering and pagination

Filter tabs at the top (All, Recipes, Palettes, Collections). Cursor-based pagination for infinite scroll.

## Notes

- The feed is the community landing page — it should load fast and look visually rich.
- Consider "popular this week" and "recently added" sections.
- Likes or favorites could be added later to enable sorting by popularity.
