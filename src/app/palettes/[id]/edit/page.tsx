import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { createPaletteService } from '@/modules/palettes/services/palette-service'
import { PaletteBuilder } from '@/modules/palettes/components/palette-builder'

export default async function PaletteEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/sign-in?next=/palettes/${id}/edit`)

  const service = createPaletteService(supabase)
  const palette = await service.getPaletteById(id)

  if (!palette || palette.userId !== user.id) notFound()

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold">Edit palette</h1>
      <PaletteBuilder palette={palette} />
    </div>
  )
}
