import { findValueScaleNearestPaints } from '@/modules/color-schemes/utils/find-value-scale-nearest-paints'
import { generateScheme } from '@/modules/color-schemes/utils/generate-scheme'
import type { BaseColor } from '@/modules/color-schemes/types/base-color'
import type { SchemePartner } from '@/modules/color-schemes/types/scheme-partner'
import type { ColorScheme } from '@/modules/color-wheel/types/color-scheme'
import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'

/**
 * Builds the non-base partners for a scheme, populated with value-scale paint matches.
 *
 * @param base - The implicit root color (e.g. the paint the user is viewing).
 * @param scheme - The color harmony type to compute partners for.
 * @param paints - Catalog paints used by the value-scale matcher.
 * @param analogousAngle - Spread angle for analogous schemes (15°–60°, default 30°). Ignored for other schemes.
 * @returns Partners (in the order produced by {@link generateScheme}) with the `Base` entry filtered out.
 */
export function getSchemePartners(
  base: BaseColor,
  scheme: ColorScheme,
  paints: ColorWheelPaint[],
  analogousAngle = 30,
): SchemePartner[] {
  return generateScheme(base, scheme, analogousAngle)
    .filter((c) => c.label !== 'Base')
    .map((c) => ({
      label: c.label,
      hue: c.hue,
      paints: findValueScaleNearestPaints(c.hue, paints),
    }))
}
