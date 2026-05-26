import Link from 'next/link'

import { Main } from '@/components/main'
import { PageHeader, PageTitle, PageSubtitle } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getArmyService } from '@/modules/armies/services/army-service.server'
import { ArmyForm } from '@/modules/armies/components/army-form'
import { createArmy } from '@/modules/armies/actions/create-army'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'

export const metadata = pageMetadata({
  title: 'New army',
  description: 'Admin: create a new army.',
  path: '/admin/armies/new',
  noindex: true,
})

/** Admin page for creating a new army. */
export default async function AdminArmyNewPage() {
  const service = await getArmyService()
  const tree = await service.getArmyTree()

  return (
    <Main as="div">
      <PageHeader>
        <div className="flex items-center gap-2">
          <Link href="/admin/armies" className="btn btn-ghost btn-sm">
            ← Armies
          </Link>
          <div>
            <PageTitle>New Army</PageTitle>
            <PageSubtitle>Add a new alliance, faction, or sub-faction.</PageSubtitle>
          </div>
        </div>
      </PageHeader>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Army Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ArmyForm mode="create" armies={tree} action={createArmy} />
        </CardContent>
      </Card>
    </Main>
  )
}
