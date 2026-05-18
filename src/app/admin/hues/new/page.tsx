import Link from 'next/link'

import { Main } from '@/components/main'
import { PageHeader, PageTitle, PageSubtitle } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { HueForm } from '@/modules/admin/components/hue-form'
import { createHue } from '@/modules/admin/actions/hue-actions'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'

export const metadata = pageMetadata({
  title: 'New hue',
  description: 'Admin: create a new hue.',
  path: '/admin/hues/new',
  noindex: true,
})

/**
 * Admin page for creating a new hue.
 *
 * Accepts an optional `?parent_id` query param to pre-set the parent hue
 * when creating a child hue.
 */
export default async function AdminHueNewPage({
  searchParams,
}: {
  searchParams: Promise<{ parent_id?: string }>
}) {
  const { parent_id } = await searchParams

  return (
    <Main as="div">
      <PageHeader>
        <div className="flex items-center gap-2">
          <Link href="/admin/hues" className="btn btn-ghost btn-sm">
            ← Hues
          </Link>
          <div>
            <PageTitle>{parent_id ? 'New Child Hue' : 'New Hue'}</PageTitle>
            <PageSubtitle>
              {parent_id ? 'Add an ISCC-NBS sub-hue.' : 'Add a Munsell principal hue.'}
            </PageSubtitle>
          </div>
        </div>
      </PageHeader>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Hue Details</CardTitle>
        </CardHeader>
        <CardContent>
          <HueForm
            action={createHue}
            parentId={parent_id ?? undefined}
            mode="create"
          />
        </CardContent>
      </Card>
    </Main>
  )
}
