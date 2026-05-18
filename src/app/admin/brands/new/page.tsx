import Link from 'next/link'

import { Main } from '@/components/main'
import { PageHeader, PageTitle, PageSubtitle } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BrandForm } from '@/modules/admin/components/brand-form'
import { createBrand } from '@/modules/admin/actions/brand-actions'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'

export const metadata = pageMetadata({
  title: 'New brand',
  description: 'Admin: create a new paint brand.',
  path: '/admin/brands/new',
  noindex: true,
})

/** Admin page for creating a new brand. */
export default function AdminBrandNewPage() {
  return (
    <Main as="div">
      <PageHeader>
        <div className="flex items-center gap-2">
          <Link href="/admin/brands" className="btn btn-ghost btn-sm">
            ← Brands
          </Link>
          <div>
            <PageTitle>New Brand</PageTitle>
            <PageSubtitle>Add a new paint manufacturer.</PageSubtitle>
          </div>
        </div>
      </PageHeader>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Brand Details</CardTitle>
        </CardHeader>
        <CardContent>
          <BrandForm action={createBrand} mode="create" />
        </CardContent>
      </Card>
    </Main>
  )
}
