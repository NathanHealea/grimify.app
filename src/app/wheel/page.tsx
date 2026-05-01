import { createClient } from '@/lib/supabase/server'
import { ColorWheelContainer } from '@/modules/color-wheel/components/color-wheel-container'
import { getCollectionService } from '@/modules/collection/services/collection-service.server'
import { getHueService } from '@/modules/hues/services/hue-service.server'
import { getPaintService } from '@/modules/paints/services/paint-service.server'

export default async function WheelPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [paintService, hueService] = await Promise.all([getPaintService(), getHueService()])
  const [paints, hues] = await Promise.all([
    paintService.getColorWheelPaints(),
    hueService.getColorWheelHues(),
  ])

  let userPaintIds: Set<string> | undefined
  if (user) {
    const collectionService = await getCollectionService()
    userPaintIds = await collectionService.getUserPaintIds(user.id)
  }

  return (
    <main className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
      <ColorWheelContainer paints={paints} hues={hues} userPaintIds={userPaintIds} />
    </main>
  )
}
