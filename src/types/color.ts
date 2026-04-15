/**
 * An entry in the self-referencing Munsell hue hierarchy.
 *
 * Top-level hues (the 10 Munsell principal hues plus Neutral) have
 * `parent_id = null` and a non-null `sort_order`. Child entries represent
 * ISCC-NBS sub-hues (e.g., "Vivid Red" under "Red") and have
 * `parent_id` set to their parent hue's ID with `sort_order = null`.
 */
export type Hue = {
  id: string
  parent_id: string | null
  name: string
  slug: string
  hex_code: string
  sort_order: number | null
  created_at: string
}
