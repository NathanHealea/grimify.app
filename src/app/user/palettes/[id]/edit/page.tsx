import Link from 'next/link'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { Main } from '@/components/main'
import { PageHeader, PageTitle } from '@/components/page-header'
import { createClient } from '@/lib/supabase/server'
import { createPaletteService } from '@/modules/palettes/services/palette-service'
import { createPaintService } from '@/modules/paints/services/paint-service'
import { createCollectionService } from '@/modules/collection/services/collection-service'
import { PaletteBuilder } from '@/modules/palettes/components/palette-builder'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'

export const metadata = pageMetadata({
  title: 'Edit palette',
  description: 'Edit your paint palette on Grimify.',
  noindex: true,
})

export default async function UserPaletteEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/sign-in?next=/user/palettes/${id}/edit`)

  const paletteService = createPaletteService(supabase)
  const palette = await paletteService.getPaletteById(id)

  if (!palette || palette.userId !== user.id) notFound()

  const paintService = createPaintService(supabase)
  const collectionService = createCollectionService(supabase)

  const [catalog, collectionIds] = await Promise.all([
    paintService.getColorWheelPaints(),
    collectionService.getUserPaintIds(user.id),
  ])

  return (
    <Main>
      <Link
        href={`/palettes/${id}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to palette
      </Link>
      <PageHeader>
        <PageTitle>Edit palette</PageTitle>
      </PageHeader>
      <PaletteBuilder
        palette={palette}
        catalog={catalog}
        collectionPaintIds={Array.from(collectionIds)}
      />
    </Main>
  )
}
