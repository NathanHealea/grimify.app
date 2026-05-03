'use client'

import type { MutableRefObject, PointerEvent, TouchEvent, WheelEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

const MIN_ZOOM = 1
const MAX_ZOOM = 10
const SESSION_KEY = 'color-wheel-zoom'

/** Return shape of {@link useWheelTransform}. */
export interface WheelTransformState {
  /**
   * Dynamic `viewBox` string for the `<svg>` element. Zoom/pan adjust the
   * visible window into the fixed SVG coordinate space instead of transforming
   * content with a `<g>`.
   */
  viewBox: string
  /** Current zoom level (1–10). Use to scale marker geometry inversely so markers stay a constant apparent screen size. */
  zoom: number
  /** `true` while the user is actively panning via pointer drag. Use to switch between `grab` and `grabbing` cursor. */
  isDragging: boolean
  /**
   * Running pixel distance moved since the last `pointerdown`. Resets to 0 on
   * each new `pointerdown`. Read this in click handlers to distinguish an
   * intentional tap (< 3 px) from an accidental click at the end of a drag.
   */
  dragDistanceRef: MutableRefObject<number>
  /** Resets zoom to 1 and pan to `{0, 0}`. */
  resetTransform: () => void
  /** Attach to the wheel container div's `onWheel` prop. */
  onWheel: (e: WheelEvent<HTMLDivElement>) => void
  /** Attach to the wheel container div's `onPointerDown` prop. */
  onPointerDown: (e: PointerEvent<HTMLDivElement>) => void
  /** Attach to the wheel container div's `onPointerMove` prop. */
  onPointerMove: (e: PointerEvent<HTMLDivElement>) => void
  /** Attach to the wheel container div's `onPointerUp` prop. */
  onPointerUp: (e: PointerEvent<HTMLDivElement>) => void
  /** Attach to the wheel container div's `onPointerLeave` prop. */
  onPointerLeave: (e: PointerEvent<HTMLDivElement>) => void
  /** Attach to the wheel container div's `onTouchStart` prop. */
  onTouchStart: (e: TouchEvent<HTMLDivElement>) => void
  /** Attach to the wheel container div's `onTouchMove` prop. */
  onTouchMove: (e: TouchEvent<HTMLDivElement>) => void
  /** Attach to the wheel container div's `onTouchEnd` prop. */
  onTouchEnd: (e: TouchEvent<HTMLDivElement>) => void
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function pinchDist(t0: { clientX: number; clientY: number }, t1: { clientX: number; clientY: number }): number {
  return Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY)
}

/**
 * Manages zoom and pan for the color wheel via a dynamic SVG `viewBox`.
 *
 * Zoom shrinks/grows the visible viewport in SVG world space so all paint
 * coordinates stay fixed and no `<g transform>` is needed. Zoom is centered
 * on the cursor or pinch midpoint using the formula from the reference
 * implementation: `newPan = pivot − (pivot − currentPan) × (oldZoom / newZoom)`.
 *
 * The zoom level is persisted to `sessionStorage` so it survives view toggles.
 *
 * @param baseViewBox - The `[x, y, width, height]` viewBox at zoom 1 (must be
 *   a centered square, e.g. `[-500, -500, 1000, 1000]`).
 * @returns {@link WheelTransformState}
 */
export function useWheelTransform(baseViewBox: [number, number, number, number]): WheelTransformState {
  const totalSize = baseViewBox[2]

  const [zoom, setZoomState] = useState<number>(MIN_ZOOM)
  const [pan, setPanState] = useState({ x: 0, y: 0 })

  // Kept in sync with state immediately so event handlers always read fresh values.
  const zoomRef = useRef(zoom)
  const panRef = useRef(pan)

  function setZoom(z: number) {
    zoomRef.current = z
    setZoomState(z)
  }

  function setPan(p: { x: number; y: number }) {
    panRef.current = p
    setPanState(p)
  }

  // Restore zoom from sessionStorage after mount to avoid SSR hydration mismatch
  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY)
    const parsed = saved ? parseFloat(saved) : NaN
    if (!isNaN(parsed)) {
      const restored = clamp(parsed, MIN_ZOOM, MAX_ZOOM)
      if (restored !== MIN_ZOOM) setZoom(restored)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist zoom to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(SESSION_KEY, String(zoom))
  }, [zoom])

  // rAF throttle refs for wheel events — accumulate factor per frame, apply once
  const rafId = useRef<number | null>(null)
  const pendingFactor = useRef<number>(1)
  const pendingClientX = useRef<number>(0)
  const pendingClientY = useRef<number>(0)
  const pendingRect = useRef<DOMRect | null>(null)

  // Drag state — ref for synchronous handler logic, state for cursor rendering
  const isDragging = useRef(false)
  const [isDraggingState, setIsDraggingState] = useState(false)
  const dragStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  // Pixel distance moved since last pointerdown — used to distinguish taps from drags
  const dragDistanceRef = useRef(0)
  // Pinch state — stores the last-seen finger distance for incremental scaling
  const pinchDistRef = useRef<number | null>(null)

  const resetTransform = useCallback(() => {
    setZoom(MIN_ZOOM)
    setPan({ x: 0, y: 0 })
  }, [])

  /**
   * Converts a client (screen) coordinate to SVG world space, accounting for
   * the current zoom and pan so the returned point is the exact world coordinate
   * visible under the given screen position.
   */
  const clientToSvg = useCallback(
    (clientX: number, clientY: number, rect: DOMRect): { x: number; y: number } => {
      const nx = (clientX - rect.left) / rect.width
      const ny = (clientY - rect.top) / rect.height
      const z = zoomRef.current
      const p = panRef.current
      const size = totalSize / z
      return {
        x: -size / 2 + p.x + nx * size,
        y: -size / 2 + p.y + ny * size,
      }
    },
    [totalSize]
  )

  // Applies the accumulated wheel factor in one rAF, capping renders at ~60fps.
  const flushWheel = useCallback(() => {
    rafId.current = null
    const factor = pendingFactor.current
    pendingFactor.current = 1
    const rect = pendingRect.current
    if (!rect || factor === 1) return

    const currentZoom = zoomRef.current
    const currentPan = panRef.current
    const newZoom = clamp(currentZoom * factor, MIN_ZOOM, MAX_ZOOM)
    if (newZoom === MIN_ZOOM) {
      setZoom(MIN_ZOOM)
      setPan({ x: 0, y: 0 })
      return
    }
    const pivot = clientToSvg(pendingClientX.current, pendingClientY.current, rect)
    const ratio = currentZoom / newZoom
    setZoom(newZoom)
    setPan({
      x: pivot.x - (pivot.x - currentPan.x) * ratio,
      y: pivot.y - (pivot.y - currentPan.y) * ratio,
    })
  }, [clientToSvg])

  const onWheel = useCallback(
    (e: WheelEvent<HTMLDivElement>) => {
      e.preventDefault()
      // Accumulate multiplicative factor so rapid events compound correctly.
      pendingFactor.current *= e.deltaY > 0 ? 0.9 : 1.1
      pendingClientX.current = e.clientX
      pendingClientY.current = e.clientY
      pendingRect.current = e.currentTarget.getBoundingClientRect()
      if (rafId.current === null) {
        rafId.current = requestAnimationFrame(flushWheel)
      }
    },
    [flushWheel]
  )

  const onPointerDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    isDragging.current = true
    setIsDraggingState(true)
    dragDistanceRef.current = 0
    const p = panRef.current
    dragStart.current = { x: e.clientX, y: e.clientY, panX: p.x, panY: p.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!isDragging.current || !dragStart.current) return
      const dx = e.clientX - dragStart.current.x
      const dy = e.clientY - dragStart.current.y
      dragDistanceRef.current = Math.hypot(dx, dy)
      const rect = e.currentTarget.getBoundingClientRect()
      const size = totalSize / zoomRef.current
      const scale = size / rect.width
      setPan({
        x: dragStart.current.panX - dx * scale,
        y: dragStart.current.panY - dy * scale,
      })
    },
    [totalSize]
  )

  const stopDrag = useCallback(() => {
    isDragging.current = false
    setIsDraggingState(false)
    dragStart.current = null
  }, [])

  const onTouchStart = useCallback((e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      isDragging.current = true
      pinchDistRef.current = null
      const p = panRef.current
      dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, panX: p.x, panY: p.y }
    } else if (e.touches.length === 2) {
      isDragging.current = false
      dragStart.current = null
      pinchDistRef.current = pinchDist(e.touches[0], e.touches[1])
    }
  }, [])

  const onTouchMove = useCallback(
    (e: TouchEvent<HTMLDivElement>) => {
      if (e.touches.length === 2 && pinchDistRef.current !== null) {
        e.preventDefault()
        const dist = pinchDist(e.touches[0], e.touches[1])
        const pinchRatio = dist / pinchDistRef.current
        pinchDistRef.current = dist

        const currentZoom = zoomRef.current
        const currentPan = panRef.current
        const newZoom = clamp(currentZoom * pinchRatio, MIN_ZOOM, MAX_ZOOM)
        if (newZoom === MIN_ZOOM) {
          setZoom(newZoom)
          setPan({ x: 0, y: 0 })
          return
        }
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2
        const rect = e.currentTarget.getBoundingClientRect()
        const pivot = clientToSvg(midX, midY, rect)
        const ratio = currentZoom / newZoom
        setZoom(newZoom)
        setPan({
          x: pivot.x - (pivot.x - currentPan.x) * ratio,
          y: pivot.y - (pivot.y - currentPan.y) * ratio,
        })
      } else if (e.touches.length === 1 && isDragging.current && dragStart.current) {
        const dx = e.touches[0].clientX - dragStart.current.x
        const dy = e.touches[0].clientY - dragStart.current.y
        const rect = e.currentTarget.getBoundingClientRect()
        const size = totalSize / zoomRef.current
        const scale = size / rect.width
        setPan({
          x: dragStart.current.panX - dx * scale,
          y: dragStart.current.panY - dy * scale,
        })
      }
    },
    [totalSize, clientToSvg]
  )

  const onTouchEnd = useCallback((e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) {
      pinchDistRef.current = null
    }
    if (e.touches.length === 1) {
      isDragging.current = true
      const p = panRef.current
      dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, panX: p.x, panY: p.y }
    }
    if (e.touches.length === 0) {
      isDragging.current = false
      dragStart.current = null
    }
  }, [])

  const viewSize = totalSize / zoom
  const viewBoxStr = `${-viewSize / 2 + pan.x} ${-viewSize / 2 + pan.y} ${viewSize} ${viewSize}`

  return {
    viewBox: viewBoxStr,
    zoom,
    isDragging: isDraggingState,
    dragDistanceRef,
    resetTransform,
    onWheel,
    onPointerDown,
    onPointerMove,
    onPointerUp: stopDrag,
    onPointerLeave: stopDrag,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  }
}
