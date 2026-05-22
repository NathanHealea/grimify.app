import { Main } from '@/components/main'
import { PageHeader, PageTitle, PageSubtitle } from '@/components/page-header'
import { BrandCard } from '@/modules/brands/components/brand-card'
import { getBrandService } from '@/modules/brands/services/brand-service.server'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'

export const metadata = pageMetadata({
  title: 'Brands',
  description:
    'Browse every Citadel, Vallejo, Army Painter, Scale75 and 10+ other miniature paint ranges — full product lines in one place.',
  path: '/brands',
  image: { url: '/og-image.png', width: 1200, height: 630, alt: 'Grimify — Find any miniature paint across every brand' },
  keywords: [
    'miniature paint brands',
    'Citadel',
    'Vallejo',
    'Army Painter',
    'Scale75',
    'Reaper',
    'paint manufacturer comparison',
  ],
})

export default async function BrandsPage() {
  const brandService = await getBrandService()
  const brands = await brandService.getAllBrands()

  return (
    <Main>
      <PageHeader>
        <PageTitle>Brands</PageTitle>
        <PageSubtitle>Browse paint brands and their product lines.</PageSubtitle>
      </PageHeader>

      {brands.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {brands.map((brand) => (
            <BrandCard key={brand.id} brand={brand} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No brands yet.</p>
      )}
    </Main>
  )
}
