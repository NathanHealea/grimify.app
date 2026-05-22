import { notFound } from 'next/navigation'
import Link from 'next/link'

import { Main } from '@/components/main'
import { PageHeader, PageTitle, PageSubtitle } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getBrandService } from '@/modules/brands/services/brand-service.server'
import { BrandForm } from '@/modules/admin/components/brand-form'
import { ProductLineForm } from '@/modules/admin/components/product-line-form'
import { DeleteBrandButton } from '@/modules/admin/components/delete-brand-button'
import { DeleteProductLineButton } from '@/modules/admin/components/delete-product-line-button'
import { updateBrand } from '@/modules/admin/actions/brand-actions'
import { createProductLine } from '@/modules/admin/actions/product-line-actions'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'

export const metadata = pageMetadata({
  title: 'Edit brand',
  description: 'Admin: edit a Grimify paint brand.',
  noindex: true,
})

/**
 * Admin page for viewing and editing a brand and its product lines.
 *
 * Fetches the brand with product-line paint counts, renders the edit form,
 * and shows a product lines table with inline actions.
 */
export default async function AdminBrandDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const brandId = parseInt(id, 10)

  if (isNaN(brandId)) notFound()

  const service = await getBrandService()
  const brand = await service.getBrandWithProductLineCounts(brandId)

  if (!brand) notFound()

  return (
    <Main as="div">
      <div className="mb-6">
        <Link href="/admin/brands" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to brands
        </Link>
      </div>

      <PageHeader>
        <PageTitle>{brand.name}</PageTitle>
        <PageSubtitle>Edit brand details and manage product lines.</PageSubtitle>
      </PageHeader>

      <div className="space-y-6">
        {/* Edit brand form */}
        <Card>
          <CardHeader>
            <CardTitle>Brand Details</CardTitle>
          </CardHeader>
          <CardContent>
            <BrandForm action={updateBrand} defaultValues={brand} mode="edit" />
          </CardContent>
        </Card>

        {/* Product lines */}
        <Card>
          <CardHeader>
            <CardTitle>Product Lines</CardTitle>
          </CardHeader>
          <CardContent>
            {brand.product_lines.length === 0 ? (
              <p className="text-sm text-muted-foreground">No product lines yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-2 pr-4 font-medium">Name</th>
                      <th className="pb-2 pr-4 font-medium">Slug</th>
                      <th className="pb-2 pr-4 font-medium text-right">Paints</th>
                      <th className="pb-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {brand.product_lines.map((pl) => (
                      <tr key={pl.id} className="border-b border-border/50">
                        <td className="py-2 pr-4 font-medium">{pl.name}</td>
                        <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">
                          {pl.slug}
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums">{pl.paint_count}</td>
                        <td className="py-2">
                          <DeleteProductLineButton
                            productLineId={pl.id}
                            productLineName={pl.name}
                            brandId={brand.id}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add product line */}
        <Card>
          <CardHeader>
            <CardTitle>Add Product Line</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductLineForm action={createProductLine} brandId={brand.id} mode="create" />
          </CardContent>
        </Card>

        {/* Danger zone */}
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle>Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <DeleteBrandButton brandId={brand.id} brandName={brand.name} />
          </CardContent>
        </Card>
      </div>
    </Main>
  )
}
