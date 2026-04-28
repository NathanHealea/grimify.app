import type { MouseEvent } from 'react'

import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'

const RADIUS = 5
const DIAMOND_HALF = RADIUS * 1.4

/**
 * An individual paint marker on the color wheel SVG.
 *
 * Standard paints render as a circle; metallic paints render as a diamond
 * polygon. Both use the paint's hex color as fill with a thin white stroke
 * for legibility against any sector background.
 *
 * @param paint - The paint data to represent.
 * @param cx - Pre-computed SVG x coordinate (center of the marker).
 * @param cy - Pre-computed SVG y coordinate (center of the marker).
 * @param onHover - Called with the paint on mouseenter and null on mouseleave.
 */
export function PaintMarker({
  paint,
  cx,
  cy,
  onHover,
}: {
  paint: ColorWheelPaint
  cx: number
  cy: number
  onHover: (paint: ColorWheelPaint | null, event: MouseEvent<SVGElement>) => void
}) {
  const shared = {
    fill: paint.hex,
    stroke: 'white',
    strokeWidth: 1,
    cursor: 'pointer' as const,
    onMouseEnter: (e: MouseEvent<SVGElement>) => onHover(paint, e),
    onMouseLeave: (e: MouseEvent<SVGElement>) => onHover(null, e),
  }

  if (paint.is_metallic) {
    const d = DIAMOND_HALF
    const points = `${cx},${cy - d} ${cx + d},${cy} ${cx},${cy + d} ${cx - d},${cy}`
    return <polygon points={points} {...shared} />
  }

  return <circle cx={cx} cy={cy} r={RADIUS} {...shared} />
}
