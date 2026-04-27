'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import SearchInput from '@/components/search'
import { CollectionPaintCard } from '@/modules/collection/components/collection-paint-card'
import { HueFilterBar } from '@/modules/paints/components/hue-filter-bar'
import { PaintCard } from '@/modules/paints/components/paint-card'
import { PaintGrid } from '@/modules/paints/components/paint-grid'
import { PaginationControls } from '@/modules/paints/components/pagination-controls'
import { useDebouncedQuery } from '@/modules/paints/hooks/use-debounced-query'
import { useHueFilter } from '@/modules/paints/hooks/use-hue-filter'
import { usePaintSearch } from '@/modules/paints/hooks/use-paint-search'
import { useSearchUrlState } from '@/modules/paints/hooks/use-search-url-state'
import type { PaintWithBrand } from '@/modules/paints/services/paint-service'
import type { Hue } from '@/types/color'

/** Available page size options for the paint explorer. */
const PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const

/** URL-synced state shape for the paint explorer. */
type ExplorerUrlState = {
  q: string
  hue: string
  page: number
  size: number
}

function hydrate(sp: URLSearchParams): ExplorerUrlState {
  const sizeParam = Number(sp.get('size'))
  const size = (PAGE_SIZE_OPTIONS as readonly number[]).includes(sizeParam) ? sizeParam : 50
  return {
    q: sp.get('q') ?? '',
    hue: sp.get('hue') ?? '',
    page: Math.max(1, Number(sp.get('page') || 1)),
    size,
  }
}

function serialize(state: ExplorerUrlState): URLSearchParams {
  const sp = new URLSearchParams()
  if (state.q) sp.set('q', state.q)
  if (state.hue) sp.set('hue', state.hue)
  if (state.page > 1) sp.set('page', String(state.page))
  if (state.size !== 50) sp.set('size', String(state.size))
  return sp
}

/**
 * Smart container for the public paint explorer on `/paints`.
 *
 * Composes {@link useDebouncedQuery}, {@link useHueFilter}, {@link usePaintSearch},
 * and {@link useSearchUrlState} to manage all search, filter, and pagination state.
 * Renders {@link SearchInput}, {@link HueFilterBar}, {@link PaintGrid}, and
 * {@link PaginationControls}.
 *
 * URL history strategy: debounced query ticks use `replaceState` (no history
 * entry); hue, page, and size changes use `pushState` so Back retraces
 * committed filter states.
 *
 * @param props.initialPaints - SSR-prefetched first page of paints.
 * @param props.initialTotalCount - SSR-prefetched total paint count.
 * @param props.hues - All top-level hues (server-fetched).
 * @param props.huePaintCounts - Paint count per top-level hue name (lowercased key).
 * @param props.initialQuery - Server-parsed `q` search param (prevents hydration mismatch).
 * @param props.initialHue - Server-parsed `hue` search param.
 * @param props.initialPage - Server-parsed `page` search param.
 * @param props.initialSize - Server-parsed `size` search param.
 * @param props.isAuthenticated - Whether the current user is signed in; shows collection toggles when true.
 * @param props.userPaintIds - Set of paint IDs already in the user's collection (used to set initial toggle state).
 */
export function PaintExplorer({
  initialPaints,
  initialTotalCount,
  hues,
  huePaintCounts,
  initialQuery = '',
  initialHue = '',
  initialPage = 1,
  initialSize = 50,
  isAuthenticated = false,
  userPaintIds,
}: {
  initialPaints: PaintWithBrand[]
  initialTotalCount: number
  hues: Hue[]
  huePaintCounts: Record<string, number>
  initialQuery?: string
  initialHue?: string
  initialPage?: number
  initialSize?: number
  isAuthenticated?: boolean
  userPaintIds?: Set<string>
}) {
  const { state, update } = useSearchUrlState<ExplorerUrlState>({
    keys: { q: 'replace', hue: 'push', page: 'push', size: 'push' },
    hydrate,
    serialize,
    basePath: '/paints',
    initialState: { q: initialQuery, hue: initialHue, page: initialPage, size: initialSize },
  })

  // rawQuery tracks the live input value independently from the debounced URL state
  const [rawQuery, setRawQuery] = useState(state.q)

  // Increment key forces SearchInput to remount with the restored value on Back/Forward
  const [popstateKey, setPopstateKey] = useState(0)

  useEffect(() => {
    function onPop() {
      const sp = new URLSearchParams(window.location.search)
      setRawQuery(sp.get('q') ?? '')
      setPopstateKey((k) => k + 1)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const debouncedQuery = useDebouncedQuery(rawQuery, { delay: 300, minChars: 3 })

  // Push settled debounced query to URL — always replaceState (no history entry)
  useEffect(() => {
    update({ q: debouncedQuery, page: 1 }, { commit: false })
    // update is stable; only re-run when debouncedQuery settles
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery])

  // Parse hue param ("parent" or "parent,child") for useHueFilter initialization.
  // Memoized without state.hue dependency: hue filter owns its own state after mount.
  const [initialParentName, initialChildName] = useMemo(() => {
    const parts = state.hue.split(',').map((s) => s.trim().toLowerCase())
    return [parts[0] || null, parts[1] || null]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const hueFilter = useHueFilter({ hues, initialParentName, initialChildName })

  // Derive hueIds for usePaintSearch.
  // Child selected → [childId]. Parent selected (with children loaded) → all child IDs.
  // While children are still loading, falls back to undefined to avoid a wrong full-set fetch.
  const hueIds = useMemo((): string[] | undefined => {
    if (hueFilter.selectedChildId) return [hueFilter.selectedChildId]
    if (hueFilter.selectedParentId && hueFilter.childHues.length > 0) {
      return hueFilter.childHues.map((h) => h.id)
    }
    return undefined
  }, [hueFilter.selectedChildId, hueFilter.selectedParentId, hueFilter.childHues])

  const { paints, totalCount, isLoading } = usePaintSearch({
    query: state.q,
    hueIds,
    scope: 'all',
    pageSize: state.size,
    page: state.page,
    initialPaints,
    initialTotalCount,
  })

  const totalPages = Math.max(1, Math.ceil(totalCount / state.size))

  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRawQuery(e.target.value)
  }, [])

  const handleSelectParent = useCallback(
    (name: string) => {
      const isDeselecting = hueFilter.selectedParent?.name.toLowerCase() === name
      hueFilter.selectParent(name)
      update({ hue: isDeselecting ? '' : name, page: 1 }, { commit: true })
    },
    [hueFilter, update]
  )

  const handleSelectChild = useCallback(
    (name: string) => {
      const isDeselecting = hueFilter.selectedChild?.name.toLowerCase() === name
      hueFilter.selectChild(name)
      const parentName = hueFilter.selectedParent?.name.toLowerCase() ?? ''
      const newHue = isDeselecting ? parentName : `${parentName},${name}`
      update({ hue: newHue, page: 1 }, { commit: true })
    },
    [hueFilter, update]
  )

  const handleClearAll = useCallback(() => {
    setRawQuery('')
    setPopstateKey((k) => k + 1)
    hueFilter.clear()
    update({ q: '', hue: '', page: 1 }, { commit: true })
  }, [hueFilter, update])

  const handlePageChange = useCallback(
    (page: number) => update({ page }, { commit: true }),
    [update]
  )

  const handleSizeChange = useCallback(
    (size: number) => update({ size, page: 1 }, { commit: true }),
    [update]
  )

  const hasActiveFilters = !!rawQuery || !!hueFilter.selectedParent

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <SearchInput
            key={popstateKey}
            defaultValue={rawQuery}
            onChange={handleQueryChange}
          />
        </div>
        {hasActiveFilters && (
          <button onClick={handleClearAll} className="btn btn-ghost shrink-0">
            Clear All
          </button>
        )}
      </div>

      <HueFilterBar
        hues={hues}
        huePaintCounts={huePaintCounts}
        childHues={hueFilter.childHues}
        childHuePaintCounts={hueFilter.childHuePaintCounts}
        selectedParentName={hueFilter.selectedParent?.name.toLowerCase() ?? null}
        selectedChildName={hueFilter.selectedChild?.name.toLowerCase() ?? null}
        onSelectParent={handleSelectParent}
        onSelectChild={handleSelectChild}
      />

      <div className={isLoading ? 'opacity-50 transition-opacity' : ''}>
        <PaintGrid
          paints={paints}
          renderCard={(paint) =>
            isAuthenticated ? (
              <CollectionPaintCard
                id={paint.id}
                name={paint.name}
                hex={paint.hex}
                brand={paint.product_lines?.brands?.name}
                paintType={paint.paint_type}
                isInCollection={userPaintIds?.has(paint.id) ?? false}
                isAuthenticated
                revalidatePath="/paints"
              />
            ) : (
              <PaintCard
                id={paint.id}
                name={paint.name}
                hex={paint.hex}
                brand={paint.product_lines?.brands?.name}
                paintType={paint.paint_type}
              />
            )
          }
        />
      </div>

      <PaginationControls
        currentPage={state.page}
        totalPages={totalPages}
        pageSize={state.size}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        totalCount={totalCount}
        isPending={isLoading}
        onPageChange={handlePageChange}
        onSizeChange={handleSizeChange}
      />
    </div>
  )
}
