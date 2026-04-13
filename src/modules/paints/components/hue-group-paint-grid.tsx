'use client'

import { useCallback } from 'react'

import { PaginatedPaintGrid } from '@/modules/paints/components/paginated-paint-grid'
import type { PaintWithBrand } from '@/modules/paints/services/paint-service'
import { getPaintService } from '@/modules/paints/services/paint-service.client'

/**
 * Paginated paint grid filtered to a specific Itten hue group.
 *
 * Wraps {@link PaginatedPaintGrid} with a hue-specific fetch function
 * and URL base path.
 *
 * @param props.hueId - The Itten hue UUID to filter paints by.
 * @param props.initialPaints - First page of paints (server-rendered).
 * @param props.totalCount - Total number of paints in this hue group.
 */
export function HueGroupPaintGrid({
  hueId,
  initialPaints,
  totalCount,
}: {
  hueId: string
  initialPaints: PaintWithBrand[]
  totalCount: number
}) {
  const fetchPaints = useCallback(
    async (options: { limit: number; offset: number }) => {
      const paintService = getPaintService()
      return paintService.getPaintsByHueGroup(hueId, options)
    },
    [hueId]
  )

  return (
    <PaginatedPaintGrid
      initialPaints={initialPaints}
      totalCount={totalCount}
      basePath={`/paints/group/${hueId}`}
      fetchPaints={fetchPaints}
    />
  )
}
