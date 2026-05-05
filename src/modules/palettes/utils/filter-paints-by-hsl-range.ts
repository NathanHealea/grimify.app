import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'

/**
 * Saturation and lightness range filter bounds (both 0–100).
 *
 * Each pair `[min, max]` is inclusive on both ends.
 */
export type HslRange = {
  sMin: number
  sMax: number
  lMin: number
  lMax: number
}

/**
 * Filters paints to those whose saturation and lightness both fall within the
 * given ranges.
 *
 * Reads `paint.saturation` and `paint.lightness` directly from the
 * {@link ColorWheelPaint} shape (values are already in 0–100).
 *
 * @param paints - The candidate paint list.
 * @param range - Saturation and lightness bounds (0–100, inclusive).
 * @returns Filtered array of paints.
 */
export function filterPaintsByHslRange(
  paints: ColorWheelPaint[],
  range: HslRange,
): ColorWheelPaint[] {
  const { sMin, sMax, lMin, lMax } = range
  return paints.filter(
    (p) =>
      p.saturation >= sMin &&
      p.saturation <= sMax &&
      p.lightness >= lMin &&
      p.lightness <= lMax,
  )
}
