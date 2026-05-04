import { getPaintService } from '@/modules/paints/services/paint-service.server'
import { SchemeExplorer } from '@/modules/color-schemes/components/scheme-explorer'

export default async function SchemesPage() {
  const paintService = await getPaintService()
  const paints = await paintService.getColorWheelPaints()

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">Color Scheme Explorer</h1>
      <p className="mb-6 text-muted-foreground">
        Select a base color to generate complementary, analogous, triadic, and more color schemes.
      </p>
      <SchemeExplorer paints={paints} />
    </main>
  )
}
