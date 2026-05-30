'use client'

import { useEffect, useState } from 'react'

import { searchPaints } from '@/modules/paints/actions/search-paints'
import type { PaintWithBrand } from '@/modules/paints/services/paint-service'
import type { PaintFilterState } from '@/modules/paints/types/paint-filter-state'

/**
 * Fetches paints via `searchPaintsUnified` with AbortController cancellation.
 *
 * Stale in-flight responses are discarded automatically so the grid never
 * shows results from a superseded query. This is the "no-flash" guarantee.
 *
 * @param params.query - Debounced search string.
 * @param params.hueIds - Active hue UUIDs (one for child, many for parent group).
 * @param params.filters - Active dimension filters from {@link usePaintFilters}.
 * @param params.scope - Collection scope — `'all'` or `{ type: 'userCollection', userId }`.
 * @param params.pageSize - Number of results per page.
 * @param params.page - 1-based page number.
 * @param params.initialPaints - SSR-prefetched paints shown before the first fetch resolves.
 * @param params.initialTotalCount - SSR-prefetched total count.
 * @returns `{ paints, totalCount, isLoading, error }`.
 */
export function usePaintSearch(params: {
  query?: string
  hueIds?: string[]
  filters?: PaintFilterState
  scope?: 'all' | { type: 'userCollection'; userId: string }
  pageSize: number
  page: number
  initialPaints?: PaintWithBrand[]
  initialTotalCount?: number
}): {
  paints: PaintWithBrand[]
  totalCount: number
  isLoading: boolean
  error: string | null
} {
  const { query, hueIds, filters, scope, pageSize, page, initialPaints, initialTotalCount } = params

  const [paints, setPaints] = useState<PaintWithBrand[]>(initialPaints ?? [])
  const [totalCount, setTotalCount] = useState(initialTotalCount ?? 0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true)
    setError(null)

    const limit = pageSize
    const offset = (page - 1) * pageSize

    searchPaints({
      query,
      hueIds,
      brandIds: filters?.brandIds && filters.brandIds.length > 0 ? filters.brandIds : undefined,
      paintTypes: filters?.paintTypes && filters.paintTypes.length > 0 ? filters.paintTypes : undefined,
      productLineIds:
        filters?.productLineIds && filters.productLineIds.length > 0
          ? filters.productLineIds
          : undefined,
      discontinued: filters?.discontinued !== 'include' ? filters?.discontinued : undefined,
      metallicOnly: filters?.metallicOnly || undefined,
      limit,
      offset,
    })
      .then(({ paints: fetched, count }) => {
        if (signal.aborted) return
        setPaints(fetched)
        setTotalCount(count)
        setIsLoading(false)
      })
      .catch((err: Error) => {
        if (signal.aborted) return
        setError(err.message)
        setIsLoading(false)
      })

    return () => controller.abort()
  }, [
    query,
    hueIds,
    filters?.brandIds,
    filters?.paintTypes,
    filters?.productLineIds,
    filters?.discontinued,
    filters?.metallicOnly,
    scope,
    pageSize,
    page,
  ])

  return { paints, totalCount, isLoading, error }
}
