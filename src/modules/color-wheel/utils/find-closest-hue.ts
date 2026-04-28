import {
  COLOR_CATALOG,
  HUE_ANGLE_RANGES,
  MUNSELL_HUES,
  NEUTRAL_SATURATION_THRESHOLD,
  SUB_HUES_PER_PARENT,
} from '@/modules/color-wheel/data/iscc-nbs-catalog'
import { hexToRgb } from '@/modules/color-wheel/utils/hex-to-hsl'

/** Pre-computed RGB values for each entry in {@link COLOR_CATALOG}, in catalog order. */
const COLOR_CATALOG_RGB = COLOR_CATALOG.map((c) => ({
  slug: c.slug,
  ...hexToRgb(c.hex),
}))

/**
 * Determines which Munsell principal hue family a color belongs to based on
 * its HSL hue angle and saturation.
 *
 * Saturations below {@link NEUTRAL_SATURATION_THRESHOLD} are classified as
 * Neutral. Otherwise the hue angle is bucketed via {@link HUE_ANGLE_RANGES},
 * with Red wrapping across 350°–14°.
 *
 * @param h - HSL hue angle in degrees (0–360).
 * @param s - HSL saturation in percent (0–100).
 * @returns Index into {@link MUNSELL_HUES} (0–9 chromatic, 10 Neutral).
 */
export function findPrincipalHueIndex(h: number, s: number): number {
  if (s < NEUTRAL_SATURATION_THRESHOLD) return MUNSELL_HUES.length - 1

  if (h >= 350 || h < 14) return 0

  for (const range of HUE_ANGLE_RANGES) {
    if (h >= range.min && h < range.max) return range.hueIndex
  }

  return MUNSELL_HUES.length - 1
}

/**
 * Finds the closest ISCC-NBS sub-hue slug for a paint color using a two-step
 * approach:
 *
 * 1. Determine the principal hue family from HSL hue angle and saturation
 *    via {@link findPrincipalHueIndex}.
 * 2. Within that family's 11 sub-hues, pick the one with the smallest
 *    Euclidean RGB distance to the input color.
 *
 * This guarantees that, for example, a green paint always maps to a Green
 * sub-hue rather than drifting into Yellow when its lightness happens to be
 * close to a yellow reference.
 *
 * @param r - Red channel (0–255).
 * @param g - Green channel (0–255).
 * @param b - Blue channel (0–255).
 * @param h - HSL hue angle in degrees (0–360).
 * @param s - HSL saturation in percent (0–100).
 * @returns Slug of the closest sub-hue from {@link COLOR_CATALOG}.
 */
export function findClosestColor(r: number, g: number, b: number, h: number, s: number): string {
  const parentIdx = findPrincipalHueIndex(h, s)
  const startIdx = parentIdx * SUB_HUES_PER_PARENT
  const endIdx = startIdx + SUB_HUES_PER_PARENT

  let bestSlug = COLOR_CATALOG[startIdx].slug
  let bestDist = Infinity

  for (let i = startIdx; i < endIdx; i++) {
    const c = COLOR_CATALOG_RGB[i]
    const dr = r - c.r
    const dg = g - c.g
    const db = b - c.b
    const dist = dr * dr + dg * dg + db * db
    if (dist < bestDist) {
      bestDist = dist
      bestSlug = c.slug
    }
  }

  return bestSlug
}

/**
 * Applies the "very dark named-Black paints belong to Neutral" override.
 *
 * Painters consistently expect paints named "Black", "Black Wash", "Black
 * Primer", etc. to live under Neutral even when the rendered hex carries a
 * slight chromatic tint. When the input lightness is below 25 and the name
 * matches the pattern, this returns `'black'` (lightness < 10) or
 * `'near-black'` instead of the otherwise-computed slug.
 *
 * @param slug - The slug returned by {@link findClosestColor}.
 * @param paintName - The paint's display name.
 * @param lightness - HSL lightness in percent (0–100).
 * @returns The (possibly overridden) sub-hue slug.
 */
export function applyBlackPaintOverride(slug: string, paintName: string, lightness: number): string {
  const nameLower = paintName.toLowerCase()
  const isBlackName =
    nameLower === 'black' || nameLower.startsWith('black ') || nameLower.endsWith(' black')
  if (lightness < 25 && isBlackName && slug !== 'black' && slug !== 'near-black') {
    return lightness < 10 ? 'black' : 'near-black'
  }
  return slug
}
