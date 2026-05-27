'use server'

import type { PaletteSummary } from '@/modules/palettes/types/palette-summary'
import { getPaletteService } from '@/modules/palettes/services/palette-service.server'

/**
 * Fetches palette summaries for a list of recently-viewed palette IDs.
 *
 * Caps the input at 10 IDs to match the localStorage storage cap and prevent
 * unbounded server queries. Results are re-ordered to match the input order so
 * the caller receives palettes in most-recent-first sequence.
 *
 * Palettes that no longer exist or are no longer visible to the caller (deleted,
 * flipped to private) are silently omitted from the result — no error is raised.
 *
 * @param ids - Ordered array of palette UUIDs (most recent first).
 * @returns {@link PaletteSummary} array ordered to match the input, with missing IDs dropped.
 */
export async function getRecentPaletteSummaries(ids: string[]): Promise<PaletteSummary[]> {
  const capped = ids.slice(0, 10)
  if (capped.length === 0) return []

  const service = await getPaletteService()
  const rows = await service.listPalettesByIds(capped)

  const byId = new Map(rows.map((s) => [s.id, s]))
  return capped.flatMap((id) => {
    const summary = byId.get(id)
    return summary ? [summary] : []
  })
}
