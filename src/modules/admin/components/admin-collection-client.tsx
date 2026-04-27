'use client'

import { useState } from 'react'

import { AdminAddPaintForm } from '@/modules/admin/components/admin-add-paint-form'
import { AdminUserCollectionSearch } from '@/modules/admin/components/admin-user-collection-search'
import type { PaintWithBrand } from '@/modules/paints/services/paint-service'

/**
 * Client wrapper that connects the admin paint picker to the collection search grid.
 *
 * Owns `refreshKey` state: when the picker successfully adds a paint, `onAdded`
 * increments the key, which forces {@link AdminUserCollectionSearch}'s fetch hook
 * to re-run so the newly added paint appears immediately without a page reload.
 *
 * @param props.userId - UUID of the target user.
 * @param props.isSelf - When true, the picker is hidden (admins can't modify their own collection here).
 * @param props.initialPaints - SSR-prefetched first page of collection paints.
 * @param props.initialTotalCount - SSR-prefetched total collection count.
 * @param props.initialQuery - Pre-filled query string from the URL.
 * @param props.initialPage - Pre-filled page number from the URL.
 * @param props.initialSize - Pre-filled page size from the URL.
 */
export function AdminCollectionClient({
  userId,
  isSelf,
  initialPaints,
  initialTotalCount,
  initialQuery,
  initialPage,
  initialSize,
}: {
  userId: string
  isSelf: boolean
  initialPaints: PaintWithBrand[]
  initialTotalCount: number
  initialQuery: string
  initialPage: number
  initialSize: number
}) {
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <>
      {!isSelf && (
        <div className="mb-8">
          <AdminAddPaintForm
            userId={userId}
            initialQuery={initialQuery}
            onAdded={() => setRefreshKey((k) => k + 1)}
          />
        </div>
      )}
      <AdminUserCollectionSearch
        userId={userId}
        initialPaints={initialPaints}
        initialTotalCount={initialTotalCount}
        initialQuery={initialQuery}
        initialPage={initialPage}
        initialSize={initialSize}
        refreshKey={refreshKey}
      />
    </>
  )
}
