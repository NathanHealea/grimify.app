'use server'

import { getMatchService } from '@/modules/paints/services/match-service.server'
import type { MatchOptions } from '@/modules/paints/types/match-options'
import type { PaintMatch } from '@/modules/paints/types/paint-match'

/**
 * Server action: returns the N closest cross-brand matches for a source paint.
 *
 * Thin wrapper around `MatchService.findMatchesForPaint`. The single public
 * entry point for per-paint match lookups from the browser — used by the
 * comparison UI ("Find similar") and substitute-suggestions hook.
 *
 * Defaults exclude the source paint, paints from the same brand, and
 * discontinued paints. Returns an empty array if the source paint cannot
 * be resolved.
 *
 * @param paintId - UUID of the source paint.
 * @param options - Optional {@link MatchOptions} to override defaults.
 * @returns Array of {@link PaintMatch} sorted by ΔE ascending.
 */
export async function findPaintMatches(
  paintId: string,
  options?: MatchOptions,
): Promise<PaintMatch[]> {
  const service = await getMatchService()
  return service.findMatchesForPaint(paintId, options)
}
