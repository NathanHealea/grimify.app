import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Main } from '@/components/main'
import { PageHeader, PageSubtitle, PageTitle } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { updateHue } from '@/modules/admin/actions/hue-actions'
import { AddPaintsToHue } from '@/modules/admin/components/add-paints-to-hue'
import { DeleteHueButton } from '@/modules/admin/components/delete-hue-button'
import { HueForm } from '@/modules/admin/components/hue-form'
import { HuePaintList } from '@/modules/admin/components/hue-paint-list'
import { getHueService } from '@/modules/hues/services/hue-service.server'
import { getPaintService } from '@/modules/paints/services/paint-service.server'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'

export const metadata = pageMetadata({
  title: 'Edit hue',
  description: 'Admin: edit a Grimify hue.',
  noindex: true,
})

/**
 * Admin page for viewing and editing a hue (parent or child).
 *
 * For parent hues: shows child hues with an "Add Child Hue" link, and
 * paints associated with any child hue.
 * For child hues: shows paints directly assigned to this hue.
 */
export default async function AdminHueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const hueService = await getHueService()
  const paintService = await getPaintService()

  const hue = await hueService.getHueById(id)
  if (!hue) notFound()

  const isParent = hue.parent_id === null

  // Fetch child hues and paint counts
  let childHues: Awaited<ReturnType<typeof hueService.getChildHues>> = []
  let paints: Awaited<ReturnType<typeof paintService.getPaintsByHueIds>> = []
  let childCount = 0
  let paintCount = 0

  if (isParent) {
    childHues = await hueService.getChildHues(id)
    childCount = childHues.length

    if (childHues.length > 0) {
      const childIds = childHues.map((c) => c.id)
      paints = await paintService.getPaintsByHueIds(childIds)
    }
    paintCount = paints.length
  } else {
    paints = await paintService.getPaintsByHueIds([id])
    paintCount = paints.length
  }

  return (
    <Main as="div">
      <div className="mb-6">
        <Link href="/admin/hues" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to hues
        </Link>
      </div>

      <PageHeader>
        <PageTitle>{hue.name}</PageTitle>
        <PageSubtitle>
          {isParent ? 'Parent hue — edit and manage child hues.' : 'Child hue — edit and manage paint associations.'}
        </PageSubtitle>
      </PageHeader>

      <div className="space-y-6">
        {/* Edit hue form */}
        <Card>
          <CardHeader>
            <CardTitle>Hue Details</CardTitle>
          </CardHeader>
          <CardContent>
            <HueForm action={updateHue} parentId={hue.parent_id ?? undefined} defaultValues={hue} mode="edit" />
          </CardContent>
        </Card>

        {/* Child hues (parent hues only) */}
        {isParent && (
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Child Hues</h2>
                  <Link href={`/admin/hues/new?parent_id=${hue.id}`} className="btn btn-primary btn-sm">
                    Add Child Hue
                  </Link>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {childHues.length === 0 ? (
                <p className="text-sm text-muted-foreground">No child hues yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="pb-2 pr-3 w-8">Swatch</th>
                        <th className="pb-2 pr-4 font-medium">Name</th>
                        <th className="pb-2 pr-4 font-medium">Slug</th>
                        <th className="pb-2 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {childHues.map((child) => (
                        <tr key={child.id} className="border-b border-border/50">
                          <td className="py-2 pr-3">
                            <span
                              className="inline-block h-5 w-5 rounded border border-border"
                              style={{ backgroundColor: child.hex_code }}
                              aria-hidden="true"
                            />
                          </td>
                          <td className="py-2 pr-4 font-medium">{child.name}</td>
                          <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">{child.slug}</td>
                          <td className="py-2">
                            <Link href={`/admin/hues/${child.id}`} className="btn btn-ghost btn-sm">
                              Edit
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Add paints to hue */}
        <Card>
          <CardHeader>
            <CardTitle>Add Paints to Hue</CardTitle>
          </CardHeader>
          <CardContent>
            <AddPaintsToHue hueId={hue.id} />
          </CardContent>
        </Card>

        {/* Associated paints */}
        <Card>
          <CardHeader>
            <CardTitle>Associated Paints</CardTitle>
          </CardHeader>
          <CardContent>
            {paints.length === 0 ? (
              <p className="text-sm text-muted-foreground">No paints associated with this hue.</p>
            ) : (
              <HuePaintList paints={paints} hueId={hue.id} />
            )}
          </CardContent>
        </Card>

        {/* Danger zone */}
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle>Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <DeleteHueButton hueId={hue.id} hueName={hue.name} childCount={childCount} paintCount={paintCount} />
          </CardContent>
        </Card>
      </div>
    </Main>
  )
}
