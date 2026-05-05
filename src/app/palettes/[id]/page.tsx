import { notFound } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { createPaletteService } from '@/modules/palettes/services/palette-service'
import { PaletteDetail } from '@/modules/palettes/components/palette-detail'

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
