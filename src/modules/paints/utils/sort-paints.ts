/** Fields that can be used to sort a paint-like object. */
export type PaintSortField = 'name' | 'paint_type' | 'hue' | 'saturation' | 'lightness'

/** Sort direction for paint sorting. */
export type PaintSortDirection = 'asc' | 'desc'

/**
 * Minimal shape required to sort a paint-like object.
 *
 * `ColorWheelPaint` and any other paint projection satisfy this structurally —
 * callers do not need to convert their data.
 */
export type SortablePaint = {
  name: string
  paint_type: string | null
  hue: number
  saturation: number
  lightness: number
}

/**
 * Sort an array of paint wrappers by reading paint data via a selector.
 *
 * Items whose `getPaint` returns `undefined` sort last in both directions.
 * The sort is stable: equal keys preserve their original relative order.
 *
 * @param items - Array of items to sort.
 * @param getPaint - Selector that extracts the {@link SortablePaint} from each item.
 * @param field - The {@link PaintSortField} to sort by.
 * @param direction - `'asc'` or `'desc'`.
 * @returns A new sorted array; `items` is not mutated.
 */
export function sortPaintsBy<T>(
  items: T[],
  getPaint: (item: T) => SortablePaint | undefined,
  field: PaintSortField,
  direction: PaintSortDirection,
): T[] {
  const indexed = items.map((item, index) => ({ item, paint: getPaint(item), index }))

  indexed.sort((a, b) => {
    // Items with no paint sort last regardless of direction
    if (a.paint === undefined && b.paint === undefined) return a.index - b.index
    if (a.paint === undefined) return 1
    if (b.paint === undefined) return -1

    let cmp = 0

    if (field === 'name') {
      cmp = a.paint.name.localeCompare(b.paint.name, undefined, { sensitivity: 'base' })
    } else if (field === 'paint_type') {
      const aType = a.paint.paint_type
      const bType = b.paint.paint_type
      // Nulls sort last in both directions
      if (aType === null && bType === null) cmp = 0
      else if (aType === null) cmp = 1
      else if (bType === null) cmp = -1
      else cmp = aType.localeCompare(bType, undefined, { sensitivity: 'base' })
    } else {
      cmp = a.paint[field] - b.paint[field]
    }

    if (cmp !== 0) return direction === 'asc' ? cmp : -cmp
    // Stable tiebreaker
    return a.index - b.index
  })

  return indexed.map((e) => e.item)
}

/**
 * Sort an array of {@link SortablePaint}-shaped objects.
 *
 * Convenience wrapper around {@link sortPaintsBy} for the direct case where
 * each item is itself a paint (not a wrapper).
 *
 * @param paints - Array of paint objects to sort.
 * @param field - The {@link PaintSortField} to sort by.
 * @param direction - `'asc'` or `'desc'`.
 * @returns A new sorted array; `paints` is not mutated.
 */
export function sortPaints<T extends SortablePaint>(
  paints: T[],
  field: PaintSortField,
  direction: PaintSortDirection,
): T[] {
  return sortPaintsBy(paints, (p) => p, field, direction)
}
