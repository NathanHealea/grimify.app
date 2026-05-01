import type { MouseEvent } from 'react'

import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'

const RADIUS = 5

/**
 * An individual paint marker on the color wheel SVG.
 *
 * Standard paints render as a circle; metallic paints render as a diamond
 * polygon. Both use the paint's hex color as fill with a thin white stroke
 * for legibility against any sector background.
 *
 * When `zoom` is provided, marker geometry (radius, diamond size, stroke width)
 * scales by `1 / zoom` so the marker maintains a constant apparent screen size
 * as the viewBox shrinks during zoom.
 *
 * When `emphasized` is true, a gold outer ring is rendered behind the marker
 * to visually distinguish paints that belong to the user's collection.
 *
 * @param paint - The paint data to represent.
 * @param cx - Pre-computed SVG x coordinate (center of the marker).
 * @param cy - Pre-computed SVG y coordinate (center of the marker).
 * @param onHover - Called with the paint on mouseenter and null on mouseleave.
 * @param onClick - Optional callback fired when the marker is clicked; receives the paint.
 * @param zoom - Current wheel zoom level (1–10); defaults to 1 (no scaling).
 * @param emphasized - When true, renders a gold collection ring behind the marker; defaults to false.
 */
export function PaintMarker({
  paint,
  cx,
  cy,
  onHover,
  onClick,
  zoom = 1,
  emphasized = false,
}: {
  paint: ColorWheelPaint
  cx: number
  cy: number
  onHover: (paint: ColorWheelPaint | null, event: MouseEvent<SVGElement>) => void
  onClick?: (paint: ColorWheelPaint) => void
  zoom?: number
  emphasized?: boolean
}) {
  const r = RADIUS / zoom
  const shared = {
    fill: paint.hex,
    stroke: 'white',
    strokeWidth: 1 / zoom,
    cursor: 'pointer' as const,
    onMouseEnter: (e: MouseEvent<SVGElement>) => onHover(paint, e),
    onMouseLeave: (e: MouseEvent<SVGElement>) => onHover(null, e),
    onClick: onClick ? () => onClick(paint) : undefined,
  }

  if (paint.is_metallic) {
    const d = r * 1.4
    const points = `${cx},${cy - d} ${cx + d},${cy} ${cx},${cy + d} ${cx - d},${cy}`
    if (emphasized) {
      const dRing = (r + 3 / zoom) * 1.4
      const ringPoints = `${cx},${cy - dRing} ${cx + dRing},${cy} ${cx},${cy + dRing} ${cx - dRing},${cy}`
      return (
        <g>
          <polygon points={ringPoints} fill="none" stroke="#f59e0b" strokeWidth={2 / zoom} />
          <polygon points={points} {...shared} />
        </g>
      )
    }
    return <polygon points={points} {...shared} />
  }

  if (emphasized) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={r + 3 / zoom} fill="none" stroke="#f59e0b" strokeWidth={2 / zoom} />
        <circle cx={cx} cy={cy} r={r} {...shared} />
      </g>
    )
  }

  return <circle cx={cx} cy={cy} r={r} {...shared} />
}
