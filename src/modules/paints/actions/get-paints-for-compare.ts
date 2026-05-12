'use server'

import { getPaintService } from '@/modules/paints/services/paint-service.server'
import type { PaintWithRelationsAndHue } from '@/modules/paints/services/paint-service'
import { MAX_COMPARE_PAINTS } from '@/modules/paints/utils/parse-compare-params'

/**
 * Server action: bulk-hydrates full paint records for the comparison UI.
 *
 * Used by `usePaintComparisonSelection` when the URL adds paint IDs that
 * are not already in the SSR-seeded cache. Fetches each paint in parallel
 * via `paintService.getPaintById` and drops `null` results (unknown IDs).
 *
 * The input is capped at {@link MAX_COMPARE_PAINTS} to bound work; callers
 * should already be enforcing the cap, this is a defensive guard.
 *
 * @param ids - Paint UUIDs to hydrate. Order is preserved in the response.
 * @returns Array of full {@link PaintWithRelationsAndHue} records, in the
 *   same order as `ids`, with unresolved IDs filtered out.
 */
export async function getPaintsForCompare(
  ids: string[],
): Promise<PaintWithRelationsAndHue[]> {
  if (ids.length === 0) return []

  const capped = ids.slice(0, MAX_COMPARE_PAINTS)
  const service = await getPaintService()

  const results = await Promise.all(capped.map((id) => service.getPaintById(id)))

  return results.filter(
    (paint): paint is PaintWithRelationsAndHue => paint !== null,
  )
}
