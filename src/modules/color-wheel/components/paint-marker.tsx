import type { MouseEvent } from 'react'

import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'

const RADIUS = 5

/**
 * An individual paint marker on the color wheel SVG.
 *
 * Standard paints render as a circle; metallic paints render as a diamond
 * polygon. Both use the paint's hex color as fill with a black stroke for
 * legibility against any sector background.
 *
 * When `isSelected` is true a white dashed ring is rendered behind the marker
 * to indicate the currently selected paint.
 *
 * When `zoom` is provided, marker geometry (radius, diamond size, stroke width)
 * scales by `1 / zoom` so the marker maintains a constant apparent screen size
 * as the viewBox shrinks during zoom.
 *
 * @param paint - The paint data to represent.
 * @param cx - Pre-computed SVG x coordinate (center of the marker).
 * @param cy - Pre-computed SVG y coordinate (center of the marker).
 * @param onHover - Called with the paint on mouseenter and null on mouseleave.
 * @param onClick - Optional callback fired when the marker is clicked; receives the paint.
 * @param zoom - Current wheel zoom level (1–10); defaults to 1 (no scaling).
 * @param isSelected - When true, renders a dashed selection ring around the marker.
 */
export function PaintMarker({
  paint,
  cx,
  cy,
  onHover,
  onClick,
  isSelected = false,
}: {
  paint: ColorWheelPaint
  cx: number
  cy: number
  onHover: (paint: ColorWheelPaint | null, event: MouseEvent<SVGElement>) => void
  onClick?: (paint: ColorWheelPaint) => void
  zoom?: number
  isSelected?: boolean
}) {
  // const r = RADIUS / zoom
  const r = RADIUS
  const shared = {
    fill: paint.hex,
    stroke: 'black',
    // strokeWidth: 2 / zoom,
    strokeWidth: 2,
    cursor: 'pointer' as const,
    onMouseEnter: (e: MouseEvent<SVGElement>) => onHover(paint, e),
    onMouseLeave: (e: MouseEvent<SVGElement>) => onHover(null, e),
    onClick: onClick ? () => onClick(paint) : undefined,
  }

  const selectionRing = isSelected ? (
    <circle
      cx={cx}
      cy={cy}
      r={r + 4}
      fill="none"
      stroke="white"
      strokeWidth={2}
      strokeDasharray="4 2"
      pointerEvents="none"
    />
  ) : null

  if (paint.is_metallic) {
    const d = r * 1.4
    const points = `${cx},${cy - d} ${cx + d},${cy} ${cx},${cy + d} ${cx - d},${cy}`
    return (
      <g>
        {selectionRing}
        <polygon points={points} {...shared} />
      </g>
    )
  }

  return (
    <g>
      {selectionRing}
      <circle cx={cx} cy={cy} r={r} {...shared} />
    </g>
  )
}
