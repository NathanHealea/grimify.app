import type { ColorScheme } from '@/modules/color-wheel/types/color-scheme'
import { hslToHex } from '@/modules/color-wheel/utils/hsl-to-hex'
import type { BaseColor } from '@/modules/color-schemes/types/base-color'
import type { SchemeColor } from '@/modules/color-schemes/types/scheme-color'

/**
 * Generates a color scheme from a base color using standard harmony angle offsets.
 *
 * @param base - The reference color to build the scheme from.
 * @param scheme - The color harmony type to generate.
 * @param analogousAngle - Spread angle in degrees for analogous schemes (15–60, default 30).
 * @returns An ordered array of {@link SchemeColor} values. `nearestPaints` is empty on each
 *   entry — callers should fill it using {@link findNearestPaints}.
 *
 * @remarks
 * Hue offsets mirror those in `get-scheme-wedges.ts` so wheel overlays and explorer swatches
 * stay synchronized.
 */
export function generateScheme(
  base: BaseColor,
  scheme: ColorScheme,
  analogousAngle = 30,
): SchemeColor[] {
  const norm = (h: number) => ((h % 360) + 360) % 360
  const { saturation, lightness } = base

  const make = (hue: number, label: string): SchemeColor => {
    const h = norm(hue)
    return {
      hue: h,
      saturation,
      lightness,
      hex: hslToHex(h, saturation / 100, lightness / 100),
      label,
      nearestPaints: [],
    }
  }

  const angle = Math.min(60, Math.max(15, analogousAngle))

  switch (scheme) {
    case 'complementary':
      return [
        make(base.hue, 'Base'),
        make(base.hue + 180, 'Complement'),
      ]
    case 'split-complementary':
      return [
        make(base.hue, 'Base'),
        make(base.hue + 150, 'Split 1'),
        make(base.hue + 210, 'Split 2'),
      ]
    case 'analogous':
      return [
        make(base.hue - angle, `Analogous −${angle}°`),
        make(base.hue, 'Base'),
        make(base.hue + angle, `Analogous +${angle}°`),
      ]
    case 'triadic':
      return [
        make(base.hue, 'Base'),
        make(base.hue + 120, 'Triad 1'),
        make(base.hue + 240, 'Triad 2'),
      ]
    case 'tetradic':
      return [
        make(base.hue, 'Base'),
        make(base.hue + 90, 'Tetrad 1'),
        make(base.hue + 180, 'Complement'),
        make(base.hue + 270, 'Tetrad 3'),
      ]
  }
}
