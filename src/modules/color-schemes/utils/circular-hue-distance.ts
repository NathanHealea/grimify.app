/**
 * Returns the shortest angular distance between two hues on the color wheel.
 *
 * @param a - First hue in degrees (0–360).
 * @param b - Second hue in degrees (0–360).
 * @returns The minimum circular distance in degrees (0–180).
 *
 * @remarks
 * Uses circular distance so the gap between 350° and 10° is 20°, not 340°.
 */
export function circularHueDistance(a: number, b: number): number {
  const delta = Math.abs(a - b)
  return Math.min(delta, 360 - delta)
}
