import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { Breadcrumbs } from '@/components/breadcrumbs'
import { Main } from '@/components/main'
import { createClient } from '@/lib/supabase/server'
import { getCollectionService } from '@/modules/collection/services/collection-service.server'
import { BrandPaintList } from '@/modules/brands/components/brand-paint-list'
import { getBrandService } from '@/modules/brands/services/brand-service.server'
import { buildOgUrl } from '@/modules/seo/utils/build-og-url'
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

  const supabase = await createClient()
  const { count } = await supabase
    .from('paints')
    .select('id, product_lines!inner(brand_id)', { count: 'exact', head: true })
    .eq('product_lines.brand_id', numericId)
  const paintCount = count ?? 0

  return pageMetadata({
    title: brand.name,
    description: `${brand.name} miniature paints on Grimify. ${paintCount} ${paintCount === 1 ? 'paint' : 'paints'}.`,
    path: `/brands/${id}`,
    image: {
      url: buildOgUrl('brand', numericId),
      width: 1200,
      height: 630,
      alt: brand.name,
    },
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
    <Main>
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
    </Main>
  )
}
