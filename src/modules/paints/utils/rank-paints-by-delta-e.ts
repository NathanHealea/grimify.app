import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'
import { deltaE76 } from '@/modules/color-wheel/utils/delta-e76'
import { hexToLab } from '@/modules/color-wheel/utils/hex-to-lab'

/** A paint paired with its CIE76 perceptual distance from a target color. */
export type RankedPaint = {
  paint: ColorWheelPaint
  deltaE: number
}

/** Module-level Lab cache so re-ranks on slider movement don't recompute Lab per paint. */
const labCache = new Map<string, ReturnType<typeof hexToLab>>()

function getCachedLab(paintId: string, hex: string) {
  if (!labCache.has(paintId)) {
    labCache.set(paintId, hexToLab(hex))
  }
  return labCache.get(paintId)!
}

/**
 * Ranks paints by CIE76 ΔE perceptual distance from a target hex color.
 *
 * Caches `hexToLab` conversions per paint id so repeated calls during slider
 * movement don't recompute Lab values for every candidate on every render.
 *
 * @param targetHex - The source paint's hex color (e.g. `"#A03020"`).
 * @param paints - The candidate paint list to rank.
 * @param limit - Maximum number of results to return (default 40).
 * @returns Array of {@link RankedPaint} sorted ascending by ΔE (closest first).
 */
export function rankPaintsByDeltaE(
  targetHex: string,
  paints: ColorWheelPaint[],
  limit = 40,
): RankedPaint[] {
  const targetLab = hexToLab(targetHex)

  return paints
    .map((paint) => ({
      paint,
      deltaE: deltaE76(targetLab, getCachedLab(paint.id, paint.hex)),
    }))
    .sort((a, b) => a.deltaE - b.deltaE)
    .slice(0, limit)
}
