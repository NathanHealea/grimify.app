import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { Breadcrumbs } from '@/components/breadcrumbs'
import { createClient } from '@/lib/supabase/server'
import { getCollectionService } from '@/modules/collection/services/collection-service.server'
import { BrandPaintList } from '@/modules/brands/components/brand-paint-list'
import { getBrandService } from '@/modules/brands/services/brand-service.server'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const numericId = parseInt(id, 10)

  if (isNaN(numericId)) {
    return pageMetadata({ title: 'Brand not found', description: 'This brand could not be found.', noindex: true })
  }

  const brandService = await getBrandService()
  const brand = await brandService.getBrandById(numericId)

  if (!brand) {
    return pageMetadata({ title: 'Brand not found', description: 'This brand could not be found.', noindex: true })
  }

  return pageMetadata({
    title: brand.name,
    description: `Browse ${brand.name} miniature paints on Grimify.`,
    path: `/brands/${id}`,
  })
}

export default async function BrandDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numericId = parseInt(id, 10)

  if (isNaN(numericId)) {
    notFound()
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const brandService = await getBrandService()
  const brand = await brandService.getBrandById(numericId)

  if (!brand) {
    notFound()
  }

  const [productLines, paints] = await Promise.all([
    brandService.getBrandProductLines(numericId),
    brandService.getBrandPaints(numericId),
  ])

  let userPaintIds: Set<string> | undefined
  if (user) {
    const collectionService = await getCollectionService()
    userPaintIds = await collectionService.getUserPaintIds(user.id)
  }

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

      <BrandPaintList
        brandName={brand.name}
        productLines={productLines}
        paints={paints}
        userPaintIds={userPaintIds}
        isAuthenticated={user !== null}
      />
    </div>
  )
}
