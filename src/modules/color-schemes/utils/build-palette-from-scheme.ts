import type { BaseColor } from '@/modules/color-schemes/types/base-color'
import type { SchemeColor } from '@/modules/color-schemes/types/scheme-color'
import type { ColorScheme } from '@/modules/color-wheel/types/color-scheme'

/**
 * Derives a palette name and paint list from a generated color scheme.
 *
 * The name is formatted as `"{Title-cased schemeType} from {baseLabel}"` where
 * `baseLabel` is `base.name` when the base color was chosen from a paint, or
 * `base.hex` when entered as a custom hex value.
 *
 * `paintIds` collects the first nearest paint (`nearestPaints[0].id`) from each
 * scheme color in order, skipping any entry where `nearestPaints` is empty.
 *
 * This is a pure function — no React imports, safe to unit test in isolation.
 *
 * @param scheme - The generated scheme colors with nearest paint matches.
 * @param base - The base color used to generate the scheme.
 * @param schemeType - The color harmony type (e.g. `'triadic'`).
 * @returns An object with the suggested palette `name` and ordered `paintIds`.
 */
export function buildPaletteFromScheme(
  scheme: SchemeColor[],
  base: BaseColor,
  schemeType: ColorScheme,
): { name: string; paintIds: string[] } {
  const schemeLabel =
    schemeType.charAt(0).toUpperCase() + schemeType.slice(1).replace(/-/g, ' ')
  const baseLabel = base.name ?? base.hex
  const name = `${schemeLabel} from ${baseLabel}`

  const paintIds = scheme
    .filter((color) => color.nearestPaints.length > 0)
    .map((color) => color.nearestPaints[0].id)

  return { name, paintIds }
}
