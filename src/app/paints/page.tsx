import { getHueService } from '@/modules/hues/services/hue-service.server'
import { PaintExplorer } from '@/modules/paints/components/paint-explorer'
import { getPaintService } from '@/modules/paints/services/paint-service.server'
import type { PaintWithBrand } from '@/modules/paints/services/paint-service'

/** Valid page sizes that the paginated grid supports. */
const VALID_SIZES = [25, 50, 100, 200]

export default async function PaintsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; size?: string; q?: string; hue?: string }>
}) {
  const { page, size, q, hue } = await searchParams
  const pageSize = VALID_SIZES.includes(Number(size)) ? Number(size) : 50
  const currentPage = Math.max(1, parseInt(page ?? '1', 10) || 1)
  const offset = (currentPage - 1) * pageSize
  const query = q?.trim() ?? ''
  const [parentHueName, childHueName] = (hue ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())

  const paintService = await getPaintService()
  const hueService = await getHueService()

  const [totalPaints, ittenHues] = await Promise.all([
    paintService.getTotalPaintCount(),
    hueService.getIttenHues(),
  ])

  // Resolve hue names from URL to IDs
  const parentHue = parentHueName
    ? ittenHues.find((h) => h.name.toLowerCase() === parentHueName)
    : undefined

  let childHueId: string | undefined
  let childHueIds: string[] | undefined

  if (parentHue) {
    const children = await hueService.getChildHues(parentHue.id)
    if (childHueName) {
      childHueId = children.find((h) => h.name.toLowerCase() === childHueName)?.id
    }
    if (!childHueId) {
      childHueIds = children.map((c) => c.id)
    }
  }

  // Fetch initial paints based on URL filters
  let initialPaints: PaintWithBrand[]
  let initialCount: number

  if (query) {
    const result = await paintService.searchPaints({
      query,
      hueId: childHueId,
      hueIds: childHueIds,
      limit: pageSize,
      offset,
    })
    initialPaints = result.paints
    initialCount = result.count
  } else if (childHueId) {
    const [paints, count] = await Promise.all([
      paintService.getPaintsByIttenHueId(childHueId, { limit: pageSize, offset }),
      paintService.getPaintCountByIttenHueId(childHueId),
    ])
    initialPaints = paints
    initialCount = count
  } else if (parentHue) {
    const [paints, count] = await Promise.all([
      paintService.getPaintsByHueGroup(parentHue.id, { limit: pageSize, offset }),
      paintService.getPaintCountByHueGroup(parentHue.id),
    ])
    initialPaints = paints
    initialCount = count
  } else {
    initialPaints = await paintService.getAllPaints({ limit: pageSize, offset })
    initialCount = totalPaints
  }

  // Fetch paint counts per hue group in parallel
  const hueCountEntries = await Promise.all(
    ittenHues.map(async (h) => {
      const count = await paintService.getPaintCountByHueGroup(h.id)
      return [h.name.toLowerCase(), count] as const
    })
  )
  const huePaintCounts = Object.fromEntries(hueCountEntries)

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
        initialTotalCount={initialCount}
        ittenHues={ittenHues}
        huePaintCounts={huePaintCounts}
      />
    </div>
  )
}
