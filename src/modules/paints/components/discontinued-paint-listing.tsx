import type { ReactNode } from 'react'
import Link from 'next/link'

import { DiscontinuedBadge } from '@/modules/paints/components/discontinued-badge'
import { PaintSubstitutes } from '@/modules/paints/components/paint-substitutes'
import type { PaintWithRelations } from '@/modules/paints/services/paint-service'
import type { PaintMatch } from '@/modules/paints/types/paint-match'
import type { Brand } from '@/types/paint'

/**
 * Server-rendered listing of discontinued paints with their pre-resolved
 * substitutes inline.
 *
 * Each row shows the source discontinued paint (swatch, name, brand) on the
 * left and a `<PaintSubstitutes />` block on the right seeded with
 * `substitutes[paint.id]`. The hook inside `PaintSubstitutes` skips its
 * initial fetch when seed data is supplied and the brand filter is empty,
 * so the page renders all rows without any client round-trips.
 *
 * Pagination is rendered as plain anchor links — same approach as the static
 * sitemap entry. The list page is fully cacheable.
 *
 * @param props.paints - Discontinued paints for the current page.
 * @param props.substitutes - Pre-resolved substitutes keyed by source paint ID
 *   (from `findMatchesForPaints` SSR call).
 * @param props.totalCount - Total discontinued-paint count for the
 *   "Showing X-Y of Z" line.
 * @param props.page - Current 1-based page number.
 * @param props.size - Current page size.
 * @param props.brands - All brands, passed to each row's `PaintSubstitutes`
 *   brand filter.
 */
export function DiscontinuedPaintListing({
  paints,
  substitutes,
  totalCount,
  page,
  size,
  brands,
}: {
  paints: PaintWithRelations[]
  substitutes: Record<string, PaintMatch[]>
  totalCount: number
  page: number
  size: number
  brands: Brand[]
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / size))
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * size + 1
  const rangeEnd = Math.min(page * size, totalCount)

  if (paints.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        No discontinued paints found.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Showing {rangeStart.toLocaleString()}&ndash;{rangeEnd.toLocaleString()} of{' '}
        {totalCount.toLocaleString()}
      </p>

      <ul className="flex flex-col gap-8">
        {paints.map((paint) => {
          const brand = paint.product_lines.brands
          const productLine = paint.product_lines
          return (
            <li
              key={paint.id}
              className="grid gap-6 rounded-lg border border-border bg-card p-4 sm:grid-cols-[minmax(0,18rem)_1fr]"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className="size-16 shrink-0 rounded-lg border border-border"
                    style={{ backgroundColor: paint.hex }}
                    aria-label={`Color swatch for ${paint.name}`}
                  />
                  <div className="flex flex-col gap-1">
                    <Link
                      href={`/paints/${paint.id}`}
                      className="text-base font-semibold leading-tight hover:underline"
                    >
                      {paint.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      <Link
                        href={`/brands/${brand.id}`}
                        className="underline hover:text-foreground"
                      >
                        {brand.name}
                      </Link>
                      {' — '}
                      {productLine.name}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {paint.hex.toUpperCase()}
                    </p>
                  </div>
                </div>
                <div>
                  <DiscontinuedBadge size="sm" />
                </div>
              </div>

              <PaintSubstitutes
                sourcePaintId={paint.id}
                brands={brands}
                defaultLimit={3}
                initialMatches={substitutes[paint.id] ?? []}
              />
            </li>
          )
        })}
      </ul>

      {totalPages > 1 && (
        <nav
          className="flex flex-wrap items-center justify-center gap-1"
          aria-label="Pagination"
        >
          <PaginationLink page={page - 1} size={size} disabled={page <= 1}>
            Previous
          </PaginationLink>
          <span className="px-3 text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <PaginationLink page={page + 1} size={size} disabled={page >= totalPages}>
            Next
          </PaginationLink>
        </nav>
      )}
    </div>
  )
}

/** Default page size; mirrored in the route page. */
const DEFAULT_DISCONTINUED_PAGE_SIZE = 24

/**
 * Internal anchor used by `DiscontinuedPaintListing` pagination.
 *
 * Builds a `/discontinued?page=...&size=...` URL — omits `page=1` and the
 * default `size` for clean URLs. When `disabled` is true, renders as a
 * non-interactive `<span>` styled like a disabled button.
 *
 * @param props.page - Target 1-based page number.
 * @param props.size - Page size for the target URL.
 * @param props.disabled - When true, renders disabled and does not link.
 * @param props.children - Visible label.
 */
function PaginationLink({
  page,
  size,
  disabled,
  children,
}: {
  page: number
  size: number
  disabled?: boolean
  children: ReactNode
}) {
  if (disabled) {
    return (
      <span className="btn btn-outline btn-sm cursor-not-allowed opacity-40" aria-disabled>
        {children}
      </span>
    )
  }
  const params = new URLSearchParams()
  if (page > 1) params.set('page', String(page))
  if (size !== DEFAULT_DISCONTINUED_PAGE_SIZE) params.set('size', String(size))
  const qs = params.toString()
  const href = qs ? `/discontinued?${qs}` : '/discontinued'
  return (
    <Link href={href} className="btn btn-outline btn-sm">
      {children}
    </Link>
  )
}
