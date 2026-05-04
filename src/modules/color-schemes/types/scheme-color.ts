import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'

/**
 * A single computed color in a generated scheme, with its nearest matching paints.
 *
 * @remarks
 * `nearestPaints` is populated by the caller using {@link findNearestPaints} after scheme generation.
 * `saturation` and `lightness` are percentages (0–100) inherited from the base color.
 */
export type SchemeColor = {
  hue: number
  saturation: number
  lightness: number
  hex: string
  /** Human-readable position label, e.g. 'Base', 'Complement', 'Triad 1', 'Analogous −30°'. */
  label: string
  nearestPaints: ColorWheelPaint[]
}
