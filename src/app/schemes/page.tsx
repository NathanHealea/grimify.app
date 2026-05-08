import { Main } from '@/components/main'
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
    <Main width="container" padding="compact">
      <h1 className="mb-2 text-2xl font-bold">Color Scheme Explorer</h1>
      <p className="mb-6 text-muted-foreground">
        Select a base color to generate complementary, analogous, triadic, and more color schemes.
      </p>
      <SchemeExplorer paints={paints} isAuthenticated={!!user} collectionPaintIds={collectionPaintIds} />
    </Main>
  )
}
