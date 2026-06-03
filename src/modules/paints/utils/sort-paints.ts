/**
 * Fields that can be used to sort a paint-like object.
 *
 * - `name` — alphabetical by paint name.
 * - `paint_type` — alphabetical by paint type string; nulls sort last.
 * - `hue` — numeric HSL hue (0–360 degrees), red→violet ascending.
 * - `saturation` — numeric HSL saturation (0–100 percent).
 * - `lightness` — numeric HSL lightness (0–100 percent).
 * - `contrast` — perceptual relative luminance via the WCAG formula
 *   `0.2126·r + 0.7152·g + 0.0722·b` (sRGB 0-255 inputs).
 *   Distinct from HSL lightness — e.g. pure blue and pure yellow share
 *   the same HSL L (50 %) but have very different luminance (~7 % vs ~93 %).
 */
export type PaintSortField = 'name' | 'paint_type' | 'hue' | 'saturation' | 'lightness' | 'contrast'

/** Sort direction for paint sorting. */
export type PaintSortDirection = 'asc' | 'desc'

/**
 * Minimal shape required to sort a paint-like object.
 *
 * `ColorWheelPaint` and any other paint projection satisfy this structurally —
 * callers do not need to convert their data.
 *
 * The `r`, `g`, `b` fields are the sRGB component values in the 0–255 range,
 * used when sorting by `'contrast'` (perceptual relative luminance:
 * `0.2126·r + 0.7152·g + 0.0722·b`). See {@link PaintSortField}.
 *
 * These three fields are optional so that existing callers (e.g. the palette
 * builder, which works with {@link ColorWheelPaint}) continue to satisfy this
 * type without modification. When `r/g/b` are absent and the field is
 * `'contrast'`, the sort falls back to 0 for both operands (stable/neutral).
 */
export type SortablePaint = {
  name: string
  paint_type: string | null
  hue: number
  saturation: number
  lightness: number
  r?: number
  g?: number
  b?: number
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
    } else if (field === 'contrast') {
      // Perceptual relative luminance: WCAG formula on sRGB 0-255 components.
      // r/g/b are optional on SortablePaint; fall back to 0 when absent so that
      // callers that don't supply RGB (e.g. palette builder) get a neutral sort.
      const aLum = 0.2126 * (a.paint.r ?? 0) + 0.7152 * (a.paint.g ?? 0) + 0.0722 * (a.paint.b ?? 0)
      const bLum = 0.2126 * (b.paint.r ?? 0) + 0.7152 * (b.paint.g ?? 0) + 0.0722 * (b.paint.b ?? 0)
      cmp = aLum - bLum
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
