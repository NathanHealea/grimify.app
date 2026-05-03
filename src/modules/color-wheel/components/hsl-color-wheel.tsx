'use client'

import { useEffect, useMemo } from 'react'

import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'
import type { ColorScheme } from '@/modules/color-wheel/types/color-scheme'
import { useWheelHover } from '@/modules/color-wheel/hooks/use-wheel-hover'
import { useWheelPaintSelection } from '@/modules/color-wheel/hooks/use-wheel-paint-selection'
import { useWheelSchemeOverlays } from '@/modules/color-wheel/hooks/use-wheel-scheme-overlays'
import { useWheelSegments } from '@/modules/color-wheel/hooks/use-wheel-segments'
import { useWheelTransform } from '@/modules/color-wheel/hooks/use-wheel-transform'
import { hslToHex } from '@/modules/color-wheel/utils/hsl-to-hex'
import { paintToWheelPosition } from '@/modules/color-wheel/utils/paint-to-wheel-position'
import { annularSectorPath } from '@/modules/color-wheel/utils/sector-path'
import { RING_INNER, RING_OUTER, VIEW_BOX, WHEEL_RADIUS } from '@/modules/color-wheel/utils/wheel-constants'
import { PaintDetailPanel } from './paint-detail-panel'
import { PaintMarker } from './paint-marker'

/**
 * Interactive SVG HSL color wheel divided into 12 Itten color wheel sectors.
 *
 * Each sector contains three concentric bands — light (inner), medium, and dark
 * (outer) — corresponding to HSL lightness zones. A smooth 360-arc hue ring
 * borders the content area. Sector divider lines and color-tinted labels identify
 * each segment. Optionally renders color scheme wedge overlays when
 * {@link selectedHue} and {@link colorScheme} are provided.
 *
 * Supports zoom/pan via scroll wheel and pointer drag, click-to-detail via
 * {@link PaintDetailPanel}, and hover tooltips — all driven by shared hooks.
 *
 * @param paints - All paints to plot on the wheel.
 * @param selectedHue - Wheel-position hue (0–360) of the currently selected paint; enables scheme overlays.
 * @param colorScheme - Active color harmony scheme; requires {@link selectedHue}.
 */
export function HslColorWheel({
  paints,
  selectedHue,
  colorScheme,
}: {
  paints: ColorWheelPaint[]
  selectedHue?: number
  colorScheme?: ColorScheme
}) {
  const { containerRef, hoveredPaint, tooltipPos, handleHover } = useWheelHover()
  const { viewBox, zoom, isDragging, dragDistanceRef, onWheel, onPointerDown, onPointerMove, onPointerUp, onPointerLeave, onTouchStart, onTouchMove, onTouchEnd } = useWheelTransform(VIEW_BOX)
  const { selectedPaint, handlePaintClick, clearSelection } = useWheelPaintSelection()
  const { segmentWedges, dividerLines, segmentLabels } = useWheelSegments()
  const schemeWedgeOverlays = useWheelSchemeOverlays(selectedHue, colorScheme)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const prevent = (e: Event) => e.preventDefault()
    el.addEventListener('wheel', prevent, { passive: false })
    return () => el.removeEventListener('wheel', prevent)
  }, [containerRef])

  // Hue ring — one arc per degree for a smooth continuous gradient
  const hueRingArcs = useMemo(() => {
    const arcs = []
    for (let d = 0; d < 360; d++) {
      arcs.push(
        <path
          key={`hue-${d}`}
          d={annularSectorPath(d, d + 1.5, RING_INNER, RING_OUTER)}
          fill={hslToHex(d, 1, 0.5)}
          stroke="none"
        />
      )
    }
    return arcs
  }, [])

  return (
    <div
      ref={containerRef}
      className={`relative min-h-0 flex-1 w-full select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ touchAction: 'none' }}
    >
      <svg
        viewBox={viewBox}
        width="100%"
        height="100%"
        className="block"
        aria-label="HSL color wheel showing paint collection"
      >
        {/* Segment background wedges — three concentric bands per Itten sector */}
        <g id="segment-wedges">{segmentWedges}</g>

        {/* Smooth per-degree hue ring */}
        <g id="hue-ring-arcs">{hueRingArcs}</g>

        {/* Sector boundary lines */}
        <g id="divider-lines">{dividerLines}</g>

        {/* Sector labels */}
        <g id="segment-labels">{segmentLabels}</g>

        {/* Color scheme wedge overlays */}
        {schemeWedgeOverlays && <g id="scheme-wedge-overlays" pointerEvents="none">{schemeWedgeOverlays}</g>}

        {/* Paint markers positioned by raw HSL values */}
        <g id="paint-markers">
          {paints.map((paint) => {
            const { x, y } = paintToWheelPosition(paint.hue / 360, paint.lightness / 100, WHEEL_RADIUS)
            return (
              <PaintMarker
                key={paint.id}
                paint={paint}
                cx={x}
                cy={y}
                zoom={zoom}
                onHover={handleHover}
                isSelected={selectedPaint?.id === paint.id}
                onClick={() => {
                  if (dragDistanceRef.current > 3) return
                  handlePaintClick(paint)
                }}
              />
            )
          })}
        </g>
      </svg>

      {hoveredPaint && !selectedPaint && (
        <div
          className="card pointer-events-none absolute z-10 max-w-[176px] border border-border bg-background px-3 py-2 text-sm shadow-md"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          <p className="font-medium leading-tight">{hoveredPaint.name}</p>
          <p className="text-muted-foreground">{hoveredPaint.brand_name}</p>
          <p className="text-muted-foreground">{hoveredPaint.product_line_name}</p>
        </div>
      )}

      {selectedPaint && (
        <PaintDetailPanel paint={selectedPaint} onClose={clearSelection} />
      )}
    </div>
  )
}
