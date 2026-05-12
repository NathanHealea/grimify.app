'use server'

import { getMatchService } from '@/modules/paints/services/match-service.server'
import type { MatchOptions } from '@/modules/paints/types/match-options'
import type { PaintMatch } from '@/modules/paints/types/paint-match'

/**
 * Server action: bulk variant of {@link findPaintMatches} that resolves
 * matches for many source paints in a single call.
 *
 * Used by SSR-heavy listings (e.g. the `/discontinued` page) so they can
 * render N substitute blocks without firing N client-side action calls.
 * Internally shares a single candidate-pool fetch across all source paints.
 *
 * Source paints that cannot be resolved are silently omitted from the map.
 *
 * @param paintIds - UUIDs of the source paints.
 * @param options - Optional {@link MatchOptions} applied uniformly to every source.
 * @returns Map keyed by source paint ID; each value is the paint's
 * ΔE-ranked matches.
 */
export async function findMatchesForPaints(
  paintIds: string[],
  options?: MatchOptions,
): Promise<Record<string, PaintMatch[]>> {
  const service = await getMatchService()
  return service.findMatchesForPaints(paintIds, options)
}
