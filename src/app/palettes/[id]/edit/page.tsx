import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { createPaletteService } from '@/modules/palettes/services/palette-service'

/**
 * Legacy edit URL — owner-aware redirect.
 *
 * Owners are forwarded to the new `/user/palettes/[id]/edit` location;
 * everyone else is sent to the read-only public detail page. Kept for
 * bookmark continuity; safe to delete once analytics show no inbound traffic.
 */
export default async function PaletteEditRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const service = createPaletteService(supabase)
    const palette = await service.getPaletteById(id)
    if (palette && palette.userId === user.id) {
      redirect(`/user/palettes/${id}/edit`)
    }
  }

  redirect(`/palettes/${id}`)
}
