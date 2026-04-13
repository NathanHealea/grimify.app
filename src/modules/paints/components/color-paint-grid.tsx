'use client'

import { useCallback } from 'react'

import { PaginatedPaintGrid } from '@/modules/paints/components/paginated-paint-grid'
import type { PaintWithBrand } from '@/modules/paints/services/paint-service'
import { getPaintService } from '@/modules/paints/services/paint-service.client'

/**
 * Paginated paint grid filtered to a specific color.
 *
 * Wraps {@link PaginatedPaintGrid} with a color-specific fetch function
 * and URL base path.
 *
 * @param props.colorId - The color UUID to filter paints by.
 * @param props.initialPaints - First page of paints (server-rendered).
 * @param props.totalCount - Total number of paints assigned to this color.
 */
export function ColorPaintGrid({
  colorId,
  initialPaints,
  totalCount,
}: {
  colorId: string
  initialPaints: PaintWithBrand[]
  totalCount: number
}) {
  const fetchPaints = useCallback(
    async (options: { limit: number; offset: number }) => {
      const paintService = getPaintService()
      return paintService.getPaintsByIttenHueId(colorId, options)
    },
    [colorId]
  )

  return (
    <PaginatedPaintGrid
      initialPaints={initialPaints}
      totalCount={totalCount}
      basePath={`/colors/${colorId}`}
      fetchPaints={fetchPaints}
    />
  )
}
