'use client'

import { useEffect, useState } from 'react'

import type { PaintWithBrand } from '@/modules/paints/services/paint-service'

/**
 * Fetches paints through a caller-provided server action, discarding stale results.
 *
 * Admin surfaces can't use the browser Supabase client directly (RLS scope,
 * service-role access), so this hook delegates fetching to a stable server
 * action ref passed by the call site. Stale results are prevented with a
 * cancelled flag rather than AbortController, since server actions don't
 * accept AbortSignal.
 *
 * @param params.serverAction - Stable server action (must be wrapped in `useCallback`
 *   at call site; an unstable ref re-triggers the effect on every render).
 * @param params.query - Debounced search string.
 * @param params.hueIds - Active hue UUIDs to filter by.
 * @param params.pageSize - Number of results per page.
 * @param params.page - 1-based page number.
 * @param params.initialPaints - SSR-prefetched paints shown before the first fetch resolves.
 * @param params.initialTotalCount - SSR-prefetched total count.
 * @param params.refreshKey - Increment to force an immediate re-fetch (e.g. after a mutation).
 * @returns `{ paints, totalCount, isLoading, error }`.
 */
export function useAdminPaintSearch(params: {
  serverAction: (options: {
    query?: string
    hueIds?: string[]
    limit: number
    offset: number
  }) => Promise<{ paints: PaintWithBrand[]; count: number }>
  query?: string
  hueIds?: string[]
  pageSize: number
  page: number
  initialPaints?: PaintWithBrand[]
  initialTotalCount?: number
  refreshKey?: number
}): {
  paints: PaintWithBrand[]
  totalCount: number
  isLoading: boolean
  error: string | null
} {
  const { serverAction, query, hueIds, pageSize, page, initialPaints, initialTotalCount, refreshKey } = params

  const [paints, setPaints] = useState<PaintWithBrand[]>(initialPaints ?? [])
  const [totalCount, setTotalCount] = useState(initialTotalCount ?? 0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true)
    setError(null)

    const limit = pageSize
    const offset = (page - 1) * pageSize

    serverAction({ query, hueIds, limit, offset })
      .then(({ paints: fetched, count }) => {
        if (cancelled) return
        setPaints(fetched)
        setTotalCount(count)
        setIsLoading(false)
      })
      .catch((err: Error) => {
        if (cancelled) return
        setError(err.message)
        setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [serverAction, query, hueIds, pageSize, page, refreshKey])

  return { paints, totalCount, isLoading, error }
}
