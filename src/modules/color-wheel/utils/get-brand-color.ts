/**
 * Returns a stable, deterministic CSS color string for a brand.
 *
 * Hashes `brandId` into a hue angle and returns `hsl(h 60% 50%)`. The same
 * input always produces the same output, so brand ring arcs are visually
 * consistent across renders and sessions.
 *
 * @remarks
 * This is a stand-in until the `brands` table grows a `color` column. When
 * that column is added, replace this helper with a direct field lookup and
 * update `ColorWheelPaint` to carry the brand color.
 *
 * @param brandId - The brand's UUID or stable identifier string.
 * @returns A CSS `hsl()` color string.
 */
export function getBrandColor(brandId: string): string {
  let hash = 0
  for (let i = 0; i < brandId.length; i++) {
    hash = (hash * 31 + brandId.charCodeAt(i)) | 0
  }
  const hue = ((hash % 360) + 360) % 360
  return `hsl(${hue} 60% 50%)`
}
