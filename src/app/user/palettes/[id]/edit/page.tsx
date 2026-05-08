import Link from 'next/link'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { Main } from '@/components/main'
import { createClient } from '@/lib/supabase/server'
import { createPaletteService } from '@/modules/palettes/services/palette-service'
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

  const service = createPaletteService(supabase)
  const palette = await service.getPaletteById(id)

  if (!palette || palette.userId !== user.id) notFound()

  return (
    <Main width="3xl">
      <Link
        href={`/palettes/${id}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to palette
      </Link>
      <h1 className="mb-8 text-3xl font-bold">Edit palette</h1>
      <PaletteBuilder palette={palette} />
    </Main>
  )
}
