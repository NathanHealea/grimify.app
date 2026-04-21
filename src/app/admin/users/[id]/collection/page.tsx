import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { AdminAddPaintForm } from '@/modules/admin/components/admin-add-paint-form'
import { AdminUserCollectionSearch } from '@/modules/admin/components/admin-user-collection-search'
import { getUserCollection } from '@/modules/admin/services/collection-service'

export default async function AdminUserCollectionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  if (!currentUser) return null

  const collection = await getUserCollection(id)

  if (!collection) notFound()

  const { profile, paints, count } = collection
  const isSelf = currentUser.id === id
  const displayName = profile.display_name ?? profile.email ?? 'Unknown user'

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

      <div className="mb-8 flex items-center gap-4">
        {profile.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt={displayName}
            width={48}
            height={48}
            className="size-12 rounded-full object-cover"
          />
        ) : (
          <div className="flex size-12 items-center justify-center rounded-full bg-muted text-lg font-semibold uppercase text-muted-foreground">
            {displayName.charAt(0)}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold">{displayName}</h1>
          {profile.email && profile.display_name && (
            <p className="text-sm text-muted-foreground">{profile.email}</p>
          )}
        </div>
        <span className="ml-auto rounded-full bg-muted px-3 py-1 text-sm font-medium">
          {count} {count === 1 ? 'paint' : 'paints'}
        </span>
      </div>

      {isSelf ? (
        <p className="mb-6 rounded-md border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          This is your own collection. Use{' '}
          <Link href="/collection" className="underline hover:text-foreground">
            your collection page
          </Link>{' '}
          to manage it.
        </p>
      ) : (
        <div className="mb-8">
          <AdminAddPaintForm userId={id} />
        </div>
      )}

      <AdminUserCollectionSearch userId={id} initialPaints={paints} />
    </div>
  )
}
