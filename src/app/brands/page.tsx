import { BrandCard } from '@/modules/brands/components/brand-card'
import { getBrandService } from '@/modules/brands/services/brand-service.server'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'

export const metadata = pageMetadata({
  title: 'Brands',
  description: 'Browse miniature paint brands and their product lines on Grimify.',
  path: '/brands',
})

export default async function BrandsPage() {
  const brandService = await getBrandService()
  const brands = await brandService.getAllBrands()

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Brands</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Browse paint brands and their product lines.
        </p>
      </div>

      {brands.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {brands.map((brand) => (
            <BrandCard key={brand.id} brand={brand} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No brands yet.</p>
      )}
    </div>
  )
}
