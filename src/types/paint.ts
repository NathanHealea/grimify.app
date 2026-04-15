/**
 * A miniature paint manufacturer.
 *
 * Represents a brand row from the `brands` table. Each brand has a unique
 * slug used for URL routing and a nullable website URL and logo.
 */
export type Brand = {
  id: number
  name: string
  slug: string
  website_url: string | null
  logo_url: string | null
  created_at: string
}

/**
 * A product line within a brand (e.g., Citadel Base, Vallejo Game Color).
 *
 * Represents a row from the `product_lines` table. Each product line belongs
 * to a single {@link Brand} via `brand_id` and has a unique slug scoped to
 * that brand.
 */
export type ProductLine = {
  id: number
  brand_id: number
  name: string
  slug: string
  description: string | null
  created_at: string
}

/**
 * An individual paint with color data.
 *
 * Represents a row from the `paints` table. Each paint belongs to a
 * {@link ProductLine} and stores its color as hex, RGB components, and
 * HSL values for color wheel mapping.
 *
 * @remarks
 * - `hue` is in degrees (0-360), `saturation` and `lightness` are percentages (0-100).
 * - `paint_type` is the brand-specific category (e.g., "base", "layer", "shade").
 * - `is_metallic` is derived from the product line type containing "metallic" or "metal".
 */
export type Paint = {
  id: string
  brand_paint_id: string
  product_line_id: number
  name: string
  slug: string
  hex: string
  r: number
  g: number
  b: number
  hue: number
  saturation: number
  lightness: number
  hue_id: string | null
  is_metallic: boolean
  is_discontinued: boolean
  paint_type: string | null
  created_at: string
  updated_at: string
}

/**
 * A directional reference between two paints (e.g., similar, alternative).
 *
 * Represents a row from the `paint_references` table. Links a source
 * {@link Paint} to a related paint with a categorized relationship and
 * optional similarity score.
 *
 * @remarks
 * - `relationship` is one of `'similar'`, `'alternative'`, or `'complement'`.
 * - `similarity_score` is a percentage (0-100) when present, or `null` if not computed.
 * - The constraint `paint_id != related_paint_id` prevents self-references.
 */
export type PaintReference = {
  id: number
  paint_id: string
  related_paint_id: string
  relationship: 'similar' | 'alternative' | 'complement'
  similarity_score: number | null
  created_at: string
}
