'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

import { PaginationControls } from '@/modules/paints/components/pagination-controls'

/** Valid page sizes for the public recipe browse page. */
const PAGE_SIZE_OPTIONS = [12, 24, 48] as const

/**
 * URL-driven pagination controls for the public recipe browse page.
 *
 * Wraps {@link PaginationControls} and navigates to the updated URL via
 * `router.replace` when the user changes the page or page size. All data
 * fetching stays server-side — this component only manages the URL.
 *
 * @param props.currentPage - Active 1-based page number.
 * @param props.totalPages - Total number of pages.
 * @param props.pageSize - Currently selected page size.
 * @param props.totalCount - Total number of public recipes.
 * @param props.basePath - Base URL path (e.g. `/recipes/browse`).
 */
export function RecipeBrowsePagination({
  currentPage,
  totalPages,
  pageSize,
  totalCount,
  basePath,
}: {
  currentPage: number
  totalPages: number
  pageSize: number
  totalCount: number
  basePath: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const navigate = (page: number, size: number) => {
    const params = new URLSearchParams({ page: String(page), size: String(size) })
    startTransition(() => router.replace(`${basePath}?${params}`))
  }

  return (
    <PaginationControls
      currentPage={currentPage}
      totalPages={totalPages}
      pageSize={pageSize}
      pageSizeOptions={PAGE_SIZE_OPTIONS}
      totalCount={totalCount}
      isPending={isPending}
      onPageChange={(page) => navigate(page, pageSize)}
      onSizeChange={(size) => navigate(1, size)}
    />
  )
}
