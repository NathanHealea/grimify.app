import { NextResponse, type NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createPaletteService } from '@/modules/palettes/services/palette-service'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/sign-in?next=/palettes', request.url), 303)
  }

  const service = createPaletteService(supabase)
  const palette = await service.createPalette({ userId: user.id, name: 'Untitled palette' })

  revalidatePath('/palettes')

  return NextResponse.redirect(new URL(`/palettes/${palette.id}/edit`, request.url), 303)
}
