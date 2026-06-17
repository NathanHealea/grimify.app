'use server'

import { getPaintService } from '@/modules/paints/services/paint-service.server'
import type { PaintWithBrand } from '@/modules/paints/services/paint-service'

/**
 * Server action that searches paints with no hue assignment.
 *
 * Conforms to the `serverAction` contract required by {@link useAdminPaintSearch}.
 * The `hueIds` parameter is accepted for compatibility but ignored — unassigned
 * paints by definition have no hue, so filtering by hue ID would be contradictory.
 *
 * @param options.query - Optional case-insensitive name search string.
 * @param options.hueIds - Accepted for hook compatibility; unused.
 * @param options.limit - Maximum number of results to return.
 * @param options.offset - Number of results to skip.
 * @returns `{ paints, count }` of unassigned paints matching the search criteria.
 */
export async function searchUnassignedPaints(options: {
  query?: string
  hueIds?: string[]
  limit: number
  offset: number
}): Promise<{ paints: PaintWithBrand[]; count: number }> {
  const paintService = await getPaintService()
  return paintService.getPaintsWithoutHue({
    query: options.query,
    limit: options.limit,
    offset: options.offset,
  })
}
