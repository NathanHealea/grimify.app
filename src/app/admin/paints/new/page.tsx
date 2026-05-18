import Link from 'next/link'

import { Main } from '@/components/main'
import { PageHeader, PageTitle, PageSubtitle } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getBrandService } from '@/modules/brands/services/brand-service.server'
import { getHueService } from '@/modules/hues/services/hue-service.server'
import { PaintForm } from '@/modules/admin/components/paint-form'
import { createPaint } from '@/modules/admin/actions/paint-actions'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'
import type { Hue } from '@/types/color'

export const metadata = pageMetadata({
  title: 'New paint',
  description: 'Admin: create a new paint.',
  path: '/admin/paints/new',
  noindex: true,
})

/** Admin page for creating a new paint. */
export default async function AdminPaintNewPage() {
  const hueService = await getHueService()
  const brandService = await getBrandService()

  const [brands, parentHues] = await Promise.all([
    brandService.getAllBrandsWithProductLines(),
    hueService.getHues(),
  ])

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
        <div className="flex items-center gap-2">
          <Link href="/admin/paints" className="btn btn-ghost btn-sm">
            ← Paints
          </Link>
          <div>
            <PageTitle>New Paint</PageTitle>
            <PageSubtitle>Add a new paint to the catalog.</PageSubtitle>
          </div>
        </div>
      </PageHeader>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Paint Details</CardTitle>
        </CardHeader>
        <CardContent>
          <PaintForm
            action={createPaint}
            brands={brands}
            parentHues={parentHues}
            childHuesByParent={childHuesByParent}
            mode="create"
          />
        </CardContent>
      </Card>
    </Main>
  )
}
