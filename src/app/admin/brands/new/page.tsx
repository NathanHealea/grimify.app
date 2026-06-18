import Link from 'next/link'

import { Main } from '@/components/main'
import { PageHeader, PageTitle, PageSubtitle } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BrandForm } from '@/modules/admin/components/brand-form'
import { createBrand } from '@/modules/admin/actions/brand-actions'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'

export const metadata = pageMetadata({
  title: 'New brand',
  description: 'Admin: create a new Grimify paint brand.',
  path: '/admin/brands/new',
  noindex: true,
})

/** Admin page for creating a new brand. */
export default function AdminBrandNewPage() {
  return (
    <Main as="div">
      <div className="mb-6">
        <Link href="/admin/brands" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to brands
        </Link>
      </div>

      <PageHeader>
        <PageTitle>New Brand</PageTitle>
        <PageSubtitle>Add a new paint manufacturer.</PageSubtitle>
      </PageHeader>

      <Card>
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
