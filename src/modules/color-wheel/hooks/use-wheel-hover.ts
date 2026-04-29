'use client'

import type { MouseEvent, RefObject } from 'react'
import { useCallback, useRef, useState } from 'react'

import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'

/** Return shape of {@link useWheelHover}. */
export interface WheelHoverState {
  /** Ref to attach to the wheel's root container div for tooltip positioning. */
  containerRef: RefObject<HTMLDivElement | null>
  /** The paint currently under the cursor, or `null` when nothing is hovered. */
  hoveredPaint: ColorWheelPaint | null
  /** Tooltip position in pixels relative to the container's top-left corner. */
  tooltipPos: { x: number; y: number }
  /**
   * Pass to each `PaintMarker`'s `onHover` prop.
   * Sets `hoveredPaint` and computes a clamped tooltip position from the mouse event.
   */
  handleHover: (paint: ColorWheelPaint | null, event: MouseEvent<SVGElement>) => void
}

/**
 * Manages hover and tooltip state shared by all color wheel variants.
 *
 * Attach `containerRef` to the wheel's root div. Pass `handleHover` to each
 * `PaintMarker`. Render the tooltip using `hoveredPaint` and `tooltipPos`.
 *
 * @returns {@link WheelHoverState}
 */
export function useWheelHover(): WheelHoverState {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoveredPaint, setHoveredPaint] = useState<ColorWheelPaint | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  const handleHover = useCallback(
    (paint: ColorWheelPaint | null, event: MouseEvent<SVGElement>) => {
      setHoveredPaint(paint)
      if (paint && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const x = Math.min(event.clientX - rect.left + 12, rect.width - 180)
        const y = Math.min(event.clientY - rect.top + 12, rect.height - 80)
        setTooltipPos({ x: Math.max(0, x), y: Math.max(0, y) })
      }
    },
    []
  )

  return { containerRef, hoveredPaint, tooltipPos, handleHover }
}
