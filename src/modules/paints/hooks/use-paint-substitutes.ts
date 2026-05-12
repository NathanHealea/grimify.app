'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'

import { findPaintMatches } from '@/modules/paints/actions/find-paint-matches'
import type { PaintMatch } from '@/modules/paints/types/paint-match'

/** Default number of substitutes returned when the caller does not override. */
const DEFAULT_SUBSTITUTE_LIMIT = 5

/**
 * Return shape of {@link usePaintSubstitutes}.
 *
 * @property matches - Current substitutes, ordered by ΔE ascending.
 * @property selectedBrandIds - Brand IDs the user has restricted to;
 *   empty array means "all brands".
 * @property setSelectedBrandIds - Replaces the brand filter and refetches.
 * @property isPending - `true` while a fetch is in flight.
 * @property error - Last error thrown by the action, or `null`.
 */
export type UsePaintSubstitutesResult = {
  matches: PaintMatch[]
  selectedBrandIds: string[]
  setSelectedBrandIds: (ids: string[]) => void
  isPending: boolean
  error: Error | null
}

/**
 * Hook: fetches cross-brand substitutes for a discontinued paint and
 * exposes a brand-filter for narrowing the candidate pool.
 *
 * Internally calls {@link findPaintMatches} with `excludeDiscontinued: true`
 * and the caller's optional `brandIds`. Drives `isPending` via
 * `useTransition`. When `initialMatches` is provided **and** the brand
 * filter is empty, the initial fetch is skipped — used by the
 * `/discontinued` SSR pre-resolution path.
 *
 * @param params.sourcePaintId - UUID of the discontinued paint we are
 *   substituting for.
 * @param params.defaultLimit - Maximum substitutes per request. Defaults
 *   to {@link DEFAULT_SUBSTITUTE_LIMIT}.
 * @param params.initialMatches - Optional seeded matches; lets SSR skip the
 *   first client fetch.
 * @returns A {@link UsePaintSubstitutesResult}.
 */
export function usePaintSubstitutes(params: {
  sourcePaintId: string
  defaultLimit?: number
  initialMatches?: PaintMatch[]
}): UsePaintSubstitutesResult {
  const {
    sourcePaintId,
    defaultLimit = DEFAULT_SUBSTITUTE_LIMIT,
    initialMatches,
  } = params

  const [matches, setMatches] = useState<PaintMatch[]>(initialMatches ?? [])
  const [selectedBrandIds, setSelectedBrandIdsState] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<Error | null>(null)

  // Tracks whether we've performed at least one fetch. Initial render with
  // seeded matches and empty filter is the "already fetched" case.
  const hasFetchedRef = useRef(initialMatches !== undefined)

  const fetchMatches = useCallback(
    (brandIds: string[]) => {
      startTransition(async () => {
        setError(null)
        try {
          const fetched = await findPaintMatches(sourcePaintId, {
            excludeDiscontinued: true,
            excludeSamePaint: true,
            excludeSameBrand: false,
            brandIds: brandIds.length > 0 ? brandIds : undefined,
            limit: defaultLimit,
          })
          setMatches(fetched)
        } catch (err) {
          const wrapped =
            err instanceof Error ? err : new Error('Failed to load substitutes')
          setError(wrapped)
        }
      })
    },
    [sourcePaintId, defaultLimit],
  )

  // Initial fetch (only when no seed was provided or the source paint changes).
  // Deferred to a microtask so the effect body itself doesn't synchronously
  // trigger setState — `startTransition` queues `isPending`, and React's
  // "no-setState-in-effect" lint rule treats that as an effect-body update.
  useEffect(() => {
    if (hasFetchedRef.current) return
    hasFetchedRef.current = true
    let cancelled = false
    Promise.resolve().then(() => {
      if (cancelled) return
      fetchMatches([])
    })
    return () => {
      cancelled = true
    }
  }, [fetchMatches])

  const setSelectedBrandIds = useCallback(
    (ids: string[]) => {
      setSelectedBrandIdsState(ids)
      fetchMatches(ids)
    },
    [fetchMatches],
  )

  return {
    matches,
    selectedBrandIds,
    setSelectedBrandIds,
    isPending,
    error,
  }
}
