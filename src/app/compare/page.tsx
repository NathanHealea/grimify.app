import { Breadcrumbs } from '@/components/breadcrumbs'
import { Main } from '@/components/main'
import { PageHeader, PageSubtitle, PageTitle } from '@/components/page-header'
import { PaintComparisonExplorer } from '@/modules/paints/components/paint-comparison-explorer'
import { getPaintService } from '@/modules/paints/services/paint-service.server'
import { parseCompareParam } from '@/modules/paints/utils/parse-compare-params'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'

export const metadata = pageMetadata({
  title: 'Compare paints',
  description:
    'Compare Citadel, Vallejo, Army Painter and any other brand side by side — hex values, product lines, and perceptual colour distance at a glance.',
  image: { url: '/og-image.png', width: 1200, height: 630, alt: 'Grimify — Find any miniature paint across every brand' },
  path: '/compare',
  keywords: [
    'compare miniature paints',
    'Citadel vs Vallejo',
    'paint substitute',
    'cross-brand paint comparison',
    'perceptual colour distance',
  ],
})

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ paints?: string }>
}) {
  const { paints: paintsParam } = await searchParams
  const requestedIds = parseCompareParam(paintsParam)

  const paintService = await getPaintService()

  const [hydrated, catalog] = await Promise.all([
    Promise.all(requestedIds.map((id) => paintService.getPaintById(id))),
    paintService.getColorWheelPaints(),
  ])

  const initialPaints = hydrated.filter(
    (paint): paint is NonNullable<typeof paint> => paint !== null,
  )

  return (
    <Main>
      <Breadcrumbs
        items={[
          { label: 'Paints', href: '/paints' },
          { label: 'Compare' },
        ]}
      />
      <PageHeader>
        <PageTitle>Compare paints</PageTitle>
        <PageSubtitle>
          Add up to six paints to see them side by side with pairwise CIE76 ΔE.
        </PageSubtitle>
      </PageHeader>

      <PaintComparisonExplorer initialPaints={initialPaints} catalog={catalog} />
    </Main>
  )
}
