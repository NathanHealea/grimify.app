import { Main } from '@/components/main'
import { PageHeader, PageTitle, PageSubtitle } from '@/components/page-header'
import { createClient } from '@/lib/supabase/server'
import { getPaintService } from '@/modules/paints/services/paint-service.server'
import { getCollectionService } from '@/modules/collection/services/collection-service.server'
import { SchemeExplorer } from '@/modules/color-schemes/components/scheme-explorer'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'

export const metadata = pageMetadata({
  title: 'Color schemes',
  description:
    'Pick a base color and explore complementary, analogous, triadic, and split-complementary schemes — matched to real miniature paints.',
  path: '/schemes',
})

export default async function SchemesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const paintService = await getPaintService()
  const paints = await paintService.getColorWheelPaints()

  let collectionPaintIds: string[] = []
  if (user) {
    const collectionService = await getCollectionService()
    const ids = await collectionService.getUserPaintIds(user.id)
    collectionPaintIds = [...ids]
  }

  return (
    <Main>
      <PageHeader>
        <PageTitle size="md">Color Scheme Explorer</PageTitle>
        <PageSubtitle>
          Select a base color to generate complementary, analogous, triadic, and more color schemes.
        </PageSubtitle>
      </PageHeader>
      <SchemeExplorer paints={paints} isAuthenticated={!!user} collectionPaintIds={collectionPaintIds} />
    </Main>
  )
}
