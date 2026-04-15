import { notFound } from 'next/navigation'

import { Breadcrumbs } from '@/components/breadcrumbs'
import { getHueService } from '@/modules/hues/services/hue-service.server'
import { PaintDetail } from '@/modules/paints/components/paint-detail'
import { PaintReferences } from '@/modules/paints/components/paint-references'
import { getPaintService } from '@/modules/paints/services/paint-service.server'

export default async function PaintDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const paintService = await getPaintService()
  const paint = await paintService.getPaintById(id)

  if (!paint) {
    notFound()
  }

  const [references, parentHue] = await Promise.all([
    paintService.getPaintReferences(id),
    paint.hues?.parent_id
      ? (await getHueService()).getHueById(paint.hues.parent_id)
      : null,
  ])

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12">
      <Breadcrumbs items={[{ label: 'Paints', href: '/paints' }, { label: paint.name }]} />
      <PaintDetail paint={paint} parentHue={parentHue} />

      {references.length > 0 && (
        <div className="mt-12">
          <PaintReferences references={references} />
        </div>
      )}
    </div>
  )
}
