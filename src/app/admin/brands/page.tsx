import Link from 'next/link'

import { Main } from '@/components/main'
import { PageHeader, PageTitle, PageSubtitle } from '@/components/page-header'
import { getBrandService } from '@/modules/brands/services/brand-service.server'
import { DeleteBrandButton } from '@/modules/admin/components/delete-brand-button'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'

export const metadata = pageMetadata({
  title: 'Brand management',
  description: 'Admin: manage Grimify paint brands.',
  path: '/admin/brands',
  noindex: true,
})

/** Admin page listing all brands with their paint counts and actions. */
export default async function AdminBrandsPage() {
  const service = await getBrandService()
  const brands = await service.getAllBrands()

  return (
    <Main as="div">
      <PageHeader>
        <div className="flex items-center justify-between">
          <div>
            <PageTitle>Brand Management</PageTitle>
            <PageSubtitle>Manage paint brands and product lines.</PageSubtitle>
          </div>
          <Link href="/admin/brands/new" className="btn btn-primary btn-sm">
            New Brand
          </Link>
        </div>
      </PageHeader>

      {brands.length === 0 ? (
        <p className="text-sm text-muted-foreground">No brands found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 pr-4 font-medium">Slug</th>
                <th className="pb-2 pr-4 font-medium">Website</th>
                <th className="pb-2 pr-4 font-medium text-right">Paints</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {brands.map((brand) => (
                <tr key={brand.id} className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium">{brand.name}</td>
                  <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">
                    {brand.slug}
                  </td>
                  <td className="py-2 pr-4">
                    {brand.website_url ? (
                      <a
                        href={brand.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {new URL(brand.website_url).hostname}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums">{brand.paint_count}</td>
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/brands/${brand.id}`} className="btn btn-ghost btn-sm">
                        Edit
                      </Link>
                      <DeleteBrandButton brandId={brand.id} brandName={brand.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Main>
  )
}
