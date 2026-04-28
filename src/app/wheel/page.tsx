import { getHueService } from '@/modules/hues/services/hue-service.server'
import { MunsellColorWheel } from '@/modules/color-wheel/components/munsell-color-wheel'
import { getPaintService } from '@/modules/paints/services/paint-service.server'

export default async function WheelPage() {
  const [paintService, hueService] = await Promise.all([getPaintService(), getHueService()])
  const [paints, hues] = await Promise.all([
    paintService.getColorWheelPaints(),
    hueService.getColorWheelHues(),
  ])

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <MunsellColorWheel paints={paints} hues={hues} />
    </main>
  )
}
