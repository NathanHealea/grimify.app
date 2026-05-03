'use client'

import type { ReactElement } from 'react'
import { useMemo } from 'react'

import type { ColorScheme } from '@/modules/color-wheel/types/color-scheme'
import { getSchemeWedges } from '@/modules/color-wheel/utils/get-scheme-wedges'
import { sectorPath } from '@/modules/color-wheel/utils/sector-path'
import { WHEEL_RADIUS } from '@/modules/color-wheel/utils/wheel-constants'

/**
 * Produces filled sector overlays representing color harmony relationships.
 *
 * Returns `null` when either argument is absent (no paint selected or no scheme
 * active), so the caller can gate the `<g>` element on the return value directly.
 *
 * Wedges that straddle the 0°/360° boundary are split into two paths so the arc
 * math in {@link sectorPath} always receives `end > start`.
 *
 * @param selectedHue - Wheel-position hue (0–360) of the currently selected paint.
 * @param colorScheme - Active color harmony scheme.
 * @returns Array of `<path>` elements or `null`.
 */
export function useWheelSchemeOverlays(
  selectedHue: number | undefined,
  colorScheme: ColorScheme | undefined
): ReactElement[] | null {
  return useMemo(() => {
    if (selectedHue === undefined || !colorScheme) return null
    const wedges = getSchemeWedges(selectedHue, colorScheme)
    return wedges.flatMap((wedge, i) => {
      const start = (((wedge.center - wedge.span) % 360) + 360) % 360
      const end = (((wedge.center + wedge.span) % 360) + 360) % 360
      // Wrap-around: split into two paths at the 0°/360° boundary
      if (start > end) {
        return [
          <path
            key={`sw-${i}a`}
            d={sectorPath(start, 360, WHEEL_RADIUS)}
            fill={wedge.color}
            fillOpacity={0.15}
            stroke="none"
          />,
          <path
            key={`sw-${i}b`}
            d={sectorPath(0, end, WHEEL_RADIUS)}
            fill={wedge.color}
            fillOpacity={0.15}
            stroke="none"
          />,
        ]
      }
      return [
        <path
          key={`sw-${i}`}
          d={sectorPath(start, end, WHEEL_RADIUS)}
          fill={wedge.color}
          fillOpacity={0.15}
          stroke="none"
        />,
      ]
    })
  }, [selectedHue, colorScheme])
}
