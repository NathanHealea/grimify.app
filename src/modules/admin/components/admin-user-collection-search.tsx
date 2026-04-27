'use client'

import { useCallback, useEffect, useState } from 'react'

import SearchInput from '@/components/search'
import { searchUserCollectionAction } from '@/modules/admin/actions/search-user-collection'
import { AdminCollectionPaintCard } from '@/modules/admin/components/admin-collection-paint-card'
import { useAdminPaintSearch } from '@/modules/admin/hooks/use-admin-paint-search'
import { PaintGrid } from '@/modules/paints/components/paint-grid'
import { PaginationControls } from '@/modules/paints/components/pagination-controls'
import { useDebouncedQuery } from '@/modules/paints/hooks/use-debounced-query'
import { useSearchUrlState } from '@/modules/paints/hooks/use-search-url-state'
import type { PaintWithBrand } from '@/modules/paints/services/paint-service'

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200]
const DEFAULT_PAGE_SIZE = 25

/** Per-key history strategy. Defined outside the component for referential stability. */
const URL_KEYS = { q: 'replace', page: 'push', size: 'push' } as const

function hydrateState(sp: URLSearchParams) {
  return {
    q: sp.get('q') ?? '',
    page: Math.max(1, Number(sp.get('page') ?? '1')),
    size: PAGE_SIZE_OPTIONS.includes(Number(sp.get('size')))
      ? Number(sp.get('size'))
      : DEFAULT_PAGE_SIZE,
  }
}

function serializeState(state: { q: string; page: number; size: number }) {
  const sp = new URLSearchParams()
  if (state.q) sp.set('q', state.q)
  if (state.page > 1) sp.set('page', String(state.page))
  if (state.size !== DEFAULT_PAGE_SIZE) sp.set('size', String(state.size))
  return sp
}

/**
 * Smart container for the admin user-collection search surface.
 *
 * Composes {@link useDebouncedQuery}, {@link useSearchUrlState}, and
 * {@link useAdminPaintSearch} to deliver server-side pagination over a
 * target user's paint collection. Renders {@link PaintGrid} with
 * {@link AdminCollectionPaintCard} cards (which expose a remove action)
 * and {@link PaginationControls}.
 *
 * URL state (`q`, `page`, `size`) is synced via the hybrid history strategy:
 * debounced query updates use `replaceState`; page and size changes use
 * `pushState` so Back retraces committed navigation.
 *
 * @param props.userId - UUID of the target user whose collection is displayed.
 * @param props.initialPaints - SSR-prefetched first page of paints.
 * @param props.initialTotalCount - SSR-prefetched total collection count.
 * @param props.initialQuery - Pre-filled query string from the URL search params.
 * @param props.initialPage - Pre-filled page number from the URL search params.
 * @param props.initialSize - Pre-filled page size from the URL search params.
 * @param props.refreshKey - Increment to trigger an immediate re-fetch (e.g. after a paint is added).
 */
export function AdminUserCollectionSearch({
  userId,
  initialPaints,
  initialTotalCount,
  initialQuery = '',
  initialPage = 1,
  initialSize = DEFAULT_PAGE_SIZE,
  refreshKey = 0,
}: {
  userId: string
  initialPaints: PaintWithBrand[]
  initialTotalCount: number
  initialQuery?: string
  initialPage?: number
  initialSize?: number
  refreshKey?: number
}) {
  const basePath = `/admin/users/${userId}/collection`

  const { state, update } = useSearchUrlState({
    keys: URL_KEYS,
    hydrate: hydrateState,
    serialize: serializeState,
    basePath,
    initialState: { q: initialQuery, page: initialPage, size: initialSize },
  })

  const [inputValue, setInputValue] = useState(initialQuery)
  const debouncedQuery = useDebouncedQuery(inputValue, { delay: 250, minChars: 1 })

  // Sync debounced query to URL and reset to page 1 on new search
  useEffect(() => {
    update({ q: debouncedQuery, page: 1 }, { commit: false })
  }, [debouncedQuery, update])

  const searchAction = useCallback(
    (options: { query?: string; hueIds?: string[]; limit: number; offset: number }) =>
      searchUserCollectionAction(userId, options),
    [userId]
  )

  const { paints, totalCount, isLoading } = useAdminPaintSearch({
    serverAction: searchAction,
    query: state.q || undefined,
    pageSize: state.size,
    page: state.page,
    initialPaints,
    initialTotalCount,
    refreshKey,
  })

  const totalPages = Math.max(1, Math.ceil(totalCount / state.size))

  return (
    <div className="space-y-4">
      <SearchInput
        placeholder="Search collection by name, brand, or type…"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
      />

      <PaintGrid
        paints={paints}
        renderCard={(paint) => (
          <AdminCollectionPaintCard
            userId={userId}
            id={paint.id}
            name={paint.name}
            hex={paint.hex}
            brand={paint.product_lines.brands.name}
            paintType={paint.paint_type}
          />
        )}
      />

      <PaginationControls
        currentPage={state.page}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={state.size}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        isPending={isLoading}
        onPageChange={(n) => update({ page: n }, { commit: true })}
        onSizeChange={(n) => update({ size: n, page: 1 }, { commit: true })}
      />
    </div>
  )
}
