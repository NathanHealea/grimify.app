import { notFound } from 'next/navigation'

import { Breadcrumbs } from '@/components/breadcrumbs'
import { BrandPaintList } from '@/modules/brands/components/brand-paint-list'
import { getBrandService } from '@/modules/brands/services/brand-service.server'

export default async function BrandDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numericId = parseInt(id, 10)

  if (isNaN(numericId)) {
    notFound()
  }

  const brandService = await getBrandService()
  const brand = await brandService.getBrandById(numericId)

  if (!brand) {
    notFound()
  }

  const [productLines, paints] = await Promise.all([
    brandService.getBrandProductLines(numericId),
    brandService.getBrandPaints(numericId),
  ])

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <Breadcrumbs items={[{ label: 'Brands', href: '/brands' }, { label: brand.name }]} />
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="text-3xl font-bold">{brand.name}</h1>
        {brand.website_url && (
          <a
            href={brand.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary underline hover:text-primary/80"
          >
            {brand.website_url}
          </a>
        )}
      </div>

      <BrandPaintList brandName={brand.name} productLines={productLines} paints={paints} />
    </div>
  )
}
