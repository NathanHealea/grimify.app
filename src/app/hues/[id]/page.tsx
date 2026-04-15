import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/breadcrumbs';
import { ChildHueCard } from '@/modules/hues/components/child-hue-card';
import { getHueService } from '@/modules/hues/services/hue-service.server';
import { HueGroupPaintGrid } from '@/modules/paints/components/hue-group-paint-grid';
import { HuePaintGrid } from '@/modules/paints/components/hue-paint-grid';
import { getPaintService } from '@/modules/paints/services/paint-service.server';

/** Valid page sizes that the paginated grid supports. */
const VALID_SIZES = [25, 50, 100, 200]

export default async function HuePage({
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

  const [hueService, paintService] = await Promise.all([
    getHueService(),
    getPaintService(),
  ])

  const hue = await hueService.getHueById(id)
  if (!hue) notFound()

  const isTopLevel = hue.parent_id === null

  if (isTopLevel) {
    const [paints, totalCount, childHues] = await Promise.all([
      paintService.getPaintsByHueGroup(id, { limit: pageSize, offset }),
      paintService.getPaintCountByHueGroup(id),
      hueService.getChildHues(id),
    ])

    const childPaintCounts = await paintService.getPaintCountsByHue(
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
            <h2 className="mb-4 text-2xl font-semibold">Hues</h2>
            <div className="flex flex-wrap gap-2">
              {childHues.map((child) => (
                <ChildHueCard key={child.id} hue={child} paintCount={childPaintCounts.get(child.id) ?? 0} />
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

  // Child hue (named color)
  const parentHue = await hueService.getHueById(hue.parent_id!)

  const paintCounts = await paintService.getPaintCountsByHue([id])
  const totalCount = paintCounts.get(id) ?? 0

  const paints = await paintService.getPaintsByHueId(id, { limit: pageSize, offset })

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <Breadcrumbs
        items={[
          { label: 'Paints', href: '/paints' },
          ...(parentHue
            ? [{ label: parentHue.name, href: `/hues/${parentHue.id}` }]
            : []),
          { label: hue.name },
        ]}
      />

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

      <HuePaintGrid
        hueId={id}
        initialPaints={paints}
        totalCount={totalCount}
      />
    </div>
  )
}
