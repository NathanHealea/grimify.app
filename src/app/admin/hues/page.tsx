import Link from 'next/link'

import { Main } from '@/components/main'
import { PageHeader, PageTitle, PageSubtitle } from '@/components/page-header'
import { getHueService } from '@/modules/hues/services/hue-service.server'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'

export const metadata = pageMetadata({
  title: 'Hue management',
  description: 'Admin: manage paint hues.',
  path: '/admin/hues',
  noindex: true,
})

/** Admin page listing all parent hues with child counts, paint counts, and actions. */
export default async function AdminHuesPage() {
  const service = await getHueService()
  const hues = await service.getParentHuesWithCounts()

  return (
    <Main as="div">
      <PageHeader>
        <div className="flex items-center justify-between">
          <div>
            <PageTitle>Hue Management</PageTitle>
            <PageSubtitle>Manage Munsell principal hues and ISCC-NBS sub-hues.</PageSubtitle>
          </div>
          <Link href="/admin/hues/new" className="btn btn-primary btn-sm">
            New Hue
          </Link>
        </div>
      </PageHeader>

      {hues.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hues found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-2 pr-3 font-medium w-8">Swatch</th>
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 pr-4 font-medium">Slug</th>
                <th className="pb-2 pr-4 font-medium text-right">Child Hues</th>
                <th className="pb-2 pr-4 font-medium text-right">Paints</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {hues.map((hue) => (
                <tr key={hue.id} className="border-b border-border/50">
                  <td className="py-2 pr-3">
                    <span
                      className="inline-block h-6 w-6 rounded border border-border"
                      style={{ backgroundColor: hue.hex_code }}
                      aria-hidden="true"
                    />
                  </td>
                  <td className="py-2 pr-4 font-medium">{hue.name}</td>
                  <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">
                    {hue.slug}
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums">{hue.child_count}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{hue.paint_count}</td>
                  <td className="py-2">
                    <Link href={`/admin/hues/${hue.id}`} className="btn btn-ghost btn-sm">
                      Edit
                    </Link>
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
