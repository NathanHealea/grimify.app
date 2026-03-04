'use client'

import { useCallback, useMemo, useRef, useState } from 'react'

import type { Paint } from '@/types/paint'
import {
  COLOR_SEGMENTS,
  hexToHsl,
  hslToHex,
  paintToWheelPosition,
  RING_WIDTH,
  SEGMENT_BOUNDARIES,
  WHEEL_RADIUS,
} from '@/utils/colorUtils'

interface ProcessedPaint extends Paint {
  x: number
  y: number
}

interface ColorWheelProps {
  paints: Paint[]
  zoom: number
  pan: { x: number; y: number }
  onZoomChange: (zoom: number) => void
  onPanChange: (pan: { x: number; y: number }) => void
}

const MIN_ZOOM = 0.4
const MAX_ZOOM = 8
const DOT_RADIUS = 5
const LABEL_ZOOM_THRESHOLD = 2

function buildHueRingPath(startDeg: number, endDeg: number, innerR: number, outerR: number): string {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const s1 = toRad(startDeg)
  const s2 = toRad(endDeg)
  // SVG y-axis is flipped, so negate sin for counter-clockwise hue mapping
  const x1 = outerR * Math.cos(s1)
  const y1 = -outerR * Math.sin(s1)
  const x2 = outerR * Math.cos(s2)
  const y2 = -outerR * Math.sin(s2)
  const x3 = innerR * Math.cos(s2)
  const y3 = -innerR * Math.sin(s2)
  const x4 = innerR * Math.cos(s1)
  const y4 = -innerR * Math.sin(s1)

  return `M ${x1} ${y1} A ${outerR} ${outerR} 0 0 0 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 0 1 ${x4} ${y4} Z`
}

export default function ColorWheel({ paints, zoom, pan, onZoomChange, onPanChange }: ColorWheelProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const touchStart = useRef<{ dist: number; zoom: number; mid: { x: number; y: number } } | null>(null)

  const processedPaints = useMemo<ProcessedPaint[]>(
    () =>
      paints.map((paint) => {
        const hsl = hexToHsl(paint.hex)
        const pos = paintToWheelPosition(hsl.h, hsl.l, WHEEL_RADIUS)
        return { ...paint, x: pos.x, y: pos.y }
      }),
    [paints],
  )

  // ViewBox derived from zoom and pan
  const totalSize = (WHEEL_RADIUS + RING_WIDTH + 40) * 2
  const viewSize = totalSize / zoom
  const viewBox = `${-viewSize / 2 + pan.x} ${-viewSize / 2 + pan.y} ${viewSize} ${viewSize}`

  // Hue ring arcs (one per degree for smooth gradient)
  const hueRingArcs = useMemo(() => {
    const arcs = []
    const innerR = WHEEL_RADIUS
    const outerR = WHEEL_RADIUS + RING_WIDTH
    for (let deg = 0; deg < 360; deg++) {
      const color = hslToHex(deg, 1, 0.5)
      arcs.push(<path key={deg} d={buildHueRingPath(deg, deg + 1.5, innerR, outerR)} fill={color} stroke="none" />)
    }
    return arcs
  }, [])

  // Segment background wedges — light (inner) → normal (mid) → dark (outer)
  const segmentWedges = useMemo(() => {
    const toRad = (deg: number) => (deg * Math.PI) / 180
    const opacity = 0.1
    // Three concentric bands per segment
    const bands: { innerR: number; outerR: number; lightness: number }[] = [
      { innerR: 0, outerR: WHEEL_RADIUS / 3, lightness: 0.75 },
      { innerR: WHEEL_RADIUS / 3, outerR: (WHEEL_RADIUS * 2) / 3, lightness: 0.5 },
      { innerR: (WHEEL_RADIUS * 2) / 3, outerR: WHEEL_RADIUS, lightness: 0.25 },
    ]
    return COLOR_SEGMENTS.flatMap((seg) => {
      const start = seg.hueStart
      const end = seg.hueEnd < seg.hueStart ? seg.hueEnd + 360 : seg.hueEnd
      const startRad = toRad(start)
      const endRad = toRad(end)
      const largeArc = end - start > 180 ? 1 : 0

      return bands.map((band, bi) => {
        const color = hslToHex(seg.midAngle, 1, band.lightness)
        if (band.innerR === 0) {
          // Innermost band: pie slice from center
          const x1 = band.outerR * Math.cos(startRad)
          const y1 = -band.outerR * Math.sin(startRad)
          const x2 = band.outerR * Math.cos(endRad)
          const y2 = -band.outerR * Math.sin(endRad)
          const d = `M 0 0 L ${x1} ${y1} A ${band.outerR} ${band.outerR} 0 ${largeArc} 0 ${x2} ${y2} Z`
          return <path key={`${seg.name}-${bi}`} d={d} fill={color} fillOpacity={opacity} stroke="none" />
        }
        // Ring band: annular wedge
        const d = buildHueRingPath(start, end, band.innerR, band.outerR)
        return <path key={`${seg.name}-${bi}`} d={d} fill={color} fillOpacity={opacity} stroke="none" />
      })
    })
  }, [])

  // Segment divider lines
  const dividerLines = useMemo(
    () =>
      SEGMENT_BOUNDARIES.map((angle) => {
        const rad = (angle * Math.PI) / 180
        const outerR = WHEEL_RADIUS + RING_WIDTH
        return (
          <line
            key={angle}
            x1={0}
            y1={0}
            x2={outerR * Math.cos(rad)}
            y2={-outerR * Math.sin(rad)}
            stroke="rgba(255,255,255,0.3)"
            strokeWidth={1}
          />
        )
      }),
    [],
  )

  // Segment labels — horizontal, colored to match their section
  const segmentLabels = useMemo(
    () =>
      COLOR_SEGMENTS.map((seg) => {
        const rad = (seg.midAngle * Math.PI) / 180
        const labelR = WHEEL_RADIUS + RING_WIDTH + 20
        const x = labelR * Math.cos(rad)
        const y = -labelR * Math.sin(rad)
        const color = hslToHex(seg.midAngle, 1, 0.5)
        return (
          <text
            key={seg.name}
            x={x}
            y={y}
            fill={color}
            fillOpacity={0.7}
            fontSize={14}
            fontWeight={600}
            textAnchor="middle"
            dominantBaseline="central"
          >
            {seg.name}
          </text>
        )
      }),
    [],
  )

  // Check if a point is within the current viewBox (for label culling)
  const isInView = useCallback(
    (x: number, y: number) => {
      const vx = -viewSize / 2 + pan.x
      const vy = -viewSize / 2 + pan.y
      return x >= vx && x <= vx + viewSize && y >= vy && y <= vy + viewSize
    },
    [viewSize, pan],
  )

  // Convert client coordinates to SVG coordinates
  const clientToSvg = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current
      if (!svg) return { x: 0, y: 0 }
      const rect = svg.getBoundingClientRect()
      const nx = (clientX - rect.left) / rect.width
      const ny = (clientY - rect.top) / rect.height
      return {
        x: -viewSize / 2 + pan.x + nx * viewSize,
        y: -viewSize / 2 + pan.y + ny * viewSize,
      }
    },
    [viewSize, pan],
  )

  // Mouse wheel zoom (toward cursor)
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * zoomFactor))
      const svgPoint = clientToSvg(e.clientX, e.clientY)

      // Adjust pan so the point under cursor stays fixed
      const ratio = zoom / newZoom
      const newPanX = svgPoint.x - (svgPoint.x - pan.x) * ratio
      const newPanY = svgPoint.y - (svgPoint.y - pan.y) * ratio

      onZoomChange(newZoom)
      onPanChange({ x: newPanX, y: newPanY })
    },
    [zoom, pan, clientToSvg, onZoomChange, onPanChange],
  )

  // Mouse drag pan
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return
      setIsDragging(true)
      dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
    },
    [pan],
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !dragStart.current) return
      const dx = e.clientX - dragStart.current.x
      const dy = e.clientY - dragStart.current.y
      const svg = svgRef.current
      if (!svg) return
      const rect = svg.getBoundingClientRect()
      // Convert pixel delta to SVG units
      const scale = viewSize / rect.width
      onPanChange({
        x: dragStart.current.panX - dx * scale,
        y: dragStart.current.panY - dy * scale,
      })
    },
    [isDragging, viewSize, onPanChange],
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    dragStart.current = null
  }, [])

  // Touch handlers
  const getTouchDist = (touches: React.TouchList) => {
    if (touches.length < 2) return 0
    const dx = touches[1].clientX - touches[0].clientX
    const dy = touches[1].clientY - touches[0].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        // Single finger — pan
        setIsDragging(true)
        dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, panX: pan.x, panY: pan.y }
      } else if (e.touches.length === 2) {
        // Two fingers — pinch zoom
        const dist = getTouchDist(e.touches)
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2
        touchStart.current = { dist, zoom, mid: { x: midX, y: midY } }
        setIsDragging(false)
        dragStart.current = null
      }
    },
    [pan, zoom],
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault()
      if (e.touches.length === 1 && isDragging && dragStart.current) {
        // Pan
        const dx = e.touches[0].clientX - dragStart.current.x
        const dy = e.touches[0].clientY - dragStart.current.y
        const svg = svgRef.current
        if (!svg) return
        const rect = svg.getBoundingClientRect()
        const scale = viewSize / rect.width
        onPanChange({
          x: dragStart.current.panX - dx * scale,
          y: dragStart.current.panY - dy * scale,
        })
      } else if (e.touches.length === 2 && touchStart.current) {
        // Pinch zoom
        const dist = getTouchDist(e.touches)
        const ratio = dist / touchStart.current.dist
        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, touchStart.current.zoom * ratio))

        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2
        const svgPoint = clientToSvg(midX, midY)
        const zoomRatio = zoom / newZoom
        const newPanX = svgPoint.x - (svgPoint.x - pan.x) * zoomRatio
        const newPanY = svgPoint.y - (svgPoint.y - pan.y) * zoomRatio

        onZoomChange(newZoom)
        onPanChange({ x: newPanX, y: newPanY })
      }
    },
    [isDragging, viewSize, zoom, pan, clientToSvg, onZoomChange, onPanChange],
  )

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
    dragStart.current = null
    touchStart.current = null
  }, [])

  return (
    <svg
      ref={svgRef}
      viewBox={viewBox}
      className="h-full w-full"
      style={{ touchAction: 'none', cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none', WebkitUserSelect: 'none' }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Segment background wedges */}
      <g>{segmentWedges}</g>

      {/* Hue ring */}
      <g>{hueRingArcs}</g>

      {/* Segment dividers */}
      <g>{dividerLines}</g>

      {/* Segment labels */}
      <g>{segmentLabels}</g>

      {/* Paint dots */}
      <g>
        {processedPaints.map((paint, i) => (
          <circle
            key={`${paint.brand}-${paint.name}-${i}`}
            cx={paint.x}
            cy={paint.y}
            r={DOT_RADIUS}
            fill={paint.hex}
            stroke="rgba(0,0,0,0.5)"
            strokeWidth={1}
          />
        ))}
      </g>

      {/* Paint labels at zoom > 2x */}
      {zoom > LABEL_ZOOM_THRESHOLD && (
        <g>
          {processedPaints
            .filter((p) => isInView(p.x, p.y))
            .map((paint, i) => (
              <text
                key={`label-${paint.brand}-${paint.name}-${i}`}
                x={paint.x + DOT_RADIUS + 3}
                y={paint.y + 1}
                fill="white"
                fontSize={8}
                fontFamily="system-ui, sans-serif"
                paintOrder="stroke"
                stroke="rgba(0,0,0,0.7)"
                strokeWidth={2}
              >
                {paint.name}
              </text>
            ))}
        </g>
      )}
    </svg>
  )
}
