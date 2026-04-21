import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { createCollectionService } from '@/modules/collection/services/collection-service'
import { CollectionStats } from '@/modules/collection/components/collection-stats'
import { CollectionSearch } from '@/modules/collection/components/collection-search'
import { RecentPalettesPlaceholder } from '@/modules/collection/components/recent-palettes-placeholder'

export default async function CollectionPage() {
  // auth: middleware enforces auth; redirect guard is for type narrowing only
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const service = createCollectionService(supabase)
  const [stats, recentPaints] = await Promise.all([
    service.getStats(user.id),
    service.getCollectionPaints(user.id, { limit: 10 }),
  ])

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 px-4 py-12">
      <h1 className="text-3xl font-bold">My Collection</h1>
      <CollectionStats stats={stats} />
      <CollectionSearch initialPaints={recentPaints} />
      <RecentPalettesPlaceholder />
    </div>
  )
}
