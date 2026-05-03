'use client'

import type { ReactElement } from 'react'
import { useMemo } from 'react'

import { COLOR_SEGMENTS, SEGMENT_BOUNDARIES } from '@/modules/color-wheel/utils/color-segments'
import { hslToHex } from '@/modules/color-wheel/utils/hsl-to-hex'
import { annularSectorPath } from '@/modules/color-wheel/utils/sector-path'
import {
  DEG_TO_RAD,
  LABEL_CHAR_WIDTH,
  LABEL_GAP,
  LABEL_HALF_HEIGHT,
  LIGHT_RADIUS,
  MEDIUM_RADIUS,
  RING_OUTER,
  WHEEL_RADIUS,
} from '@/modules/color-wheel/utils/wheel-constants'

/** Return shape of {@link useWheelSegments}. */
export interface WheelSegmentRendering {
  /** Filled annular-sector paths forming the three-band (light/medium/dark) Itten segments. */
  segmentWedges: ReactElement[]
  /** Radial lines separating the 12 Itten segments. */
  dividerLines: ReactElement[]
  /** Colour-tinted text labels positioned outside the hue ring. */
  segmentLabels: ReactElement[]
}

/**
 * Produces the static SVG elements for the 12-segment Itten color wheel background.
 *
 * All three outputs are memoized with empty deps — they never change at runtime.
 * Split into separate memos so React can reconcile each group independently.
 *
 * @returns {@link WheelSegmentRendering}
 */
export function useWheelSegments(): WheelSegmentRendering {
  // Three concentric bands per sector: light (center) → medium → dark (outer)
  const segmentWedges = useMemo(() => {
    const bands = [
      { innerR: 0,             outerR: LIGHT_RADIUS,  lightness: 0.75 },
      { innerR: LIGHT_RADIUS,  outerR: MEDIUM_RADIUS, lightness: 0.5  },
      { innerR: MEDIUM_RADIUS, outerR: WHEEL_RADIUS,  lightness: 0.25 },
    ]
    return COLOR_SEGMENTS.flatMap((seg) => {
      // Red wraps 345°→15°; normalise so end > start for the arc math.
      const start = seg.hueStart
      const end = seg.hueEnd < seg.hueStart ? seg.hueEnd + 360 : seg.hueEnd
      return bands.map((band, i) => (
        <path
          key={`band-${i}-${seg.midAngle}`}
          d={annularSectorPath(start, end, band.innerR, band.outerR)}
          fill={hslToHex(seg.midAngle, 1, band.lightness)}
          fillOpacity={0.1}
          stroke="none"
        />
      ))
    })
  }, [])

  // Sector boundary lines from center to outer ring edge
  const dividerLines = useMemo(
    () =>
      SEGMENT_BOUNDARIES.map((boundary) => {
        const angle = (boundary - 90) * DEG_TO_RAD
        return (
          <line
            key={`div-${boundary}`}
            x1={0}
            y1={0}
            x2={RING_OUTER * Math.cos(angle)}
            y2={RING_OUTER * Math.sin(angle)}
            stroke="rgba(255,255,255,0.3)"
            strokeWidth={1}
          />
        )
      }),
    []
  )

  // Labels outside the hue ring, tinted to the sector's hue.
  // Radius is computed so the label's nearest radial edge is always LABEL_GAP
  // units from RING_OUTER, regardless of label length or angular position.
  const segmentLabels = useMemo(
    () =>
      COLOR_SEGMENTS.map((seg) => {
        const angle = (seg.midAngle - 90) * DEG_TO_RAD
        const textHalfW = (seg.name.length * LABEL_CHAR_WIDTH) / 2
        const radialInward =
          Math.abs(Math.cos(angle)) * textHalfW + Math.abs(Math.sin(angle)) * LABEL_HALF_HEIGHT
        const r = RING_OUTER + LABEL_GAP + radialInward
        return (
          <text
            key={`label-${seg.midAngle}`}
            x={r * Math.cos(angle)}
            y={r * Math.sin(angle)}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={14}
            fontWeight={600}
            fill={hslToHex(seg.midAngle, 1, 0.5)}
            fillOpacity={0.7}
          >
            {seg.name}
          </text>
        )
      }),
    []
  )

  return { segmentWedges, dividerLines, segmentLabels }
}
