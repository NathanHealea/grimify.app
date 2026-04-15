import { PaintExplorer } from '@/modules/paints/components/paint-explorer'
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

  const paintService = await getPaintService()

  const [initialPaints, totalPaints] = await Promise.all([
    paintService.getAllPaints({ limit: pageSize, offset }),
    paintService.getTotalPaintCount(),
  ])

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <div className="mb-8 flex flex-col gap-4">
        <h1 className="text-3xl font-bold">Paints</h1>
        <p className="text-sm text-muted-foreground">
          Browse {totalPaints.toLocaleString()} paints.
        </p>
      </div>

      <PaintExplorer
        initialPaints={initialPaints}
        initialTotalCount={totalPaints}
      />
    </div>
  )
}
