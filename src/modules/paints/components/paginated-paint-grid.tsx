'use client'

import { useCallback, useMemo, useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'

import { CollectionPaintCard } from '@/modules/collection/components/collection-paint-card'
import { PaintCard } from '@/modules/paints/components/paint-card'
import { getPaintService } from '@/modules/paints/services/paint-service.client'
import type { PaintWithBrand } from '@/modules/paints/services/paint-service'

/** Available page size options. */
const PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const

/** Default page size. */
const DEFAULT_PAGE_SIZE = 50

/** Maximum number of page buttons to show at once. */
const MAX_VISIBLE_PAGES = 7

/**
 * A client-side paginated grid of paint cards with configurable page size.
 *
 * Syncs page and size to URL search params (`?page=N&size=M`) so the
 * current view is shareable. Fetches pages asynchronously via the browser
 * Supabase client without a full page reload.
 *
 * When `isAuthenticated` is true and `userPaintIds` is provided, renders
 * {@link CollectionPaintCard} with the initial collection state. Newly-fetched
 * pages default to `isInCollection=false` — clicking the toggle still works
 * correctly via server actions.
 *
 * @param props.initialPaints - First page of paints (server-rendered).
 * @param props.totalCount - Total number of paints in the database.
 * @param props.basePath - URL path prefix for pagination links (e.g., "/paints" or "/hues/abc").
 * @param props.fetchPaints - Optional custom fetch function. Defaults to fetching all paints.
 * @param props.userPaintIds - Set of paint IDs in the current user's collection.
 * @param props.isAuthenticated - Whether the current user is signed in.
 */
export function PaginatedPaintGrid({
  initialPaints,
  totalCount,
  basePath = '/paints',
  fetchPaints,
  userPaintIds,
  isAuthenticated = false,
}: {
  initialPaints: PaintWithBrand[]
  totalCount: number
  basePath?: string
  fetchPaints?: (options: { limit: number; offset: number }) => Promise<PaintWithBrand[]>
  userPaintIds?: Set<string>
  isAuthenticated?: boolean
}) {
  const searchParams = useSearchParams()

  const initialPage = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1)
  const initialSize = PAGE_SIZE_OPTIONS.includes(
    parseInt(searchParams.get('size') ?? '', 10) as (typeof PAGE_SIZE_OPTIONS)[number]
  )
    ? (parseInt(searchParams.get('size')!, 10) as (typeof PAGE_SIZE_OPTIONS)[number])
    : DEFAULT_PAGE_SIZE

  const [paints, setPaints] = useState<PaintWithBrand[]>(initialPaints)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [pageSize, setPageSize] = useState<number>(initialSize)
  const [isPending, startTransition] = useTransition()

  // Reset internal state when the parent provides new filtered data.
  // Uses the "store previous props in state" pattern recommended by React
  // to derive state during render instead of calling setState in an effect.
  const [prevInitialPaints, setPrevInitialPaints] = useState(initialPaints)
  if (prevInitialPaints !== initialPaints) {
    setPrevInitialPaints(initialPaints)
    setPaints(initialPaints)
    setCurrentPage(1)
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  const updateUrl = useCallback(
    (page: number, size: number) => {
      const params = new URLSearchParams(window.location.search)
      if (page > 1) {
        params.set('page', String(page))
      } else {
        params.delete('page')
      }
      if (size !== DEFAULT_PAGE_SIZE) {
        params.set('size', String(size))
      } else {
        params.delete('size')
      }
      const qs = params.toString()
      window.history.replaceState(null, '', qs ? `${basePath}?${qs}` : basePath)
    },
    [basePath]
  )

  const fetchPage = useCallback(
    (page: number, size?: number) => {
      const effectiveSize = size ?? pageSize
      startTransition(async () => {
        const offset = (page - 1) * effectiveSize
        let data: PaintWithBrand[]
        if (fetchPaints) {
          data = await fetchPaints({ limit: effectiveSize, offset })
        } else {
          const paintService = getPaintService()
          data = await paintService.getAllPaints({ limit: effectiveSize, offset })
        }
        setPaints(data)
        setCurrentPage(page)
        if (size !== undefined) setPageSize(size)
        updateUrl(page, effectiveSize)
      })
    },
    [fetchPaints, pageSize, updateUrl]
  )

  const handleSizeChange = useCallback(
    (newSize: number) => {
      fetchPage(1, newSize)
    },
    [fetchPage]
  )

  const visiblePages = useMemo(() => {
    if (totalPages <= MAX_VISIBLE_PAGES) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const pages: (number | null)[] = []
    const half = Math.floor(MAX_VISIBLE_PAGES / 2)
    let start = Math.max(2, currentPage - half)
    let end = Math.min(totalPages - 1, currentPage + half)

    if (currentPage <= half + 1) {
      end = MAX_VISIBLE_PAGES - 1
    }
    if (currentPage >= totalPages - half) {
      start = totalPages - MAX_VISIBLE_PAGES + 2
    }

    pages.push(1)
    if (start > 2) pages.push(null)
    for (let i = start; i <= end; i++) pages.push(i)
    if (end < totalPages - 1) pages.push(null)
    pages.push(totalPages)

    return pages
  }, [currentPage, totalPages])

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {((currentPage - 1) * pageSize + 1).toLocaleString()}–{Math.min(currentPage * pageSize, totalCount).toLocaleString()} of {totalCount.toLocaleString()}
        </p>
        <div className="flex items-center gap-2">
          <label htmlFor="page-size" className="text-sm text-muted-foreground">
            Per page:
          </label>
          <select
            id="page-size"
            value={pageSize}
            onChange={(e) => handleSizeChange(Number(e.target.value))}
            disabled={isPending}
            className="input input-sm w-20"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={isPending ? 'opacity-50 transition-opacity' : ''}>
        {paints.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {paints.map((paint) =>
              isAuthenticated ? (
                <CollectionPaintCard
                  key={paint.id}
                  id={paint.id}
                  name={paint.name}
                  hex={paint.hex}
                  brand={paint.product_lines.brands.name}
                  paintType={paint.paint_type}
                  isInCollection={userPaintIds?.has(paint.id) ?? false}
                  isAuthenticated={isAuthenticated}
                  revalidatePath={basePath}
                />
              ) : (
                <PaintCard key={paint.id} id={paint.id} name={paint.name} hex={paint.hex} brand={paint.product_lines.brands.name} paintType={paint.paint_type} />
              )
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No paints available.</p>
        )}
      </div>

      {totalPages > 1 && (
        <nav className="mt-8 flex flex-wrap items-center justify-center gap-1" aria-label="Pagination">
          <button
            onClick={() => fetchPage(currentPage - 1)}
            disabled={currentPage <= 1 || isPending}
            className="btn btn-outline btn-sm disabled:opacity-40"
          >
            Previous
          </button>

          {visiblePages.map((page, i) =>
            page === null ? (
              <span key={`ellipsis-${i}`} className="px-1 text-sm text-muted-foreground">
                &hellip;
              </span>
            ) : (
              <button
                key={page}
                onClick={() => fetchPage(page)}
                disabled={isPending}
                className={
                  page === currentPage
                    ? 'btn btn-primary btn-sm'
                    : 'btn btn-ghost btn-sm'
                }
                aria-current={page === currentPage ? 'page' : undefined}
              >
                {page}
              </button>
            )
          )}

          <button
            onClick={() => fetchPage(currentPage + 1)}
            disabled={currentPage >= totalPages || isPending}
            className="btn btn-outline btn-sm disabled:opacity-40"
          >
            Next
          </button>
        </nav>
      )}
    </div>
  )
}
