/**
 * Per-option paint counts for each filter dimension, computed against the
 * current filter context with that dimension held out.
 *
 * Counts reflect the number of paints that would match if the user added
 * that specific option to the existing selection of all other active filters.
 *
 * @property brand - Keyed by `brand.id` (stringified). Count of paints for
 *   that brand given all other active filters.
 * @property type - Keyed by lowercased `paint_type` string. Count of paints
 *   of that type given all other active filters.
 * @property line - Keyed by `product_line.id` (stringified). Count of paints
 *   in that product line given all other active filters. Only populated when
 *   ≥1 brand is selected (mirrors the brand-gated UI).
 */
export type PaintFacetCounts = {
  brand: Record<string, number>
  type: Record<string, number>
  line: Record<string, number>
}
