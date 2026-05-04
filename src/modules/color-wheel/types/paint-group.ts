import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'

/**
 * Representative paint with its pre-computed SVG wheel coordinates attached.
 *
 * Coordinates are computed once per group by {@link groupPaintsByHex} so
 * the wheel rendering path never calls `paintToWheelPosition` per frame.
 */
export type PaintGroupRep = ColorWheelPaint & {
  /** Pre-computed SVG x coordinate on the wheel. */
  x: number
  /** Pre-computed SVG y coordinate on the wheel. */
  y: number
}

/**
 * A group of paints that share the same hex color and therefore occupy the
 * same position on the color wheel.
 *
 * The group renders as a single dot whose visual complexity scales with group
 * size (count badge when `paints.length > 1`) and brand diversity (brand-ring
 * arcs, one arc segment per unique brand in the group).
 */
export type PaintGroup = {
  /** Stable key — the lowercased hex of the representative paint. */
  key: string
  /** All paints in the group, in insertion order. */
  paints: ColorWheelPaint[]
  /** First-seen paint with its wheel coordinates attached. */
  rep: PaintGroupRep
}
