/**
 * Lightweight paint projection for color wheel rendering.
 *
 * Contains only the fields needed to position a paint on the wheel,
 * style its marker, populate the hover tooltip, and support filter operations.
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
  brand_name: string
  product_line_name: string
  brand_id: string
  product_line_id: string
  paint_type: string | null
}
