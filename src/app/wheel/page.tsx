import { ColorWheelContainer } from '@/modules/color-wheel/components/color-wheel-container'
import { getHueService } from '@/modules/hues/services/hue-service.server'
import { getPaintService } from '@/modules/paints/services/paint-service.server'

export default async function WheelPage() {
  const [paintService, hueService] = await Promise.all([getPaintService(), getHueService()])
  const [paints, hues] = await Promise.all([
    paintService.getColorWheelPaints(),
    hueService.getColorWheelHues(),
  ])

  return (
    <main className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
      <ColorWheelContainer paints={paints} hues={hues} />
    </main>
  )
}
