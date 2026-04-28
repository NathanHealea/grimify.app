const DEG_TO_RAD = Math.PI / 180

/**
 * Generates an SVG path `d` string for a pie-slice sector.
 *
 * The path is centered at the SVG origin (0, 0) and uses clockwise winding.
 * Hue 0° corresponds to the top of the wheel (12 o'clock position).
 *
 * @param startAngleDeg - Start angle in degrees (0 = top, clockwise).
 * @param endAngleDeg - End angle in degrees.
 * @param outerRadius - Outer radius of the sector in SVG units.
 * @returns SVG path `d` attribute string.
 */
export function sectorPath(
  startAngleDeg: number,
  endAngleDeg: number,
  outerRadius: number,
): string {
  const start = (startAngleDeg - 90) * DEG_TO_RAD
  const end = (endAngleDeg - 90) * DEG_TO_RAD
  const x1 = outerRadius * Math.cos(start)
  const y1 = outerRadius * Math.sin(start)
  const x2 = outerRadius * Math.cos(end)
  const y2 = outerRadius * Math.sin(end)
  const largeArc = endAngleDeg - startAngleDeg > 180 ? 1 : 0
  return `M 0 0 L ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} Z`
}

/**
 * Generates an SVG path `d` string for an annular (donut-slice) sector.
 *
 * Draws a ring-band shape between `innerRadius` and `outerRadius`, spanning
 * the given angle range. When `innerRadius` is 0 or less the result is a solid
 * pie-slice identical to {@link sectorPath}.
 *
 * @param startAngleDeg - Start angle in degrees (0 = top, clockwise).
 * @param endAngleDeg - End angle in degrees.
 * @param innerRadius - Inner radius of the band in SVG units.
 * @param outerRadius - Outer radius of the band in SVG units.
 * @returns SVG path `d` attribute string.
 */
export function annularSectorPath(
  startAngleDeg: number,
  endAngleDeg: number,
  innerRadius: number,
  outerRadius: number,
): string {
  const start = (startAngleDeg - 90) * DEG_TO_RAD
  const end = (endAngleDeg - 90) * DEG_TO_RAD
  const largeArc = endAngleDeg - startAngleDeg > 180 ? 1 : 0

  const ox1 = outerRadius * Math.cos(start)
  const oy1 = outerRadius * Math.sin(start)
  const ox2 = outerRadius * Math.cos(end)
  const oy2 = outerRadius * Math.sin(end)

  if (innerRadius <= 0) {
    return `M 0 0 L ${ox1} ${oy1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${ox2} ${oy2} Z`
  }

  const ix1 = innerRadius * Math.cos(start)
  const iy1 = innerRadius * Math.sin(start)
  const ix2 = innerRadius * Math.cos(end)
  const iy2 = innerRadius * Math.sin(end)

  return `M ${ox1} ${oy1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${ox2} ${oy2} L ${ix2} ${iy2} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1} Z`
}

/**
 * Converts a hue's 0-based sort index to its sector start angle in degrees.
 *
 * Uses array index (not raw sort_order) to guarantee evenly spaced sectors
 * regardless of gaps in sort_order values.
 *
 * @param index - 0-based position of the hue in the sorted array.
 * @param totalHues - Total number of top-level hues.
 * @returns Start angle in degrees (0 = top, clockwise).
 */
export function indexToStartAngle(index: number, totalHues: number): number {
  return (index / totalHues) * 360
}
