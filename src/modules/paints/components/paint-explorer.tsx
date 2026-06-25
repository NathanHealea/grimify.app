'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'

import SearchInput from '@/components/search'
import { Button } from '@/components/ui/button'
import { CollectionPaintCard } from '@/modules/collection/components/collection-paint-card'
import { HueFilterBar } from '@/modules/paints/components/hue-filter-bar'
import { PaintCard } from '@/modules/paints/components/paint-card'
import { PaintFilterBar } from '@/modules/paints/components/paint-filter-bar'
import { PaintGrid } from '@/modules/paints/components/paint-grid'
import { PaintSortBar } from '@/modules/paints/components/paint-sort-bar'
import { PaginationControls } from '@/modules/paints/components/pagination-controls'
import { useDebouncedQuery } from '@/modules/paints/hooks/use-debounced-query'
import { useHueFilter } from '@/modules/paints/hooks/use-hue-filter'
import { usePaintFacetCounts } from '@/modules/paints/hooks/use-paint-facet-counts'
import { usePaintFilters } from '@/modules/paints/hooks/use-paint-filters'
import { usePaintSearch } from '@/modules/paints/hooks/use-paint-search'
import { useSearchUrlState } from '@/modules/paints/hooks/use-search-url-state'
import type { PaintWithBrand } from '@/modules/paints/services/paint-service'
import type { PaintFacetCounts } from '@/modules/paints/types/paint-facet-counts'
import {
  EMPTY_PAINT_FILTER_STATE,
  type PaintFilterState,
} from '@/modules/paints/types/paint-filter-state'
import { parseSortDir, parseSortField } from '@/modules/paints/utils/parse-sort-params'
import type { PaintSortDirection, PaintSortField } from '@/modules/paints/utils/sort-paints'
import type { Hue } from '@/types/color'

/** Available page size options for the paint explorer. */
const PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const

/** Sort field values available on the paint explorer. */
const EXPLORER_SORT_FIELDS = ['name', 'hue', 'lightness', 'contrast'] as const satisfies readonly PaintSortField[]

/** URL-synced state shape for the paint explorer. */
type ExplorerUrlState = {
  q: string
  hue: string
  brand: string
  type: string
  line: string
  disc: 'include' | 'exclude' | 'only'
  metal: '0' | '1'
  page: number
  size: number
  sort: 'name' | 'hue' | 'lightness' | 'contrast'
  dir: PaintSortDirection
}


function hydrate(sp: URLSearchParams): ExplorerUrlState {
  const sizeParam = Number(sp.get('size'))
  const size = (PAGE_SIZE_OPTIONS as readonly number[]).includes(sizeParam) ? sizeParam : 50
  const discRaw = sp.get('disc')
  const disc: ExplorerUrlState['disc'] =
    discRaw === 'exclude' || discRaw === 'only' ? discRaw : 'include'
  return {
    q: sp.get('q') ?? '',
    hue: sp.get('hue') ?? '',
    brand: sp.get('brand') ?? '',
    type: sp.get('type') ?? '',
    line: sp.get('line') ?? '',
    disc,
    metal: sp.get('metal') === '1' ? '1' : '0',
    page: Math.max(1, Number(sp.get('page') || 1)),
    size,
    sort: parseSortField(sp.get('sort')),
    dir: parseSortDir(sp.get('dir')),
  }
}

function serialize(state: ExplorerUrlState): URLSearchParams {
  const sp = new URLSearchParams()
  if (state.q) sp.set('q', state.q)
  if (state.hue) sp.set('hue', state.hue)
  if (state.brand) sp.set('brand', state.brand)
  if (state.type) sp.set('type', state.type)
  if (state.line) sp.set('line', state.line)
  if (state.disc !== 'include') sp.set('disc', state.disc)
  if (state.metal === '1') sp.set('metal', '1')
  if (state.page > 1) sp.set('page', String(state.page))
  if (state.size !== 50) sp.set('size', String(state.size))
  // Omit defaults to keep shareable URLs short
  if (state.sort !== 'name') sp.set('sort', state.sort)
  if (state.dir !== 'asc') sp.set('dir', state.dir)
  return sp
}

/** Converts a comma-separated string of numeric IDs to a number array. */
function parseIds(raw: string): number[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => !isNaN(n) && n > 0)
}

/** Converts a comma-separated string of type names to a lowercased string array. */
function parseTypes(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

/**
 * Smart container for the public paint explorer on `/paints`.
 *
 * Composes {@link useDebouncedQuery}, {@link useHueFilter}, {@link usePaintFilters},
 * {@link usePaintFacetCounts}, {@link usePaintSearch}, and {@link useSearchUrlState}
 * to manage all search, filter, sort, and pagination state.
 *
 * Renders {@link SearchInput}, {@link PaintFilterBar}, {@link PaintSortBar},
 * {@link HueFilterBar}, {@link PaintGrid}, and {@link PaginationControls}.
 *
 * URL history strategy: debounced query ticks use `replaceState` (no history
 * entry); hue, filter, sort, page, and size changes use `pushState` so Back
 * retraces committed filter and sort states.
 *
 * @param props.initialPaints - SSR-prefetched first page of paints.
 * @param props.initialTotalCount - SSR-prefetched total paint count.
 * @param props.hues - All top-level hues (server-fetched).
 * @param props.huePaintCounts - Paint count per top-level hue name (lowercased key).
 * @param props.brands - All brands available for filtering.
 * @param props.paintTypes - All distinct paint type strings.
 * @param props.productLines - All product lines (for the brand-gated line popover).
 * @param props.initialFilters - Server-parsed filter state from URL params.
 * @param props.initialFacetCounts - SSR-prefetched per-option paint counts.
 * @param props.initialQuery - Server-parsed `q` search param.
 * @param props.initialHue - Server-parsed `hue` search param.
 * @param props.initialPage - Server-parsed `page` search param.
 * @param props.initialSize - Server-parsed `size` search param.
 * @param props.initialSort - Server-parsed `sort` search param (default `'name'`).
 * @param props.initialDir - Server-parsed `dir` search param (default `'asc'`).
 * @param props.isAuthenticated - Whether the current user is signed in; shows collection toggles when true.
 * @param props.userPaintIds - Set of paint IDs already in the user's collection (used to set initial toggle state).
 */
export function PaintExplorer({
  initialPaints,
  initialTotalCount,
  hues,
  huePaintCounts,
  brands = [],
  paintTypes = [],
  productLines = [],
  initialFilters = EMPTY_PAINT_FILTER_STATE,
  initialFacetCounts,
  initialQuery = '',
  initialHue = '',
  initialPage = 1,
  initialSize = 50,
  initialSort = 'name',
  initialDir = 'asc',
  isAuthenticated = false,
  userPaintIds,
}: {
  initialPaints: PaintWithBrand[]
  initialTotalCount: number
  hues: Hue[]
  huePaintCounts: Record<string, number>
  brands?: { id: number; name: string }[]
  paintTypes?: string[]
  productLines?: { id: number; brand_id: number; name: string }[]
  initialFilters?: PaintFilterState
  initialFacetCounts?: PaintFacetCounts
  initialQuery?: string
  initialHue?: string
  initialPage?: number
  initialSize?: number
  initialSort?: 'name' | 'hue' | 'lightness' | 'contrast'
  initialDir?: PaintSortDirection
  isAuthenticated?: boolean
  userPaintIds?: Set<string>
}) {
  const { state, update } = useSearchUrlState<ExplorerUrlState>({
    keys: {
      q: 'replace',
      hue: 'push',
      brand: 'push',
      type: 'push',
      line: 'push',
      disc: 'push',
      metal: 'push',
      page: 'push',
      size: 'push',
      sort: 'push',
      dir: 'push',
    },
    hydrate,
    serialize,
    basePath: '/paints',
    initialState: {
      q: initialQuery,
      hue: initialHue,
      brand: initialFilters.brandIds.join(','),
      type: initialFilters.paintTypes.join(','),
      line: initialFilters.productLineIds.join(','),
      disc: initialFilters.discontinued,
      metal: initialFilters.metallicOnly ? '1' : '0',
      page: initialPage,
      size: initialSize,
      sort: initialSort,
      dir: initialDir,
    },
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

  // Hydrate PaintFilterState from URL state once at mount
  const hydratedInitialFilters = useMemo((): PaintFilterState => ({
    brandIds: parseIds(state.brand),
    paintTypes: parseTypes(state.type),
    productLineIds: parseIds(state.line),
    discontinued: state.disc,
    metallicOnly: state.metal === '1',
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [])

  const paintFilters = usePaintFilters({
    initial: hydratedInitialFilters,
    productLines,
  })

  const { counts: facetCounts } = usePaintFacetCounts({
    query: state.q,
    hueIds,
    filters: paintFilters.state,
    initialCounts: initialFacetCounts,
  })

  const { paints, totalCount, isLoading } = usePaintSearch({
    query: state.q,
    hueIds,
    filters: paintFilters.state,
    scope: 'all',
    pageSize: state.size,
    page: state.page,
    initialPaints,
    initialTotalCount,
    sortBy: state.sort,
    sortDir: state.dir,
  })

  const totalPages = Math.max(1, Math.ceil(totalCount / state.size))

  const handleQueryChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
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

  // --- Filter handlers ---

  const handleToggleBrand = useCallback(
    (id: number) => {
      paintFilters.toggleBrand(id)
      // Re-derive after toggle and push to URL; use functional approach to read state
      // The URL update is done via a separate effect below that syncs paintFilters.state
    },
    [paintFilters]
  )

  const handleTogglePaintType = useCallback(
    (name: string) => {
      paintFilters.togglePaintType(name)
    },
    [paintFilters]
  )

  const handleToggleProductLine = useCallback(
    (id: number) => {
      paintFilters.toggleProductLine(id)
    },
    [paintFilters]
  )

  const handleCycleDiscontinued = useCallback(() => {
    paintFilters.cycleDiscontinued()
  }, [paintFilters])

  const handleToggleMetallicOnly = useCallback(() => {
    paintFilters.toggleMetallicOnly()
  }, [paintFilters])

  const handleRemoveFilter = useCallback(
    (kind: 'brand' | 'type' | 'line' | 'disc' | 'metal', value?: string | number) => {
      if (kind === 'brand' && typeof value === 'number') {
        paintFilters.toggleBrand(value)
      } else if (kind === 'type' && typeof value === 'string') {
        paintFilters.togglePaintType(value)
      } else if (kind === 'line' && typeof value === 'number') {
        paintFilters.toggleProductLine(value)
      } else if (kind === 'disc') {
        // Reset discontinued to include
        paintFilters.setState({ ...paintFilters.state, discontinued: 'include' })
      } else if (kind === 'metal') {
        paintFilters.setState({ ...paintFilters.state, metallicOnly: false })
      }
    },
    [paintFilters]
  )

  // Sync paintFilters.state back to the URL whenever it changes
  useEffect(() => {
    const { brandIds, paintTypes: types, productLineIds, discontinued, metallicOnly } =
      paintFilters.state
    update(
      {
        brand: brandIds.join(','),
        type: types.join(','),
        line: productLineIds.join(','),
        disc: discontinued,
        metal: metallicOnly ? '1' : '0',
        page: 1,
      },
      { commit: true }
    )
    // update is stable; intentionally only re-run when filter state changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    paintFilters.state.brandIds,
    paintFilters.state.paintTypes,
    paintFilters.state.productLineIds,
    paintFilters.state.discontinued,
    paintFilters.state.metallicOnly,
  ])


  const handleSortChange = useCallback(
    (sort: PaintSortField, dir: PaintSortDirection) => {
      update({ sort: sort as 'name' | 'hue' | 'lightness' | 'contrast', dir, page: 1 }, { commit: true })
    },
    [update]
  )

  const handleClearAll = useCallback(() => {
    setRawQuery('')
    setPopstateKey((k) => k + 1)
    hueFilter.clear()
    paintFilters.clear()
    update(
      {
        q: '',
        hue: '',
        brand: '',
        type: '',
        line: '',
        disc: 'include',
        metal: '0',
        sort: 'name',
        dir: 'asc',
        page: 1,
      },
      { commit: true }
    )
  }, [hueFilter, paintFilters, update])

  const handlePageChange = useCallback(
    (page: number) => update({ page }, { commit: true }),
    [update]
  )

  const handleSizeChange = useCallback(
    (size: number) => update({ size, page: 1 }, { commit: true }),
    [update]
  )

  const hasActiveFilters =
    !!rawQuery ||
    !!hueFilter.selectedParent ||
    paintFilters.state.brandIds.length > 0 ||
    paintFilters.state.paintTypes.length > 0 ||
    paintFilters.state.productLineIds.length > 0 ||
    paintFilters.state.discontinued !== 'include' ||
    paintFilters.state.metallicOnly ||
    state.sort !== 'name' ||
    state.dir !== 'asc'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <SearchInput
            key={popstateKey}
            defaultValue={rawQuery}
            onChange={handleQueryChange}
          />
        </div>
        <PaintSortBar
          fields={EXPLORER_SORT_FIELDS}
          field={state.sort}
          direction={state.dir}
          onChange={handleSortChange}
        />
        {hasActiveFilters && (
          <Button onClick={handleClearAll} className="btn-ghost shrink-0">
            Clear All
          </Button>
        )}
      </div>

      <PaintFilterBar
        state={paintFilters.state}
        counts={facetCounts}
        brands={brands}
        paintTypes={paintTypes}
        productLines={productLines}
        onToggleBrand={handleToggleBrand}
        onTogglePaintType={handleTogglePaintType}
        onToggleProductLine={handleToggleProductLine}
        onCycleDiscontinued={handleCycleDiscontinued}
        onToggleMetallicOnly={handleToggleMetallicOnly}
        onRemoveFilter={handleRemoveFilter}
      />

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

      {paints.length === 0 && !isLoading ? (
        <div className="flex flex-col items-start gap-2">
          <p className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            No paints match the current filters.
          </p>
          {hasActiveFilters && (
            <Button type="button" onClick={handleClearAll} className="btn-ghost btn-sm">
              Clear all filters
            </Button>
          )}
        </div>
      ) : (
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
                size="lg"
                  id={paint.id}
                  name={paint.name}
                  hex={paint.hex}
                  brand={paint.product_lines?.brands?.name}
                  paintType={paint.paint_type}
                  isDiscontinued={paint.is_discontinued}
                />
              )
            }
          />
        </div>
      )}

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
