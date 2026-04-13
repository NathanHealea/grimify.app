import { notFound } from 'next/navigation'

import { Breadcrumbs } from '@/components/breadcrumbs'
import { ColorCard } from '@/modules/colors/components/color-card'
import { getColorService } from '@/modules/colors/services/color-service.server'
import { HueGroupPaintGrid } from '@/modules/paints/components/hue-group-paint-grid'
import { getPaintService } from '@/modules/paints/services/paint-service.server'

/** Valid page sizes that the paginated grid supports. */
const VALID_SIZES = [25, 50, 100, 200]

export default async function HueGroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string; size?: string }>
}) {
  const { id } = await params
  const { page, size } = await searchParams
  const pageSize = VALID_SIZES.includes(Number(size)) ? Number(size) : 50
  const currentPage = Math.max(1, parseInt(page ?? '1', 10) || 1)
  const offset = (currentPage - 1) * pageSize

  const [colorService, paintService] = await Promise.all([
    getColorService(),
    getPaintService(),
  ])

  const hue = await colorService.getIttenHueById(id)
  if (!hue || hue.parent_id !== null) {
    notFound()
  }

  const [paints, totalCount, childHues] = await Promise.all([
    paintService.getPaintsByHueGroup(id, { limit: pageSize, offset }),
    paintService.getPaintCountByHueGroup(id),
    colorService.getChildHues(id),
  ])

  const childPaintCounts = await paintService.getPaintCountsByIttenHue(
    childHues.map((c) => c.id)
  )

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <Breadcrumbs items={[{ label: 'Paints', href: '/paints' }, { label: hue.name }]} />

      <div className="mb-8 flex items-center gap-4">
        <div
          className="size-10 shrink-0 rounded-full border border-border"
          style={{ backgroundColor: hue.hex_code }}
          aria-hidden="true"
        />
        <div>
          <h1 className="text-3xl font-bold">{hue.name}</h1>
          <p className="text-sm text-muted-foreground">
            {totalCount} {totalCount === 1 ? 'paint' : 'paints'}
          </p>
        </div>
      </div>

      {childHues.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold">Colors</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {childHues.map((color) => (
              <ColorCard key={color.id} color={color} paintCount={childPaintCounts.get(color.id) ?? 0} />
            ))}
          </div>
        </section>
      )}

      <HueGroupPaintGrid
        hueId={id}
        initialPaints={paints}
        totalCount={totalCount}
      />
    </div>
  )
}
