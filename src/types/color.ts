/**
 * An entry in the self-referencing Itten hue hierarchy.
 *
 * Top-level hues (the 12 Itten color wheel positions plus Neutral) have
 * `parent_id = null` and a non-null `sort_order`. Child entries represent
 * named colors within a hue group (e.g., "Crimson" under "Red") and have
 * `parent_id` set to their parent hue's ID with `sort_order = null`.
 */
export type IttenHue = {
  id: string
  parent_id: string | null
  name: string
  hex_code: string
  sort_order: number | null
  created_at: string
}
