import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { Breadcrumbs } from '@/components/breadcrumbs'
import { Main } from '@/components/main'
import { createClient } from '@/lib/supabase/server'
import { getCollectionService } from '@/modules/collection/services/collection-service.server'
import { getHueService } from '@/modules/hues/services/hue-service.server'
import { PaintDetail } from '@/modules/paints/components/paint-detail'
import { PaintReferences } from '@/modules/paints/components/paint-references'
import { getPaintService } from '@/modules/paints/services/paint-service.server'
import { buildOgUrl } from '@/modules/seo/utils/build-og-url'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const paintService = await getPaintService()
  const paint = await paintService.getPaintById(id)

  if (!paint) {
    return pageMetadata({ title: 'Paint not found', description: 'This paint could not be found.', noindex: true })
  }

  const brandName = paint.product_lines?.brands?.name
  const description = brandName
    ? `${paint.name} by ${brandName}. Hex ${paint.hex.toUpperCase()}.`
    : `${paint.name} miniature paint. Hex ${paint.hex.toUpperCase()}.`

  return pageMetadata({
    title: paint.name,
    description,
    path: `/paints/${id}`,
    image: {
      url: buildOgUrl('paint', id),
      width: 1200,
      height: 630,
      alt: paint.name,
    },
  })
}

export default async function PaintDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const paintService = await getPaintService()
  const paint = await paintService.getPaintById(id)

  if (!paint) {
    notFound()
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [references, parentHue, isInCollection] = await Promise.all([
    paintService.getPaintReferences(id),
    paint.hues?.parent_id
      ? (await getHueService()).getHueById(paint.hues.parent_id)
      : null,
    user
      ? (await getCollectionService()).isInCollection(user.id, paint.id)
      : false,
  ])

  return (
    <Main width="4xl">
      <Breadcrumbs items={[{ label: 'Paints', href: '/paints' }, { label: paint.name }]} />
      <PaintDetail
        paint={paint}
        parentHue={parentHue}
        isInCollection={isInCollection}
        isAuthenticated={user !== null}
      />

      {references.length > 0 && (
        <div className="mt-12">
          <PaintReferences references={references} />
        </div>
      )}
    </Main>
  )
}
