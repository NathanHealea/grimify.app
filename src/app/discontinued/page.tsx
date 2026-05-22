import { Breadcrumbs } from '@/components/breadcrumbs'
import { Main } from '@/components/main'
import { PageHeader, PageSubtitle, PageTitle } from '@/components/page-header'
import { getBrandService } from '@/modules/brands/services/brand-service.server'
import { findMatchesForPaints } from '@/modules/paints/actions/find-matches-for-paints'
import { DiscontinuedPaintListing } from '@/modules/paints/components/discontinued-paint-listing'
import { getDiscontinuedService } from '@/modules/paints/services/discontinued-service.server'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'

export const metadata = pageMetadata({
  title: 'Discontinued paints',
  description:
    'Every discontinued Citadel, Vallejo and Army Painter paint — with cross-brand substitute suggestions ranked by perceptual colour distance.',
  image: { url: '/og-image.png', width: 1200, height: 630, alt: 'Grimify — Find any miniature paint across every brand' },
  path: '/discontinued',
  keywords: [
    'discontinued miniature paints',
    'Citadel discontinued',
    'Vallejo discontinued',
    'paint substitute finder',
    'out of print paints',
  ],
})

/** Valid page sizes that the `/discontinued` route supports. */
const VALID_SIZES = [12, 24, 48] as const

/** Default page size when none is provided in the URL. */
const DEFAULT_SIZE = 24

/** Number of substitutes pre-resolved per row at SSR time. */
const ROW_SUBSTITUTE_LIMIT = 3

export default async function DiscontinuedPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; size?: string }>
}) {
  const { page, size } = await searchParams
  const sizeNum = Number(size)
  const pageSize = (VALID_SIZES as readonly number[]).includes(sizeNum) ? sizeNum : DEFAULT_SIZE
  const currentPage = Math.max(1, parseInt(page ?? '1', 10) || 1)
  const offset = (currentPage - 1) * pageSize

  const [discontinuedService, brandService] = await Promise.all([
    getDiscontinuedService(),
    getBrandService(),
  ])

  const [paints, totalCount, brands] = await Promise.all([
    discontinuedService.listDiscontinuedPaints({ limit: pageSize, offset }),
    discontinuedService.countDiscontinuedPaints(),
    brandService.getAllBrands(),
  ])

  // Bulk pre-resolution: one server call resolves every row's substitutes so
  // the listing renders without any client round-trips on initial paint.
  const substitutes = paints.length > 0
    ? await findMatchesForPaints(
        paints.map((p) => p.id),
        { excludeDiscontinued: true, excludeSamePaint: true, limit: ROW_SUBSTITUTE_LIMIT },
      )
    : {}

  return (
    <Main>
      <Breadcrumbs items={[{ label: 'Paints', href: '/paints' }, { label: 'Discontinued' }]} />
      <PageHeader>
        <PageTitle>Discontinued paints</PageTitle>
        <PageSubtitle>
          {totalCount.toLocaleString()} discontinued paints with cross-brand substitutes.
        </PageSubtitle>
      </PageHeader>

      <DiscontinuedPaintListing
        paints={paints}
        substitutes={substitutes}
        totalCount={totalCount}
        page={currentPage}
        size={pageSize}
        brands={brands}
      />
    </Main>
  )
}
