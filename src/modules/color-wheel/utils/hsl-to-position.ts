/**
 * Converts HSL color values to an SVG coordinate position on the color wheel.
 *
 * The wheel uses a `viewBox="-500 -500 1000 1000"` coordinate space with the
 * center at (0, 0). Hue 0° (red) is placed at the top of the wheel.
 *
 * @param hue - HSL hue in degrees (0–360).
 * @param lightness - HSL lightness as a percentage (0–100).
 * @param maxRadius - Outer radius of the wheel in SVG units.
 * @returns SVG `{ x, y }` coordinates for the paint marker.
 */
export function hslToPosition(
  hue: number,
  lightness: number,
  maxRadius: number,
): { x: number; y: number } {
  const angleRad = ((hue - 90) * Math.PI) / 180
  const r = (1 - lightness / 100) * maxRadius * 0.9
  return {
    x: r * Math.cos(angleRad),
    y: r * Math.sin(angleRad),
  }
}
