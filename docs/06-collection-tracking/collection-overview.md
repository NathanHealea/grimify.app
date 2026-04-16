# Collection Overview and Statistics

**Epic:** Collection Tracking
**Type:** Feature
**Status:** Todo
**Branch:** `feature/collection-overview`
**Merge into:** `v1/main`

## Summary

Provide users with an overview of their paint collection, including statistics, organization tools, and visual summaries.

## Acceptance Criteria

- [ ] Users can view all paints in their collection on a dedicated page
- [ ] Collection paints can be sorted by name, brand, date added, or hue
- [ ] Collection paints can be filtered by brand or paint type
- [ ] Statistics are displayed: total paints, breakdown by brand, breakdown by paint type
- [ ] A mini color wheel visualization shows the user's collection coverage
- [ ] Users can export their collection as a shareable list
- [ ] `npm run build` and `npm run lint` pass with no errors

## Routes

| Route         | Description                                      |
| ------------- | ------------------------------------------------ |
| `/collection` | User's paint collection overview (auth required) |

## Key Files

| Action | File                                       | Description                                  |
| ------ | ------------------------------------------ | -------------------------------------------- |
| Create | `src/app/(main)/collection/page.tsx`       | Collection overview page                     |
| Create | `src/components/collection-stats.tsx`      | Collection statistics component              |
| Create | `src/components/collection-mini-wheel.tsx` | Mini color wheel showing collection coverage |

## Implementation

### 1. Collection page

A page showing all paints the user owns as a grid of paint cards. Supports sorting and filtering via controls at the top.

### 2. Collection statistics

A summary panel showing:

- Total paint count
- Paints by brand (bar chart or list)
- Paints by type (base, layer, shade, etc.)
- Most recent additions

### 3. Mini color wheel

A small, non-interactive version of the color wheel that plots only the user's collection. Helps visualize color coverage and spot gaps (e.g., "I have no warm reds").

### 4. Export

A button to export the collection as a CSV or shareable link. The link uses the user's public profile (from Community & Social epic) if enabled.

## Notes

- This page requires authentication — redirect to sign-in if not logged in.
- The mini wheel reuses the color wheel rendering logic at a smaller scale.
- Consider lazy loading the paint grid for users with large collections.
