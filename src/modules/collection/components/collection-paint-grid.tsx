'use client'

import { useCallback } from 'react'

import { createClient } from '@/lib/supabase/client'
import { getCollectionService } from '@/modules/collection/services/collection-service.client'
import { PaginatedPaintGrid } from '@/modules/paints/components/paginated-paint-grid'
import type { PaintWithBrand } from '@/modules/paints/services/paint-service'

/**
 * Paginated paint grid scoped to the current user's collection.
 *
 * Wraps {@link PaginatedPaintGrid} with a collection-specific fetch function
 * that resolves the authenticated user from the browser Supabase client before
 * querying. All displayed paints are already in the collection, so the toggle
 * removes them rather than adding.
 *
 * @param props.initialPaints - First page of collection paints (server-rendered).
 * @param props.totalCount - Total number of paints in the user's collection.
 * @param props.userPaintIds - Set of all paint IDs in the collection for toggle state.
 */
export function CollectionPaintGrid({
  initialPaints,
  totalCount,
  userPaintIds,
}: {
  initialPaints: PaintWithBrand[]
  totalCount: number
  userPaintIds: Set<string>
}) {
  const fetchPaints = useCallback(async (options: { limit: number; offset: number }) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    const collectionService = getCollectionService()
    return collectionService.getCollectionPaints(user.id, options)
  }, [])

  return (
    <PaginatedPaintGrid
      initialPaints={initialPaints}
      totalCount={totalCount}
      basePath="/collection"
      fetchPaints={fetchPaints}
      userPaintIds={userPaintIds}
      isAuthenticated={true}
    />
  )
}
