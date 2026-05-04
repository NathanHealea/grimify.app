import { createClient } from '@/lib/supabase/server'
import { getPaintService } from '@/modules/paints/services/paint-service.server'
import { getCollectionService } from '@/modules/collection/services/collection-service.server'
import { SchemeExplorer } from '@/modules/color-schemes/components/scheme-explorer'

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
    <main className="container mx-auto px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">Color Scheme Explorer</h1>
      <p className="mb-6 text-muted-foreground">
        Select a base color to generate complementary, analogous, triadic, and more color schemes.
      </p>
      <SchemeExplorer paints={paints} isAuthenticated={!!user} collectionPaintIds={collectionPaintIds} />
    </main>
  )
}
