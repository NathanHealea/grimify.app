/**
 * A named color group that categorizes paints by hue family.
 *
 * Used on the `/paints` index page to organize paints into browsable
 * color categories (e.g., Reds, Blues, Greens). Each group defines a
 * hue range and a representative hex color for the swatch display.
 *
 * @remarks
 * - `slug` is used for URL query params (e.g., `/paints?group=reds`).
 * - `count` is the number of paints that fall within the hue range.
 * - Neutrals are identified by low saturation rather than hue range.
 */
export type ColorGroup = {
  /** Display name for the color group (e.g., "Reds", "Blues"). */
  name: string
  /** URL-safe slug for the group (e.g., "reds", "blues"). */
  slug: string
  /** Representative hex color for the group swatch. */
  hex: string
  /** Number of paints in this group. */
  count: number
}
