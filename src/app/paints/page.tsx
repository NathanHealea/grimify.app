import { Input } from '@/components/ui/input'
import { IttenHueCard } from '@/modules/colors/components/itten-hue-card'
import { getColorService } from '@/modules/colors/services/color-service.server'
import { PaginatedPaintGrid } from '@/modules/paints/components/paginated-paint-grid'
import { getPaintService } from '@/modules/paints/services/paint-service.server'

/** Valid page sizes that the paginated grid supports. */
const VALID_SIZES = [25, 50, 100, 200]

export default async function PaintsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; size?: string }>
}) {
  const { page, size } = await searchParams
  const pageSize = VALID_SIZES.includes(Number(size)) ? Number(size) : 50
  const currentPage = Math.max(1, parseInt(page ?? '1', 10) || 1)
  const offset = (currentPage - 1) * pageSize

  const [colorService, paintService] = await Promise.all([
    getColorService(),
    getPaintService(),
  ])

  const [hues, initialPaints, totalPaints] = await Promise.all([
    colorService.getIttenHues(),
    paintService.getAllPaints({ limit: pageSize, offset }),
    paintService.getTotalPaintCount(),
  ])

  const paintCountEntries = await Promise.all(
    hues.map(async (hue) => {
      const count = await paintService.getPaintCountByHueGroup(hue.id)
      return [hue.id, count] as const
    })
  )
  const paintCounts = new Map(paintCountEntries)

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <div className="mb-8 flex flex-col gap-4">
        <h1 className="text-3xl font-bold">Paints</h1>
        <p className="text-sm text-muted-foreground">
          Browse {totalPaints.toLocaleString()} paints organized by the Itten 12-hue color wheel.
        </p>
        <Input type="search" placeholder="Search paints..." className="max-w-md" readOnly />
      </div>

      <section className="mb-12">
        <h2 className="mb-4 text-2xl font-semibold">Hues</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {hues.map((hue) => (
            <IttenHueCard key={hue.id} hue={hue} paintCount={paintCounts.get(hue.id) ?? 0} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">All Paints</h2>
        <PaginatedPaintGrid initialPaints={initialPaints} totalCount={totalPaints} />
      </section>
    </div>
  )
}
