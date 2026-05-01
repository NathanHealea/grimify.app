import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'

/** Brand option for filter UI. */
export type FilterBrand = { id: string; name: string }

/** Product line option for filter UI. */
export type FilterProductLine = { id: string; name: string; brand_id: string }

/** Available options derived from the paint array for populating filter controls. */
export type FilterOptions = {
  /** Unique brands, sorted by name. */
  brands: FilterBrand[]
  /** Unique product lines with their parent brand ID, sorted by name. */
  productLines: FilterProductLine[]
  /** Unique non-null paint types, sorted. */
  paintTypes: string[]
}

/**
 * Derives available filter options from a paint array.
 *
 * Walks the array once to collect unique brands, product lines, and paint types.
 * Called once per `paints` reference change in the container and memoized there.
 *
 * @param paints - The full (unfiltered) paint array.
 * @returns {@link FilterOptions} with brands, product lines, and paint types sorted by name/value.
 */
export function deriveFilterOptions(paints: ColorWheelPaint[]): FilterOptions {
  const brandMap = new Map<string, string>()
  const lineMap = new Map<string, FilterProductLine>()
  const typeSet = new Set<string>()

  for (const paint of paints) {
    if (!brandMap.has(paint.brand_id)) {
      brandMap.set(paint.brand_id, paint.brand_name)
    }
    if (!lineMap.has(paint.product_line_id)) {
      lineMap.set(paint.product_line_id, {
        id: paint.product_line_id,
        name: paint.product_line_name,
        brand_id: paint.brand_id,
      })
    }
    if (paint.paint_type !== null) {
      typeSet.add(paint.paint_type)
    }
  }

  const brands: FilterBrand[] = Array.from(brandMap.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const productLines: FilterProductLine[] = Array.from(lineMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  )

  const paintTypes = Array.from(typeSet).sort()

  return { brands, productLines, paintTypes }
}
