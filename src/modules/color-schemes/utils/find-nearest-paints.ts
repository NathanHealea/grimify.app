import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'

/**
 * Returns the paints closest in hue to `targetHue`, sorted ascending by circular hue distance.
 *
 * @param targetHue - Target hue in degrees (0–360).
 * @param paints - Full paint list to search.
 * @param limit - Maximum number of results to return (default 5).
 * @returns Up to `limit` paints nearest to `targetHue` by hue proximity.
 *
 * @remarks
 * Uses circular distance so the gap between 350° and 10° is 20°, not 340°.
 * Full RGB color-distance matching is not needed for v1.
 */
export function findNearestPaints(
  targetHue: number,
  paints: ColorWheelPaint[],
  limit = 5,
): ColorWheelPaint[] {
  const hueDist = (a: number, b: number) =>
    Math.min(Math.abs(a - b), 360 - Math.abs(a - b))

  return [...paints]
    .sort((a, b) => hueDist(a.hue, targetHue) - hueDist(b.hue, targetHue))
    .slice(0, limit)
}
