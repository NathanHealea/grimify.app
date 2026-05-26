import Link from 'next/link'

import { Main } from '@/components/main'
import { PageHeader, PageTitle, PageSubtitle } from '@/components/page-header'
import { getArmyService } from '@/modules/armies/services/army-service.server'
import { ArmyTreeList } from '@/modules/armies/components/army-tree-list'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'

export const metadata = pageMetadata({
  title: 'Army management',
  description: 'Admin: manage Grimify army hierarchy.',
  path: '/admin/armies',
  noindex: true,
})

/** Admin page listing all armies in a hierarchical indented tree. */
export default async function AdminArmiesPage() {
  const service = await getArmyService()
  const tree = await service.getArmyTree()

  return (
    <Main as="div">
      <PageHeader>
        <div className="flex items-center justify-between">
          <div>
            <PageTitle>Army Management</PageTitle>
            <PageSubtitle>Manage the hierarchical army list (alliances, factions, sub-factions).</PageSubtitle>
          </div>
          <Link href="/admin/armies/new" className="btn btn-primary btn-sm">
            Add Army
          </Link>
        </div>
      </PageHeader>

      <ArmyTreeList armies={tree} />
    </Main>
  )
}
