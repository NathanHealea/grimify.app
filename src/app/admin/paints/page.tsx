import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Main } from '@/components/main'
import { PageHeader, PageTitle, PageSubtitle } from '@/components/page-header'
import { getPaintService } from '@/modules/paints/services/paint-service.server'
import { getBrandService } from '@/modules/brands/services/brand-service.server'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'

export const metadata = pageMetadata({
  title: 'Paint management',
  description: 'Admin: manage Grimify paints.',
  path: '/admin/paints',
  noindex: true,
})

/** Number of paints shown per page. */
const PAGE_SIZE = 50

/**
 * Admin page listing all paints with search, brand filter, and pagination.
 *
 * Accepts `?search`, `?brand_id`, and `?page` query params.
 */
export default async function AdminPaintsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; brand_id?: string; page?: string }>
}) {
  const { search, brand_id, page } = await searchParams

  const currentPage = Math.max(1, parseInt(page ?? '1', 10))
  const offset = (currentPage - 1) * PAGE_SIZE
  const brandId = brand_id ? parseInt(brand_id, 10) : undefined

  const [paintService, brandService] = await Promise.all([
    getPaintService(),
    getBrandService(),
  ])

  const [brands, { paints, count: totalCount }] = await Promise.all([
    brandService.getAllBrands(),
    paintService.searchPaints({ search, brandId, limit: PAGE_SIZE, offset }),
  ])

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  function pageUrl(p: number) {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (brand_id) params.set('brand_id', brand_id)
    if (p > 1) params.set('page', String(p))
    const qs = params.toString()
    return `/admin/paints${qs ? `?${qs}` : ''}`
  }

  return (
    <Main as="div">
      <PageHeader>
        <div className="flex items-center justify-between">
          <div>
            <PageTitle>Paint Management</PageTitle>
            <PageSubtitle>Manage the paint catalog. Total: {totalCount} paints.</PageSubtitle>
          </div>
          <Link href="/admin/paints/new" className="btn btn-primary btn-sm">
            New Paint
          </Link>
        </div>
      </PageHeader>

      {/* Search + filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form method="GET" className="flex items-center gap-2">
          <Input
            name="search"
            type="search"
            defaultValue={search ?? ''}
            placeholder="Search paints…"
            className="input-sm w-56"
          />
          {brand_id && <input type="hidden" name="brand_id" value={brand_id} />}
          <Button type="submit" className="btn-ghost btn-sm">
            Search
          </Button>
        </form>

        <form method="GET" className="flex items-center gap-2">
          {search && <input type="hidden" name="search" value={search} />}
          <select
            name="brand_id"
            defaultValue={brand_id ?? ''}
            className="input input-sm"
          >
            <option value="">All Brands</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
          <Button type="submit" className="btn-ghost btn-sm">
            Filter
          </Button>
        </form>

        {(search || brand_id) && (
          <Link href="/admin/paints" className="btn btn-ghost btn-sm">
            Clear
          </Link>
        )}

        <span className="ml-auto text-xs text-muted-foreground">
          {paints.length} shown
        </span>
      </div>

      {paints.length === 0 ? (
        <p className="text-sm text-muted-foreground">No paints found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-2 pr-3 w-8">Swatch</th>
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 pr-4 font-medium">Brand</th>
                <th className="pb-2 pr-4 font-medium">Product Line</th>
                <th className="pb-2 pr-4 font-medium">Hue</th>
                <th className="pb-2 pr-4 font-medium">Type</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paints.map((paint) => (
                <tr key={paint.id} className="border-b border-border/50">
                  <td className="py-2 pr-3">
                    <span
                      className="inline-block h-5 w-5 rounded border border-border"
                      style={{ backgroundColor: paint.hex }}
                      aria-hidden="true"
                    />
                  </td>
                  <td className="py-2 pr-4 font-medium">{paint.name}</td>
                  <td className="py-2 pr-4 text-muted-foreground">
                    {paint.product_lines.brands.name}
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground text-xs">
                    {paint.product_lines.name}
                  </td>
                  <td className="py-2 pr-4 text-xs text-muted-foreground">
                    {paint.hues ? (
                      <span className="flex items-center gap-1.5">
                        <span
                          className="inline-block h-3 w-3 rounded-full border border-border shrink-0"
                          style={{ backgroundColor: paint.hues.hex_code }}
                          aria-hidden="true"
                        />
                        {paint.hues.name}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-2 pr-4 text-xs text-muted-foreground">
                    {paint.paint_type ?? '—'}
                  </td>
                  <td className="py-2">
                    <Link href={`/admin/paints/${paint.id}`} className="btn btn-ghost btn-sm">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {currentPage > 1 ? (
            <Link href={pageUrl(currentPage - 1)} className="btn btn-ghost btn-sm">
              ← Prev
            </Link>
          ) : (
            <span className="btn btn-ghost btn-sm btn-disabled opacity-50">← Prev</span>
          )}

          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>

          {currentPage < totalPages ? (
            <Link href={pageUrl(currentPage + 1)} className="btn btn-ghost btn-sm">
              Next →
            </Link>
          ) : (
            <span className="btn btn-ghost btn-sm btn-disabled opacity-50">Next →</span>
          )}
        </div>
      )}
    </Main>
  )
}
