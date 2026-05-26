import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Main } from '@/components/main'
import { PageHeader, PageTitle, PageSubtitle } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getArmyService } from '@/modules/armies/services/army-service.server'
import { ArmyForm } from '@/modules/armies/components/army-form'
import { updateArmy } from '@/modules/armies/actions/update-army'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'

export const metadata = pageMetadata({
  title: 'Edit army',
  description: 'Admin: edit an army.',
  noindex: true,
})

/**
 * Admin page for viewing and editing an existing army.
 *
 * Fetches the army by ID (404 if not found) and the full army tree for the
 * parent selector. Renders {@link ArmyForm} in edit mode.
 */
export default async function AdminArmyEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const service = await getArmyService()

  const [army, tree] = await Promise.all([
    service.getArmyById(id),
    service.getArmyTree(),
  ])

  if (!army) notFound()

  return (
    <Main as="div">
      <PageHeader>
        <div className="flex items-center gap-2">
          <Link href="/admin/armies" className="btn btn-ghost btn-sm">
            ← Armies
          </Link>
          <div>
            <PageTitle>{army.name}</PageTitle>
            <PageSubtitle>Edit army details.</PageSubtitle>
          </div>
        </div>
      </PageHeader>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Army Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ArmyForm mode="edit" army={army} armies={tree} action={updateArmy} />
        </CardContent>
      </Card>
    </Main>
  )
}
