import { useMemo } from 'react'

import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'
import { getBrandColor } from '@/modules/color-wheel/utils/get-brand-color'
import { annularSectorPath } from '@/modules/color-wheel/utils/sector-path'

/**
 * Segmented arc band of unique brand colors rendered around a paint dot.
 *
 * Each unique brand in the group receives an equal arc segment of the ring.
 * Single-brand groups render as a continuous ring split into two 180° halves
 * to avoid the degenerate closed-circle arc path (where start and end points
 * coincide and the SVG arc command renders nothing).
 *
 * Positioned via a wrapping `<g transform="translate(cx, cy)">` so all paths
 * are drawn relative to the origin — consistent with {@link annularSectorPath}.
 *
 * @param paints - All paints in the group; unique brands are derived from these.
 * @param cx - SVG x center of the parent paint dot.
 * @param cy - SVG y center of the parent paint dot.
 * @param r - Radius of the parent paint dot. Ring starts at `r + 1`.
 */
export function BrandRingArcs({
  paints,
  cx,
  cy,
  r,
}: {
  paints: ColorWheelPaint[]
  cx: number
  cy: number
  r: number
}) {
  const uniqueBrands = useMemo(() => {
    const seen = new Map<string, string>()
    for (const paint of paints) {
      if (!seen.has(paint.brand_id)) {
        seen.set(paint.brand_id, getBrandColor(paint.brand_id))
      }
    }
    return Array.from(seen.entries()).map(([id, color]) => ({ id, color }))
  }, [paints])

  const innerR = r + 1
  const outerR = r + 2.5
  const segmentAngle = 360 / uniqueBrands.length

  return (
    <g transform={`translate(${cx}, ${cy})`} pointerEvents="none">
      {uniqueBrands.map((brand, i) => {
        const startDeg = i * segmentAngle
        const endDeg = startDeg + segmentAngle

        // A 360° arc degenerates (start === end point); split into two halves
        if (segmentAngle === 360) {
          return (
            <g key={brand.id}>
              <path
                d={annularSectorPath(startDeg, startDeg + 180, innerR, outerR)}
                fill={brand.color}
                stroke="rgba(0,0,0,0.3)"
                strokeWidth={0.5}
              />
              <path
                d={annularSectorPath(startDeg + 180, endDeg - 0.01, innerR, outerR)}
                fill={brand.color}
                stroke="rgba(0,0,0,0.3)"
                strokeWidth={0.5}
              />
            </g>
          )
        }

        return (
          <path
            key={brand.id}
            d={annularSectorPath(startDeg, endDeg, innerR, outerR)}
            fill={brand.color}
            stroke="rgba(0,0,0,0.3)"
            strokeWidth={0.5}
          />
        )
      })}
    </g>
  )
}
