'use client'

import type { MouseEvent, PointerEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'

import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'
import type { ColorScheme } from '@/modules/color-wheel/types/color-scheme'
import type { PaintGroup } from '@/modules/color-wheel/types/paint-group'
import { useWheelHover } from '@/modules/color-wheel/hooks/use-wheel-hover'
import { useWheelPaintSelection } from '@/modules/color-wheel/hooks/use-wheel-paint-selection'
import { useWheelSchemeOverlays } from '@/modules/color-wheel/hooks/use-wheel-scheme-overlays'
import { useWheelSegments } from '@/modules/color-wheel/hooks/use-wheel-segments'
import { useWheelTransform } from '@/modules/color-wheel/hooks/use-wheel-transform'
import { groupPaintsByHex } from '@/modules/color-wheel/utils/group-paints-by-hex'
import { hslToHex } from '@/modules/color-wheel/utils/hsl-to-hex'
import { annularSectorPath } from '@/modules/color-wheel/utils/sector-path'
import { RING_INNER, RING_OUTER, VIEW_BOX, WHEEL_RADIUS } from '@/modules/color-wheel/utils/wheel-constants'
import { PaintDetailPanel } from './paint-detail-panel'
import { PaintDot } from './paint-dot'

/**
 * Interactive SVG HSL color wheel divided into 12 Itten color wheel sectors.
 *
 * Paints sharing the same hex color are collapsed into a single {@link PaintDot},
 * which layers owned/search/selection halos and an optional segmented brand ring.
 * A smooth 360-arc hue ring borders the content area. Sector divider lines and
 * color-tinted labels identify each segment. Optionally renders color scheme
 * wedge overlays when {@link selectedHue} and {@link colorScheme} are provided.
 *
 * Supports zoom/pan via scroll wheel and pointer drag, click-to-detail via
 * {@link PaintDetailPanel}, and hover tooltips — all driven by shared hooks.
 *
 * @param paints - All paints to plot on the wheel.
 * @param userPaintIds - Set of paint IDs in the current user's collection; `undefined` when unauthenticated.
 * @param searchMatchIds - Set of paint IDs matching the active search query; empty when no search is active.
 * @param showBrandRing - Whether to render the segmented brand-color ring around each dot.
 * @param showOwnedRing - Whether to render the green owned halo around dots the user owns.
 * @param selectedHue - Wheel-position hue (0–360) of the currently selected paint; enables scheme overlays.
 * @param colorScheme - Active color harmony scheme; requires {@link selectedHue}.
 * @param isSchemeMatching - Function that returns true when a paint falls within the active scheme.
 */
export function HslColorWheel({
  paints,
  userPaintIds,
  searchMatchIds = new Set(),
  showBrandRing = false,
  showOwnedRing = false,
  selectedHue,
  colorScheme,
  isSchemeMatching,
}: {
  paints: ColorWheelPaint[]
  userPaintIds?: Set<string>
  searchMatchIds?: Set<string>
  showBrandRing?: boolean
  showOwnedRing?: boolean
  selectedHue?: number
  colorScheme?: ColorScheme
  isSchemeMatching?: (paint: ColorWheelPaint) => boolean
}) {
  const { containerRef, hoveredPaint, tooltipPos, handleHover } = useWheelHover()
  const { viewBox, isDragging, dragDistanceRef, onWheel, onPointerDown, onPointerMove, onPointerUp, onPointerLeave, onTouchStart, onTouchMove, onTouchEnd } = useWheelTransform(VIEW_BOX)
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

  // Collapse paints at the same hex into a single rendered group
  const paintGroups = useMemo(
    () => groupPaintsByHex(paints, WHEEL_RADIUS),
    [paints]
  )

  const isSchemeActive = !!colorScheme && !!selectedHue

  const [hoveredGroupKey, setHoveredGroupKey] = useState<string | null>(null)

  // Adapter: PaintDot passes a PaintGroup; useWheelHover expects a ColorWheelPaint + MouseEvent
  function handleGroupHover(group: PaintGroup | null, event: PointerEvent<SVGCircleElement>) {
    setHoveredGroupKey(group?.key ?? null)
    handleHover(group?.rep ?? null, event as unknown as MouseEvent<SVGElement>)
  }

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
        <defs>
          {/* Gaussian blur glow used by search-match rings — only rendered when a search is active */}
          {searchMatchIds.size > 0 && (
            <filter id="search-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          )}
        </defs>

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

        {/* Paint dots — one per unique hex, with rings and badge.
            Hovered group is rendered last so it paints on top of all others. */}
        <g id="paint-dots">
          {[...paintGroups.filter((g) => g.key !== hoveredGroupKey),
            ...paintGroups.filter((g) => g.key === hoveredGroupKey),
          ].map((group) => {
            const isOwned = userPaintIds
              ? group.paints.some((p) => userPaintIds.has(p.id))
              : false

            const matchesSearch = searchMatchIds.size === 0
              || group.paints.some((p) => searchMatchIds.has(p.id))

            const groupMatchesScheme = !isSchemeActive || !isSchemeMatching
              || group.paints.some((p) => isSchemeMatching(p))

            const dimmed =
              (searchMatchIds.size > 0 && !matchesSearch) ||
              (isSchemeActive && !groupMatchesScheme)

            const schemeDimmed = isSchemeActive && !groupMatchesScheme

            const isSelected = selectedPaint
              ? group.paints.some((p) => p.id === selectedPaint.id)
              : false

            return (
              <PaintDot
                key={group.key}
                group={group}
                isSelected={isSelected}
                showBrandRing={showBrandRing}
                showOwnedRing={showOwnedRing}
                dimmed={dimmed}
                schemeDimmed={schemeDimmed}
                searchHighlight={searchMatchIds.size > 0 && matchesSearch && !isSchemeActive}
                isOwned={isOwned}
                onHover={handleGroupHover}
                onClick={(g) => {
                  if (dragDistanceRef.current > 3) return
                  handlePaintClick(g.rep)
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
        <PaintDetailPanel
          key={selectedPaint.id}
          paint={selectedPaint}
          isOwned={userPaintIds ? userPaintIds.has(selectedPaint.id) : undefined}
          onClose={clearSelection}
        />
      )}
    </div>
  )
}
