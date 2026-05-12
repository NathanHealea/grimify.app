'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { getPaintsForCompare } from '@/modules/paints/actions/get-paints-for-compare'
import { useSearchUrlState } from '@/modules/paints/hooks/use-search-url-state'
import type { PaintWithRelationsAndHue } from '@/modules/paints/services/paint-service'
import {
  MAX_COMPARE_PAINTS,
  parseCompareParam,
  serializeCompareParam,
} from '@/modules/paints/utils/parse-compare-params'

/** State shape persisted to the `?paints=` URL parameter. */
type ComparisonUrlState = {
  paints: string[]
}

/**
 * Return shape of {@link usePaintComparisonSelection}.
 *
 * @property selectedIds - Ordered, deduplicated list of paint IDs.
 * @property paints - Hydrated paint records matching `selectedIds` order.
 *   Unknown IDs are silently dropped.
 * @property addPaint - Append a paint ID. No-op if already selected or capped.
 * @property removePaint - Remove a paint ID from the selection.
 * @property canAddMore - `true` when below {@link MAX_COMPARE_PAINTS}.
 * @property isHydrating - `true` while fetching newly-added paint records.
 */
export type PaintComparisonSelection = {
  selectedIds: string[]
  paints: PaintWithRelationsAndHue[]
  addPaint: (id: string) => void
  removePaint: (id: string) => void
  canAddMore: boolean
  isHydrating: boolean
}

/**
 * Hydration/serialization for the `?paints=` CSV parameter.
 *
 * Module-scope so the same function identity is passed to
 * {@link useSearchUrlState} on every render (its effect deps include
 * `hydrate`).
 */
function hydrate(sp: URLSearchParams): ComparisonUrlState {
  return { paints: parseCompareParam(sp.get('paints')) }
}

function serialize(state: ComparisonUrlState): URLSearchParams {
  const sp = new URLSearchParams()
  const csv = serializeCompareParam(state.paints)
  if (csv) sp.set('paints', csv)
  return sp
}

/**
 * Owns the selection state for the `/compare` page.
 *
 * Responsibilities:
 *
 * - Tracks the ordered list of selected paint IDs, mirrored to `?paints=`
 *   via {@link useSearchUrlState} with `replace`-style history (sharing
 *   the URL should not flood the back stack on every add/remove).
 * - Caches hydrated {@link PaintWithRelationsAndHue} records keyed by ID,
 *   seeded from `initialPaints` (SSR result). When the URL adds an ID not
 *   in the cache, calls the {@link getPaintsForCompare} server action to
 *   fetch the missing records.
 * - Enforces the {@link MAX_COMPARE_PAINTS} cap on `addPaint`.
 *
 * The returned `paints` array is reordered to match `selectedIds`; any IDs
 * that fail to hydrate (e.g. deleted paints) are silently dropped.
 *
 * @param params.initialPaints - SSR-fetched paint records used to seed the
 *   cache and the initial URL-driven selection.
 * @returns A {@link PaintComparisonSelection} for the explorer component.
 */
export function usePaintComparisonSelection(params: {
  initialPaints: PaintWithRelationsAndHue[]
}): PaintComparisonSelection {
  const { initialPaints } = params

  const initialIds = useMemo(
    () => initialPaints.map((p) => p.id),
    [initialPaints],
  )

  const { state, update } = useSearchUrlState<ComparisonUrlState>({
    keys: { paints: 'replace' },
    hydrate,
    serialize,
    basePath: '/compare',
    initialState: { paints: initialIds },
  })

  const selectedIds = state.paints

  // Cache of hydrated paint records, keyed by ID. Survives URL changes so we
  // only fetch newly-added IDs. Stored as an array of `[id, paint]` tuples
  // so the value identity changes after every update and downstream
  // `useMemo`s rebuild correctly.
  const [cache, setCache] = useState<Map<string, PaintWithRelationsAndHue>>(
    () => new Map(initialPaints.map((p) => [p.id, p])),
  )

  // IDs whose hydration the effect has already kicked off. Tracked as a ref
  // so re-running the effect (e.g. after a cache update) doesn't reissue
  // the same fetch — and so flipping it doesn't trigger a render.
  const inflightRef = useRef<Set<string>>(new Set())

  const missingIds = useMemo(
    () => selectedIds.filter((id) => !cache.has(id)),
    [selectedIds, cache],
  )

  useEffect(() => {
    const stillMissing = missingIds.filter((id) => !inflightRef.current.has(id))
    if (stillMissing.length === 0) return

    for (const id of stillMissing) inflightRef.current.add(id)

    let cancelled = false

    getPaintsForCompare(stillMissing)
      .then((fetched) => {
        if (cancelled) return
        setCache((prev) => {
          const next = new Map(prev)
          for (const paint of fetched) next.set(paint.id, paint)
          return next
        })
      })
      .catch(() => {
        // Swallow — selectedIds without cache entries simply won't render.
      })
      .finally(() => {
        for (const id of stillMissing) inflightRef.current.delete(id)
      })

    return () => {
      cancelled = true
    }
  }, [missingIds])

  const isHydrating = missingIds.length > 0

  const paints = useMemo(() => {
    const out: PaintWithRelationsAndHue[] = []
    for (const id of selectedIds) {
      const paint = cache.get(id)
      if (paint) out.push(paint)
    }
    return out
  }, [selectedIds, cache])

  const addPaint = useCallback(
    (id: string) => {
      if (selectedIds.includes(id)) return
      if (selectedIds.length >= MAX_COMPARE_PAINTS) return
      update({ paints: [...selectedIds, id] })
    },
    [selectedIds, update],
  )

  const removePaint = useCallback(
    (id: string) => {
      if (!selectedIds.includes(id)) return
      update({ paints: selectedIds.filter((existing) => existing !== id) })
    },
    [selectedIds, update],
  )

  const canAddMore = selectedIds.length < MAX_COMPARE_PAINTS

  return {
    selectedIds,
    paints,
    addPaint,
    removePaint,
    canAddMore,
    isHydrating,
  }
}
