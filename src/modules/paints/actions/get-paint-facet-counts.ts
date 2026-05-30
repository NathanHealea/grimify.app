'use server'

import { getPaintService } from '@/modules/paints/services/paint-service.server'
import type { PaintFacetCounts } from '@/modules/paints/types/paint-facet-counts'

/**
 * Server action that computes per-option paint counts for each filter dimension.
 *
 * Delegates to {@link PaintService.getPaintFacetCounts}. Called by the client
 * whenever filters change so the popover rows show filter-aware counts without
 * exposing Supabase credentials to the browser.
 *
 * @remarks
 * Uses strategy A (server-recompute): one round-trip per filter change, all
 * per-option queries run in parallel inside the service. If latency becomes an
 * issue, flip to strategy B (client-side narrowing of a pre-fetched aggregate)
 * without changing this action's signature.
 *
 * @param filters.query - Optional text search string.
 * @param filters.hueIds - Active hue UUIDs.
 * @param filters.brandIds - Active brand IDs.
 * @param filters.paintTypes - Active paint type strings.
 * @param filters.productLineIds - Active product-line IDs.
 * @param filters.discontinued - Active discontinued tri-state.
 * @param filters.metallicOnly - Active metallic filter.
 * @returns {@link PaintFacetCounts} with per-option counts for brand, type, and line.
 */
export async function getPaintFacetCounts(filters: {
  query?: string
  hueIds?: string[]
  brandIds?: number[]
  paintTypes?: string[]
  productLineIds?: number[]
  discontinued?: 'include' | 'exclude' | 'only'
  metallicOnly?: boolean
}): Promise<PaintFacetCounts> {
  const paintService = await getPaintService()
  return paintService.getPaintFacetCounts(filters)
}
