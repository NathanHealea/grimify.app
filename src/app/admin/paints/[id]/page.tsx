import { notFound } from 'next/navigation'
import Link from 'next/link'

import { Main } from '@/components/main'
import { PageHeader, PageTitle, PageSubtitle } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getBrandService } from '@/modules/brands/services/brand-service.server'
import { getHueService } from '@/modules/hues/services/hue-service.server'
import { getPaintService } from '@/modules/paints/services/paint-service.server'
import { PaintForm } from '@/modules/admin/components/paint-form'
import { DeletePaintButton } from '@/modules/admin/components/delete-paint-button'
import { updatePaint } from '@/modules/admin/actions/paint-actions'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'
import type { Hue } from '@/types/color'

export const metadata = pageMetadata({
  title: 'Edit paint',
  description: 'Admin: edit a paint.',
  path: '/admin/paints',
  noindex: true,
})

/**
 * Admin page for editing an existing paint.
 *
 * Fetches the paint with its relations and populates the form with existing
 * values. The paint's current brand/product line and hue selection are
 * pre-populated in the dropdowns.
 */
export default async function AdminPaintDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [paintService, brandService, hueService] = await Promise.all([
    getPaintService(),
    getBrandService(),
    getHueService(),
  ])

  const [paint, brands, parentHues] = await Promise.all([
    paintService.getPaintById(id),
    brandService.getAllBrandsWithProductLines(),
    hueService.getHues(),
  ])

  if (!paint) notFound()

  // Build child hues map
  const childHueArrays = await Promise.all(
    parentHues.map((h) => hueService.getChildHues(h.id))
  )
  const childHuesByParent: Record<string, Hue[]> = {}
  parentHues.forEach((h, i) => {
    childHuesByParent[h.id] = childHueArrays[i]
  })

  return (
    <Main as="div">
      <PageHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/admin/paints" className="btn btn-ghost btn-sm">
              ← Paints
            </Link>
            <div>
              <PageTitle>{paint.name}</PageTitle>
              <PageSubtitle>Edit paint details and color data.</PageSubtitle>
            </div>
          </div>
          <DeletePaintButton paintId={paint.id} paintName={paint.name} />
        </div>
      </PageHeader>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Paint Details</CardTitle>
        </CardHeader>
        <CardContent>
          <PaintForm
            action={updatePaint}
            brands={brands}
            parentHues={parentHues}
            childHuesByParent={childHuesByParent}
            defaultValues={paint}
            mode="edit"
          />
        </CardContent>
      </Card>
    </Main>
  )
}
