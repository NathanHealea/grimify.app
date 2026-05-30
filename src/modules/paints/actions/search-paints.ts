'use server'

import { getPaintService } from '@/modules/paints/services/paint-service.server'
import type { PaintWithBrand } from '@/modules/paints/services/paint-service'

/**
 * Server action for searching/browsing paints with optional text, hue, and
 * dimension filters.
 *
 * Routes client-side search requests through Next.js instead of hitting the
 * Supabase REST API directly from the browser (avoids CORS issues).
 *
 * @param options.query - Search string matched against name, paint type, and brand.
 * @param options.hueIds - Hue UUIDs to filter by.
 * @param options.brandIds - Brand IDs to filter by (OR within dimension).
 * @param options.paintTypes - Paint type strings to filter by (OR within dimension).
 * @param options.productLineIds - Product-line IDs to filter by (OR within dimension).
 * @param options.discontinued - Tri-state for `is_discontinued`.
 * @param options.metallicOnly - When `true`, only metallic paints are returned.
 * @param options.limit - Maximum number of results to return.
 * @param options.offset - Number of results to skip.
 * @returns `{ paints, count }` matching the search criteria.
 */
export async function searchPaints(options: {
  query?: string
  hueIds?: string[]
  brandIds?: number[]
  paintTypes?: string[]
  productLineIds?: number[]
  discontinued?: 'include' | 'exclude' | 'only'
  metallicOnly?: boolean
  limit: number
  offset: number
}): Promise<{ paints: PaintWithBrand[]; count: number }> {
  const paintService = await getPaintService()
  return paintService.searchPaintsUnified({
    query: options.query,
    hueIds: options.hueIds,
    brandIds: options.brandIds,
    paintTypes: options.paintTypes,
    productLineIds: options.productLineIds,
    discontinued: options.discontinued,
    metallicOnly: options.metallicOnly,
    scope: 'all',
    limit: options.limit,
    offset: options.offset,
  })
}
