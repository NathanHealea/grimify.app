import type { ColorScheme } from '@/modules/color-wheel/types/color-scheme'
import { hslToHex } from '@/modules/color-wheel/utils/hsl-to-hex'

interface SchemeWedge {
  center: number
  span: number
  color: string
}

/**
 * Returns the wedge descriptors for the given hue and color harmony scheme.
 *
 * Each wedge has a `center` angle (0–360), a half-`span` in degrees, and a
 * pre-computed `color` string used to fill the overlay on the wheel.
 *
 * @param hue - Wheel-position hue (0–360) of the reference paint.
 * @param scheme - Color harmony relationship to compute.
 * @returns Array of {@link SchemeWedge} descriptors, one per harmony partner.
 */
export function getSchemeWedges(hue: number, scheme: ColorScheme): SchemeWedge[] {
  const h = ((hue % 360) + 360) % 360
  const wedge = (center: number, span = 15): SchemeWedge => {
    const c = ((center % 360) + 360) % 360
    return { center: c, span, color: hslToHex(c, 0.9, 0.55) }
  }
  switch (scheme) {
    case 'complementary':
      return [wedge(h), wedge(h + 180)]
    case 'analogous':
      return [wedge(h - 30), wedge(h), wedge(h + 30)]
    case 'triadic':
      return [wedge(h), wedge(h + 120), wedge(h + 240)]
    case 'split-complementary':
      return [wedge(h), wedge(h + 150), wedge(h + 210)]
    case 'tetradic':
      return [wedge(h), wedge(h + 90), wedge(h + 180), wedge(h + 270)]
  }
}
