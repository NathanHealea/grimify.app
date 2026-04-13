import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/breadcrumbs';
import { getColorService } from '@/modules/colors/services/color-service.server';
import { ColorPaintGrid } from '@/modules/paints/components/color-paint-grid';
import { getPaintService } from '@/modules/paints/services/paint-service.server';

/** Valid page sizes that the paginated grid supports. */
const VALID_SIZES = [25, 50, 100, 200]

export default async function ColorPage({
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

  const color = await colorService.getIttenHueById(id)
  if (!color || color.parent_id === null) {
    notFound()
  }

  const parentHue = await colorService.getIttenHueById(color.parent_id)

  const paintCounts = await paintService.getPaintCountsByIttenHue([id])
  const totalCount = paintCounts.get(id) ?? 0

  const paints = await paintService.getPaintsByIttenHueId(id, { limit: pageSize, offset })

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <Breadcrumbs
        items={[
          { label: 'Paints', href: '/paints' },
          ...(parentHue
            ? [{ label: parentHue.name, href: `/paints/group/${parentHue.id}` }]
            : []),
          { label: color.name },
        ]}
      />

      <div className="mb-8 flex items-center gap-4">
        <div
          className="size-10 shrink-0 rounded-full border border-border"
          style={{ backgroundColor: color.hex_code }}
          aria-hidden="true"
        />
        <div>
          <h1 className="text-3xl font-bold">{color.name}</h1>
          <p className="text-sm text-muted-foreground">
            {totalCount} {totalCount === 1 ? 'Paint' : 'Paints'}
          </p>
        </div>
      </div>

      <ColorPaintGrid
        colorId={id}
        initialPaints={paints}
        totalCount={totalCount}
      />
    </div>
  )
}
