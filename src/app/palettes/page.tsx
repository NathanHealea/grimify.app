import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { createPaletteService } from '@/modules/palettes/services/palette-service'
import { PaletteCardGrid } from '@/modules/palettes/components/palette-card-grid'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'

export const metadata = pageMetadata({
  title: 'My palettes',
  description: 'Manage your saved Grimify palettes.',
  path: '/palettes',
  noindex: true,
})

export default async function PalettesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/sign-in?next=/palettes')

  const service = createPaletteService(supabase)
  const summaries = await service.listPalettesForUser(user.id)

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">My palettes</h1>
        <form action="/palettes/new" method="post">
          <button type="submit" className="btn btn-primary btn-sm">
            New palette
          </button>
        </form>
      </div>

      {summaries.length > 0 ? (
        <PaletteCardGrid summaries={summaries} canEditAll />
      ) : (
        <div className="card card-body items-center justify-center py-16 text-center">
          <p className="text-muted-foreground">
            You don&apos;t have any palettes yet.
          </p>
          <form action="/palettes/new" method="post" className="mt-4">
            <button type="submit" className="btn btn-primary btn-sm">
              Create your first palette
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
