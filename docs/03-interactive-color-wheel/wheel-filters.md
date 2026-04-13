# Filter Wheel by Brand, Collection, or Owned Paints

**Epic:** Interactive Color Wheel
**Type:** Feature
**Status:** Todo

## Summary

Add filter controls to the color wheel so users can narrow the displayed paints by brand, product line, paint type, or their personal collection.

## Acceptance Criteria

- [ ] Users can filter paints on the wheel by brand (multi-select)
- [ ] Users can filter by product line within selected brands
- [ ] Users can filter by paint type (base, layer, shade, etc.)
- [ ] Authenticated users can toggle to show only paints in their collection
- [ ] Filters can be combined (e.g., "Citadel base paints I own")
- [ ] Active filters are displayed and individually removable
- [ ] Filter state persists via URL search params
- [ ] `npm run build` and `npm run lint` pass with no errors

## Key Files

| Action | File                                           | Description                                  |
| ------ | ---------------------------------------------- | -------------------------------------------- |
| Create | `src/components/color-wheel/wheel-filters.tsx` | Filter panel component                       |
| Create | `src/hooks/use-wheel-filters.ts`               | Filter state management synced to URL params |
| Modify | `src/components/color-wheel/color-wheel.tsx`   | Apply filters to displayed paints            |

## Implementation

### 1. Filter panel

A collapsible sidebar or toolbar with:

- Brand multi-select checkboxes
- Product line dropdown (filtered by selected brands)
- Paint type toggles
- "My collection" toggle (visible when authenticated)
- Active filter chips with remove buttons

### 2. Filter state

Use Zustand or URL search params (`useSearchParams`) to manage filter state. Filters are applied client-side by filtering the paint data array before rendering markers.

### 3. Collection filter

When "My collection" is active, fetch the user's collection IDs and intersect with the paint data. Requires the Collection Tracking epic to be implemented.

## Notes

- Filter panel should not obstruct the wheel on mobile — consider a bottom sheet or toggle drawer.
- URL param sync enables shareable filtered wheel views.
- The "My collection" filter gracefully degrades to hidden when not authenticated.
