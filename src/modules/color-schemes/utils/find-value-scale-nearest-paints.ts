import { circularHueDistance } from '@/modules/color-schemes/utils/circular-hue-distance'
import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'

/**
 * Selects up to five catalog paints near `targetHue`, ordered light→dark, with the
 * closest-hue match (the canonical) centered when two lighter and two darker neighbours exist.
 *
 * Algorithm:
 *   1. Rank all paints by {@link circularHueDistance} to `targetHue`.
 *   2. Take the top `huePoolSize` candidates — this is the "hue band".
 *   3. The closest-hue paint becomes the canonical match.
 *   4. From the remaining hue-band candidates, pick the two with `lightness >
 *      canonical.lightness` closest to canonical (the lighter pair).
 *   5. From the remaining, pick the two with `lightness < canonical.lightness`
 *      closest to canonical (the darker pair).
 *   6. If fewer than two candidates exist on either side, top up from the next-best
 *      paints by hue distance (outside the initial pool) regardless of side, so the
 *      result still has up to five entries.
 *   7. Sort the final selection by lightness descending so the row reads light→dark.
 *
 * @param targetHue - The hue (0–360) to match against.
 * @param paints - Catalog paints to search.
 * @param huePoolSize - Size of the hue-ranked candidate pool. Defaults to 12.
 * @returns Up to five paints, sorted light→dark by lightness. Total length is
 *   `min(5, paints.length)`.
 */
export function findValueScaleNearestPaints(
  targetHue: number,
  paints: ColorWheelPaint[],
  huePoolSize = 12,
): ColorWheelPaint[] {
  if (paints.length === 0) return []

  const rankedByHue = [...paints].sort(
    (a, b) => circularHueDistance(a.hue, targetHue) - circularHueDistance(b.hue, targetHue),
  )

  const huePool = rankedByHue.slice(0, huePoolSize)
  const canonical = huePool[0]
  const rest = huePool.slice(1)

  const lighter = rest
    .filter((p) => p.lightness > canonical.lightness)
    .sort(
      (a, b) =>
        Math.abs(a.lightness - canonical.lightness) -
        Math.abs(b.lightness - canonical.lightness),
    )
    .slice(0, 2)

  const darker = rest
    .filter((p) => p.lightness < canonical.lightness)
    .sort(
      (a, b) =>
        Math.abs(a.lightness - canonical.lightness) -
        Math.abs(b.lightness - canonical.lightness),
    )
    .slice(0, 2)

  const selected = new Set<string>([canonical.id, ...lighter.map((p) => p.id), ...darker.map((p) => p.id)])

  if (selected.size < 5) {
    for (const candidate of rankedByHue) {
      if (selected.size >= 5) break
      if (!selected.has(candidate.id)) selected.add(candidate.id)
    }
  }

  const byId = new Map(paints.map((p) => [p.id, p]))
  const result: ColorWheelPaint[] = []
  for (const id of selected) {
    const p = byId.get(id)
    if (p) result.push(p)
  }

  return result.sort((a, b) => b.lightness - a.lightness)
}
