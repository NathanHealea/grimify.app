import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'

/**
 * A candidate paint paired with its CIE76 ΔE distance from the source paint.
 *
 * Shape is identical to {@link RankedPaint} from
 * `@/modules/paints/utils/rank-paints-by-delta-e`. The two names are
 * intentionally kept in sync — this is the canonical name for cross-brand
 * matching, while `RankedPaint` is the canonical name for hue-swap ranking.
 *
 * @remarks A ΔE under ~2.0 is generally considered imperceptible.
 */
export type PaintMatch = {
  paint: ColorWheelPaint
  deltaE: number
}
