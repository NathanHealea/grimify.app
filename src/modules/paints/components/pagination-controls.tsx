import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/** Maximum number of page buttons to show at once (includes first + last). */
const MAX_VISIBLE_PAGES = 7

/**
 * Dumb pagination UI with page number buttons and a page-size selector.
 *
 * Calls `onPageChange` and `onSizeChange` to notify the parent of user
 * interactions — no URL reads or writes happen here.
 *
 * @param props.currentPage - The active 1-based page number.
 * @param props.totalPages - Total number of pages.
 * @param props.pageSize - Currently selected page size.
 * @param props.pageSizeOptions - Available page size choices.
 * @param props.totalCount - Total number of results (for the "Showing X–Y of Z" label).
 * @param props.isPending - When true, disables controls and applies loading opacity.
 * @param props.onPageChange - Called with the new 1-based page number.
 * @param props.onSizeChange - Called with the new page size.
 */
export function PaginationControls({
  currentPage,
  totalPages,
  pageSize,
  pageSizeOptions,
  totalCount,
  isPending,
  onPageChange,
  onSizeChange,
}: {
  currentPage: number
  totalPages: number
  pageSize: number
  pageSizeOptions: readonly number[]
  totalCount: number
  isPending: boolean
  onPageChange: (page: number) => void
  onSizeChange: (size: number) => void
}) {
  const rangeStart = (currentPage - 1) * pageSize + 1
  const rangeEnd = Math.min(currentPage * pageSize, totalCount)

  const visiblePages = buildVisiblePages(currentPage, totalPages)

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {rangeStart.toLocaleString()}–{rangeEnd.toLocaleString()} of{' '}
          {totalCount.toLocaleString()}
        </p>
        <div className="flex items-center gap-2">
          <label htmlFor="page-size-select" className="text-sm text-muted-foreground">
            Per page:
          </label>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => onSizeChange(Number(v))}
            disabled={isPending}
          >
            <SelectTrigger
              id="page-size-select"
              className="select-trigger-sm w-20"
            >
              <SelectValue>{pageSize}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {totalPages > 1 && (
        <nav
          className="flex flex-wrap items-center justify-center gap-1"
          aria-label="Pagination"
        >
          <button
            onClick={() => onPageChange(currentPage - 1)}
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
                onClick={() => onPageChange(page)}
                disabled={isPending}
                className={
                  page === currentPage ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'
                }
                aria-current={page === currentPage ? 'page' : undefined}
              >
                {page}
              </button>
            )
          )}

          <button
            onClick={() => onPageChange(currentPage + 1)}
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

/** Builds the page number list with `null` sentinels for ellipsis gaps. */
function buildVisiblePages(currentPage: number, totalPages: number): (number | null)[] {
  if (totalPages <= MAX_VISIBLE_PAGES) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const pages: (number | null)[] = []
  const half = Math.floor(MAX_VISIBLE_PAGES / 2)
  let start = Math.max(2, currentPage - half)
  let end = Math.min(totalPages - 1, currentPage + half)

  if (currentPage <= half + 1) end = MAX_VISIBLE_PAGES - 1
  if (currentPage >= totalPages - half) start = totalPages - MAX_VISIBLE_PAGES + 2

  pages.push(1)
  if (start > 2) pages.push(null)
  for (let i = start; i <= end; i++) pages.push(i)
  if (end < totalPages - 1) pages.push(null)
  pages.push(totalPages)

  return pages
}
