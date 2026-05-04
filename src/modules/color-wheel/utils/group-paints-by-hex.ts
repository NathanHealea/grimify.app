import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'
import type { PaintGroup } from '@/modules/color-wheel/types/paint-group'
import { paintToWheelPosition } from '@/modules/color-wheel/utils/paint-to-wheel-position'

/**
 * Groups a paint array by hex color so that identical colors collapse into a
 * single wheel position.
 *
 * Each group's `rep` is the first-seen paint with its SVG `x`/`y` wheel
 * coordinates pre-computed from `paintToWheelPosition`. Memoize the result
 * at the call site — this function is pure but not cheap on large arrays.
 *
 * @param paints - Array of paints to group (typically the filtered paint list).
 * @param wheelRadius - Outer radius of the color wheel in SVG units; passed to
 *   {@link paintToWheelPosition} for coordinate computation.
 * @returns Array of {@link PaintGroup} in insertion order.
 */
export function groupPaintsByHex(paints: ColorWheelPaint[], wheelRadius: number): PaintGroup[] {
  const map = new Map<string, PaintGroup>()

  for (const paint of paints) {
    const key = paint.hex.toLowerCase()
    const existing = map.get(key)
    if (existing) {
      existing.paints.push(paint)
    } else {
      const { x, y } = paintToWheelPosition(paint.hue / 360, paint.lightness / 100, wheelRadius)
      map.set(key, {
        key,
        paints: [paint],
        rep: { ...paint, x, y },
      })
    }
  }

  return Array.from(map.values())
}
