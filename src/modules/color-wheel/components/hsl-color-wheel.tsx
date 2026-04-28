'use client'

import type { MouseEvent } from 'react';
import { useMemo, useRef, useState } from 'react';

import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint';
import { COLOR_SEGMENTS, SEGMENT_BOUNDARIES } from '@/modules/color-wheel/utils/color-segments';
import { hslToHex } from '@/modules/color-wheel/utils/hsl-to-hex';
import { paintToWheelPosition } from '@/modules/color-wheel/utils/paint-to-wheel-position';
import { annularSectorPath, sectorPath } from '@/modules/color-wheel/utils/sector-path';
import { PaintMarker } from './paint-marker';

/** Outer radius of the paint content area in SVG units. */
const WHEEL_RADIUS = 450

/** Outer edge of the light (innermost) band — one-third of WHEEL_RADIUS. */
const LIGHT_RADIUS = WHEEL_RADIUS / 3

/** Outer edge of the medium band — two-thirds of WHEEL_RADIUS. */
const MEDIUM_RADIUS = (WHEEL_RADIUS * 2) / 3

/** Width of the saturated hue ring in SVG units. */
const RING_WIDTH = 20

/** Inner edge of the hue ring — flush against the content area. */
const RING_INNER = WHEEL_RADIUS

/** Outer edge of the hue ring. */
const RING_OUTER = WHEEL_RADIUS + RING_WIDTH

/** Desired gap in SVG units from ring outer edge to the nearest text edge. */
const LABEL_GAP = 24

/** Approximate SVG units per character at fontSize 14 (used for radial clearance math). */
const LABEL_CHAR_WIDTH = 8

/** Half-height of a fontSize-14 label in SVG units. */
const LABEL_HALF_HEIGHT = 7

const DEG_TO_RAD = Math.PI / 180

/** Color harmony relationship types for scheme wedge overlays. */
export type ColorScheme = 'complementary' | 'analogous' | 'triadic' | 'split-complementary' | 'tetradic'

interface SchemeWedge {
  center: number
  span: number
  color: string
}

function getSchemeWedges(hue: number, scheme: ColorScheme): SchemeWedge[] {
  const h = ((hue % 360) + 360) % 360
  const wedge = (center: number, span = 15): SchemeWedge => {
    const c = ((center % 360) + 360) % 360
    return { center: c, span, color: hslToHex(c, 0.9, 0.55) }
  }
  switch (scheme) {
    case 'complementary':
      return [wedge(h), wedge(h + 180)]
    case 'analogous':
      return [wedge(h - 30), wedge(h), wedge(h + 30)]
    case 'triadic':
      return [wedge(h), wedge(h + 120), wedge(h + 240)]
    case 'split-complementary':
      return [wedge(h), wedge(h + 150), wedge(h + 210)]
    case 'tetradic':
      return [wedge(h), wedge(h + 90), wedge(h + 180), wedge(h + 270)]
  }
}

/**
 * Interactive SVG HSL color wheel divided into 12 Itten color wheel sectors.
 *
 * Each sector contains three concentric bands — light (inner), medium, and dark
 * (outer) — corresponding to HSL lightness zones. A smooth 360-arc hue ring
 * borders the content area. Sector divider lines and color-tinted labels identify
 * each segment. Optionally renders color scheme wedge overlays when
 * {@link selectedHue} and {@link colorScheme} are provided.
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
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoveredPaint, setHoveredPaint] = useState<ColorWheelPaint | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  function handleHover(paint: ColorWheelPaint | null, event: MouseEvent<SVGElement>) {
    setHoveredPaint(paint)
    if (paint && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const x = Math.min(event.clientX - rect.left + 12, rect.width - 180)
      const y = Math.min(event.clientY - rect.top + 12, rect.height - 80)
      setTooltipPos({ x: Math.max(0, x), y: Math.max(0, y) })
    }
  }

  // Three concentric bands per sector: light (center) → medium → dark (outer)
  const segmentWedges = useMemo(
    () =>
      COLOR_SEGMENTS.flatMap((seg) => [
        <path
          key={`light-${seg.midAngle}`}
          d={sectorPath(seg.midAngle - 15, seg.midAngle + 15, LIGHT_RADIUS)}
          fill={hslToHex(seg.midAngle, 0.8, 0.75)}
          fillOpacity={0.25}
          stroke="none"
        />,
        <path
          key={`medium-${seg.midAngle}`}
          d={annularSectorPath(seg.midAngle - 15, seg.midAngle + 15, LIGHT_RADIUS, MEDIUM_RADIUS)}
          fill={hslToHex(seg.midAngle, 0.8, 0.5)}
          fillOpacity={0.25}
          stroke="none"
        />,
        <path
          key={`dark-${seg.midAngle}`}
          d={annularSectorPath(seg.midAngle - 15, seg.midAngle + 15, MEDIUM_RADIUS, WHEEL_RADIUS)}
          fill={hslToHex(seg.midAngle, 0.8, 0.25)}
          fillOpacity={0.25}
          stroke="none"
        />,
      ]),
    []
  )

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

  // Sector labels outside the hue ring, tinted to the sector's hue.
  // Each label's radius is computed so its radial inner edge is always LABEL_GAP
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
            fill={hslToHex(seg.midAngle, 0.8, 0.55)}
            fillOpacity={0.7}
          >
            {seg.name}
          </text>
        )
      }),
    []
  )

  // Color scheme wedge overlays — filled sectors showing harmony relationships
  const schemeWedgeOverlays = useMemo(() => {
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

  return (
    <div ref={containerRef} className="relative mx-auto aspect-square w-full max-w-2xl">
      <svg
        viewBox="-650 -650 1300 1300"
        width="100%"
        height="100%"
        className="block"
        aria-label="HSL color wheel showing paint collection"
      >
        {/* Segment background wedges — light / medium / dark bands per sector */}
        <g id="segment-wedges">{segmentWedges}</g>

        {/* Smooth per-degree hue ring */}
        <g id="hue-ring-arcs">{hueRingArcs}</g>

        {/* Sector boundary lines */}
        <g id="divider-lines">{dividerLines}</g>

        {/* Sector labels */}
        <g id="segment-labels">{segmentLabels}</g>

        {/* Color scheme wedge overlays */}
        {schemeWedgeOverlays && <g id="scheme-wedge-overlays" pointerEvents="none">{schemeWedgeOverlays}</g>}

        {/* Paint markers positioned by raw HSL values — direct SVG children, on top */}
        <g id="paint-markers">
          {paints.map((paint) => {
            const { x, y } = paintToWheelPosition(paint.hue / 360, paint.lightness / 100, WHEEL_RADIUS)
            return <PaintMarker key={paint.id} paint={paint} cx={x} cy={y} onHover={handleHover} />
          })}
        </g>
      </svg>

      {hoveredPaint && (
        <div
          className="card absolute z-10 max-w-[176px] border border-border bg-background px-3 py-2 text-sm shadow-md"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          <p className="font-medium leading-tight">{hoveredPaint.name}</p>
          <p className="text-muted-foreground">{hoveredPaint.brand_name}</p>
          <p className="text-muted-foreground">{hoveredPaint.product_line_name}</p>
        </div>
      )}
    </div>
  )
}
