'use server'

import { getPaintService } from '@/modules/paints/services/paint-service.server'
import type { PaintWithBrand } from '@/modules/paints/services/paint-service'

/**
 * Server action for searching/browsing paints with optional text and hue filters.
 *
 * Routes client-side search requests through Next.js instead of hitting the
 * Supabase REST API directly from the browser (avoids CORS issues).
 *
 * @param options.query - Search string matched against name, paint type, and brand.
 * @param options.hueIds - Hue UUIDs to filter by.
 * @param options.limit - Maximum number of results to return.
 * @param options.offset - Number of results to skip.
 * @returns `{ paints, count }` matching the search criteria.
 */
export async function searchPaints(options: {
  query?: string
  hueIds?: string[]
  limit: number
  offset: number
}): Promise<{ paints: PaintWithBrand[]; count: number }> {
  const paintService = await getPaintService()
  return paintService.searchPaintsUnified({
    query: options.query,
    hueIds: options.hueIds,
    scope: 'all',
    limit: options.limit,
    offset: options.offset,
  })
}
