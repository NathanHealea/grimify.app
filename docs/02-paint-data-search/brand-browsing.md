# Brand and Product Line Browsing

**Epic:** Paint Data & Search
**Type:** Feature
**Status:** Completed
**Branch:** `feature/brand-browsing`
**Merge into:** `v1/main`

## Summary

Allow users to browse paints organized by brand and product line, providing a structured way to explore the paint library.

## Acceptance Criteria

- [x] Users can view a list of all brands with paint counts
- [x] Clicking a brand shows its product lines and all paints grouped by product line
- [x] Paints are displayed with color swatches and names via `paint-card.tsx`
- [x] Navigation breadcrumbs show the current brand context on the detail page
- [x] Brand cards show logo (or initial fallback) and paint count
- [x] Pages are accessible without authentication
- [x] `npm run build` and `npm run lint` pass with no errors

## Routes

| Route          | Description                                        |
| -------------- | -------------------------------------------------- |
| `/brands`      | List of all paint brands with paint counts         |
| `/brands/[id]` | Brand detail with product lines and paints grouped |

## Existing Components & Services

| File                                                              | Description                                                                |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `src/app/brands/page.tsx`                                         | Brand listing page — grid of `BrandCard` components                        |
| `src/app/brands/[id]/page.tsx`                                    | Brand detail page with breadcrumbs, product lines, and grouped paints      |
| `src/modules/brands/components/brand-card.tsx`                    | Card with logo/initial, brand name, and paint count; links to detail page  |
| `src/modules/brands/components/brand-paint-list.tsx`              | Groups paints by product line on the brand detail page                     |
| `src/modules/brands/services/brand-service.ts`                   | `getAllBrands()`, `getBrandById()`, `getBrandProductLines()`, `getBrandPaints()` |
| `src/modules/brands/services/brand-service.server.ts`            | Server-side brand service factory                                          |
| `src/modules/brands/services/brand-service.client.ts`            | Client-side brand service factory                                          |
| `src/modules/paints/components/paint-card.tsx`                    | Reusable paint card with color swatch, name, brand, and type               |
| `src/types/paint.ts`                                              | `Brand`, `ProductLine`, `Paint` types                                      |

## Implementation

### 1. Brands listing page

Grid of brand cards showing brand name, logo (with initial fallback), and paint count. Each card links to the brand detail page at `/brands/[id]`.

### 2. Brand detail page

Shows brand info (name, website link) with breadcrumbs back to `/brands`. Uses `BrandPaintList` to display all paints grouped by product line.

### 3. Brand card component

A clickable card showing:
- Logo image (or first-letter initial in a styled circle as fallback)
- Brand name
- Paint count

### 4. Brand paint list component

Groups paints by product line for display on the brand detail page. Each section shows the product line name and its paints.

## Notes

- All browse pages are public (no auth required).
- Routes use numeric IDs (not slugs) for brand identification.
- The brand service aggregates paint counts across product lines using a join through `product_lines` to `paints`.
