import Link from 'next/link'

import { Main } from '@/components/main'
import { createClient } from '@/lib/supabase/server'
import { CollectionPaintGrid } from '@/modules/collection/components/collection-paint-grid'
import { getCollectionService } from '@/modules/collection/services/collection-service.server'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'

export const metadata = pageMetadata({
  title: 'Collection paints',
  description: 'Browse the paints in your Grimify collection.',
  path: '/collection/paints',
  noindex: true,
})

/** Valid page sizes that the paginated grid supports. */
const VALID_SIZES = [25, 50, 100, 200]

export default async function CollectionPaintsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; size?: string }>
}) {
  const { page, size } = await searchParams
  const pageSize = VALID_SIZES.includes(Number(size)) ? Number(size) : 50
  const currentPage = Math.max(1, parseInt(page ?? '1', 10) || 1)
  const offset = (currentPage - 1) * pageSize

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Middleware guarantees an authenticated user on this route
  const userId = user!.id

  const collectionService = await getCollectionService()

  const [initialPaints, totalCount, userPaintIds] = await Promise.all([
    collectionService.getCollectionPaints(userId, { limit: pageSize, offset }),
    collectionService.getCollectionPaintCount(userId),
    collectionService.getUserPaintIds(userId),
  ])

  return (
    <Main width="6xl">
      <div className="mb-8 flex flex-col gap-4">
        <h1 className="text-3xl font-bold">My Collection</h1>
        <p className="text-sm text-muted-foreground">
          {totalCount === 0
            ? 'No paints in your collection yet.'
            : `${totalCount.toLocaleString()} ${totalCount === 1 ? 'paint' : 'paints'} in your collection.`}
        </p>
      </div>

      {totalCount === 0 ? (
        <p className="text-sm text-muted-foreground">
          Browse the <Link href="/paints" className="underline underline-offset-4">paint library</Link> and click the bookmark icon to add paints.
        </p>
      ) : (
        <CollectionPaintGrid
          initialPaints={initialPaints}
          totalCount={totalCount}
          userPaintIds={userPaintIds}
        />
      )}
    </Main>
  )
}
