import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { createPaletteService } from '@/modules/palettes/services/palette-service'
import { PaletteDetail } from '@/modules/palettes/components/palette-detail'
import { buildOgUrl } from '@/modules/seo/utils/build-og-url'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const service = createPaletteService(supabase)
  const palette = await service.getPaletteById(id)

  if (!palette) {
    return pageMetadata({ title: 'Palette not found', description: 'This palette could not be found.', noindex: true })
  }

  const isViewerOwner = palette.userId === user?.id
  if (!palette.isPublic && !isViewerOwner) {
    return pageMetadata({ title: 'Palette not found', description: 'This palette could not be found.', noindex: true })
  }

  return pageMetadata({
    title: palette.name,
    description: palette.description?.slice(0, 200) ?? `${palette.name} — a paint palette on Grimify.`,
    path: `/palettes/${id}`,
    noindex: !palette.isPublic,
    image: palette.isPublic
      ? {
          url: buildOgUrl('palette', id),
          width: 1200,
          height: 630,
          alt: palette.name,
        }
      : undefined,
  })
}

export default async function PaletteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const service = createPaletteService(supabase)
  const palette = await service.getPaletteById(id)

  if (!palette) notFound()
  if (!palette.isPublic && palette.userId !== user?.id) notFound()

  const { data: ownerProfile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', palette.userId)
    .single()

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12">
      <PaletteDetail
        palette={palette}
        viewer={user ? { id: user.id } : null}
        ownerDisplayName={ownerProfile?.display_name ?? null}
      />
    </div>
  )
}
