import Link from 'next/link'
import { notFound } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { AdminCollectionClient } from '@/modules/admin/components/admin-collection-client'
import { getAdminCollectionPageData } from '@/modules/admin/services/collection-service'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'

const DEFAULT_PAGE_SIZE = 25

export const metadata = pageMetadata({
  title: 'User collection',
  description: 'Admin view of a user\'s paint collection.',
  noindex: true,
})

export default async function AdminUserCollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams])

  const supabase = await createClient()
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  if (!currentUser) return null

  const q = typeof sp.q === 'string' ? sp.q : ''
  const page = Math.max(1, Number(sp.page ?? '1'))
  const size = [25, 50, 100, 200].includes(Number(sp.size)) ? Number(sp.size) : DEFAULT_PAGE_SIZE

  const { profile, initialPaints, totalCount } = await getAdminCollectionPageData(id, {
    limit: size,
    offset: (page - 1) * size,
  })

  if (!profile) notFound()

  const isSelf = currentUser.id === id

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12">
      <div className="mb-6">
        <Link
          href={`/admin/users/${id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to user
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          {profile.display_name ?? profile.email ?? 'Unknown user'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {totalCount} {totalCount === 1 ? 'paint' : 'paints'} in collection
        </p>
      </div>

      <AdminCollectionClient
        userId={id}
        isSelf={isSelf}
        initialPaints={initialPaints}
        initialTotalCount={totalCount}
        initialQuery={q}
        initialPage={page}
        initialSize={size}
      />
    </div>
  )
}
