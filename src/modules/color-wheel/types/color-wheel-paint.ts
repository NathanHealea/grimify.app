/**
 * Lightweight paint projection for color wheel rendering and cross-brand matching.
 *
 * Contains only the fields needed to position a paint on the wheel,
 * style its marker, populate the hover tooltip, support filter operations,
 * and rank candidate matches across brands.
 *
 * `is_discontinued` is populated when paints are fetched with the
 * `includeDiscontinued` option (the default fetch excludes them and leaves
 * this field `false`).
 */
export type ColorWheelPaint = {
  id: string
  name: string
  hex: string
  hue: number
  saturation: number
  lightness: number
  hue_id: string | null
  is_metallic: boolean
  is_discontinued: boolean
  brand_name: string
  product_line_name: string
  brand_id: string
  product_line_id: string
  paint_type: string | null
}
