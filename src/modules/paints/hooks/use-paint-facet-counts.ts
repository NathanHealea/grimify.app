'use client'

import { useEffect, useRef, useState } from 'react'

import { getPaintFacetCounts } from '@/modules/paints/actions/get-paint-facet-counts'
import type { PaintFacetCounts } from '@/modules/paints/types/paint-facet-counts'
import type { PaintFilterState } from '@/modules/paints/types/paint-filter-state'

/** Empty facet counts used as a loading fallback. */
const EMPTY_FACET_COUNTS: PaintFacetCounts = { brand: {}, type: {}, line: {} }

/**
 * Fetches per-option paint counts whenever filters change, with AbortController
 * cancellation so stale in-flight responses are discarded automatically.
 *
 * Falls back to `initialCounts` (SSR-prefetched) on the first render so the
 * popover rows always have numbers without an extra client round-trip.
 *
 * Uses strategy A (server-recompute): one round-trip per filter change. If
 * latency proves problematic, this hook can be replaced with a client-side
 * narrowing strategy without changing the caller API.
 *
 * @param params.query - Debounced search string.
 * @param params.hueIds - Active hue UUIDs.
 * @param params.filters - Current {@link PaintFilterState} from `usePaintFilters`.
 * @param params.initialCounts - SSR-prefetched facet counts shown before the
 *   first client fetch resolves.
 * @returns `{ counts, isLoading }` — counts to display and a loading flag.
 */
export function usePaintFacetCounts(params: {
  query?: string
  hueIds?: string[]
  filters: PaintFilterState
  initialCounts?: PaintFacetCounts
}): { counts: PaintFacetCounts; isLoading: boolean } {
  const { query, hueIds, filters, initialCounts } = params

  const [counts, setCounts] = useState<PaintFacetCounts>(
    initialCounts ?? EMPTY_FACET_COUNTS
  )
  const [isLoading, setIsLoading] = useState(false)

  // Track whether the initial render has happened so we don't fire a redundant fetch
  const isFirstRender = useRef(true)

  useEffect(() => {
    // Skip the very first effect run — the SSR initialCounts are already set
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    const controller = new AbortController()

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true)

    getPaintFacetCounts({
      query: query || undefined,
      hueIds,
      brandIds: filters.brandIds.length > 0 ? filters.brandIds : undefined,
      paintTypes: filters.paintTypes.length > 0 ? filters.paintTypes : undefined,
      productLineIds: filters.productLineIds.length > 0 ? filters.productLineIds : undefined,
      discontinued: filters.discontinued !== 'include' ? filters.discontinued : undefined,
      metallicOnly: filters.metallicOnly || undefined,
    })
      .then((result) => {
        if (controller.signal.aborted) return
        setCounts(result)
        setIsLoading(false)
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setIsLoading(false)
      })

    return () => controller.abort()
  }, [
    query,
    hueIds,
    filters.brandIds,
    filters.paintTypes,
    filters.productLineIds,
    filters.discontinued,
    filters.metallicOnly,
  ])

  return { counts, isLoading }
}
