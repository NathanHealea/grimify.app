# Brand and Product Line Browsing

**Epic:** Paint Data & Search
**Type:** Feature
**Status:** Todo

## Summary

Allow users to browse paints organized by brand and product line, providing a structured way to explore the paint library.

## Acceptance Criteria

- [ ] Users can view a list of all brands
- [ ] Clicking a brand shows its product lines
- [ ] Clicking a product line shows all paints in that line
- [ ] Paints are displayed with color swatches and names
- [ ] Navigation breadcrumbs show the current brand/product line context
- [ ] Pages are accessible without authentication
- [ ] `npm run build` and `npm run lint` pass with no errors

## Routes

| Route                       | Description                           |
| --------------------------- | ------------------------------------- |
| `/brands`                   | List of all paint brands              |
| `/brands/[slug]`            | Single brand with its product lines   |
| `/brands/[slug]/[lineSlug]` | All paints in a specific product line |

## Key Files

| Action   | File                                        | Description                     |
| -------- | ------------------------------------------- | ------------------------------- |
| Create   | `src/app/brands/page.tsx`                   | Brand listing page              |
| Create   | `src/app/brands/[slug]/page.tsx`            | Brand detail with product lines |
| Create   | `src/app/brands/[slug]/[lineSlug]/page.tsx` | Product line paint listing      |
| Create   | `src/components/brand-card.tsx`             | Brand card with logo/name       |
| Existing | `src/components/paint-card.tsx`             | Paint card with color swatch    |

## Implementation

### 1. Brands listing page

Grid of brand cards showing brand name, logo (if available), and paint count. Links to brand detail page.

### 2. Brand detail page

Shows brand info and lists all product lines as cards with paint counts. Links to product line pages.

### 3. Product line page

Grid of paint cards for all paints in the product line, sorted by paint type then name. Breadcrumb navigation back to brand and brands list.

## Notes

- All browse pages are public (no auth required).
- Use Next.js dynamic routes with `generateStaticParams` for static generation where practical.
- Paint counts can be fetched with Supabase aggregate queries.
