'use client'

import { useEffect } from 'react'

import type { ColorWheelHue } from '@/modules/color-wheel/types/color-wheel-hue'
import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'
import { hslToPosition } from '@/modules/color-wheel/utils/hsl-to-position'
import type { HueCell } from '@/modules/color-wheel/utils/hue-cell-position'
import { hueCellPosition } from '@/modules/color-wheel/utils/hue-cell-position'
import { annularSectorPath, indexToStartAngle, sectorPath } from '@/modules/color-wheel/utils/sector-path'
import { useWheelHover } from '@/modules/color-wheel/hooks/use-wheel-hover'
import { useWheelPaintSelection } from '@/modules/color-wheel/hooks/use-wheel-paint-selection'
import { useWheelTransform } from '@/modules/color-wheel/hooks/use-wheel-transform'
import { PaintDetailPanel } from './paint-detail-panel'
import { PaintMarker } from './paint-marker'

const OUTER_RADIUS = 450
const VIEW_BOX: [number, number, number, number] = [-500, -500, 1000, 1000]

/** Fixed ISCC-NBS modifier ordering: index 0 = outermost (darkest), last = innermost (lightest). */
const ISCC_NBS_ORDER = [
  'Blackish',
  'Very Dark',
  'Very Deep',
  'Dark',
  'Deep',
  'Vivid',
  'Strong',
  'Moderate',
  'Dark Greyish',
  'Greyish',
  'Light Greyish',
]

function sortChildrenByLightness(children: ColorWheelHue[]): ColorWheelHue[] {
  const getRank = (name: string): number => {
    let bestIdx = 999
    let bestLen = 0
    for (let i = 0; i < ISCC_NBS_ORDER.length; i++) {
      const prefix = ISCC_NBS_ORDER[i]
      if (name.startsWith(prefix) && prefix.length > bestLen) {
        bestIdx = i
        bestLen = prefix.length
      }
    }
    return bestIdx
  }
  return [...children].sort((a, b) => {
    const diff = getRank(a.name) - getRank(b.name)
    if (diff !== 0) return diff
    return a.name < b.name ? -1 : a.name > b.name ? 1 : 0
  })
}

/**
 * Interactive SVG Munsell color wheel displaying all paints mapped by hue and lightness.
 *
 * Each Munsell sector is subdivided into concentric ring bands — one per
 * ISCC-NBS child hue — ordered outermost (Very Deep / darkest) to innermost
 * (Light Greyish / lightest). A radial gradient overlay fades to white at the
 * center. Paint markers are placed inside the ISCC-NBS cell their `hue_id`
 * resolves to, with a deterministic per-paint jitter so overlapping paints
 * spread out within the cell. Paints with an unrecognized `hue_id` fall back
 * to raw HSL hue/lightness positioning.
 *
 * Supports zoom/pan via scroll wheel and pointer drag, click-to-detail via
 * {@link PaintDetailPanel}, and hover tooltips — all driven by shared hooks.
 *
 * @param paints - All paints to plot on the wheel.
 * @param hues - Top-level Munsell hues with nested ISCC-NBS children, used to
 *   draw sector fills and concentric lightness bands.
 */
export function MunsellColorWheel({ paints, hues }: { paints: ColorWheelPaint[]; hues: ColorWheelHue[] }) {
  const { containerRef, hoveredPaint, tooltipPos, handleHover } = useWheelHover()
  const { viewBox, onWheel, onPointerDown, onPointerMove, onPointerUp, onPointerLeave, onTouchStart, onTouchMove, onTouchEnd } = useWheelTransform(VIEW_BOX)
  const { selectedPaint, handlePaintClick, clearSelection } = useWheelPaintSelection()

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const prevent = (e: Event) => e.preventDefault()
    el.addEventListener('wheel', prevent, { passive: false })
    return () => el.removeEventListener('wheel', prevent)
  }, [containerRef])

  const hueIdToCell = new Map<string, HueCell>()
  for (let i = 0; i < hues.length; i++) {
    const sortedChildren = sortChildrenByLightness(hues[i].children)
    for (let j = 0; j < sortedChildren.length; j++) {
      hueIdToCell.set(sortedChildren[j].id, {
        parentIndex: i,
        childIndex: j,
        totalChildren: sortedChildren.length,
        totalParents: hues.length,
      })
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative min-h-0 flex-1 w-full"
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
      <svg viewBox={viewBox} width="100%" height="100%" aria-label="Color wheel showing paint collection">
        <defs>
          <radialGradient id="munsell-lightness-overlay" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity={0.85} />
            <stop offset="70%" stopColor="white" stopOpacity={0} />
          </radialGradient>
          <clipPath id="munsell-wheel-clip">
            <circle cx="0" cy="0" r={OUTER_RADIUS} />
          </clipPath>
        </defs>

        {/* Munsell hue sectors — each divided into ISCC-NBS concentric lightness bands */}
        {hues.map((hue, i) => {
          const start = indexToStartAngle(i, hues.length)
          const end = indexToStartAngle(i + 1, hues.length)
          const sorted = sortChildrenByLightness(hue.children)

          if (sorted.length === 0) {
            return <path key={hue.id} d={sectorPath(start, end, OUTER_RADIUS)} fill={hue.hex_code} />
          }

          const bandWidth = OUTER_RADIUS / sorted.length
          return sorted.map((child, j) => {
            const outerR = OUTER_RADIUS - j * bandWidth
            const innerR = OUTER_RADIUS - (j + 1) * bandWidth
            return <path key={child.id} d={annularSectorPath(start, end, innerR, outerR)} fill={child.hex_code} />
          })
        })}

        {/* Lightness overlay — white center fading outward */}
        <circle cx="0" cy="0" r={OUTER_RADIUS} fill="url(#munsell-lightness-overlay)" />

        {/* Paint markers — placed inside their assigned ISCC-NBS cell when hue_id is set */}
        {paints.map((paint) => {
          const cell = paint.hue_id ? hueIdToCell.get(paint.hue_id) : undefined
          const { x, y } = cell
            ? hueCellPosition(cell, paint.id, OUTER_RADIUS)
            : hslToPosition(paint.hue, paint.lightness, OUTER_RADIUS)
          return (
            <PaintMarker
              key={paint.id}
              paint={paint}
              cx={x}
              cy={y}
              onHover={handleHover}
              onClick={handlePaintClick}
            />
          )
        })}
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
