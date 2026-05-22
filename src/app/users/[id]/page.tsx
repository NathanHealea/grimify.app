import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { JsonLd } from '@/components/json-ld'
import { Main } from '@/components/main'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { MarkdownRenderer } from '@/modules/markdown/components/markdown-renderer'
import { buildOgUrl } from '@/modules/seo/utils/build-og-url'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, bio')
    .eq('id', id)
    .single()

  if (!profile) {
    return pageMetadata({ title: 'User not found', description: 'This user could not be found.', noindex: true })
  }

  const name = profile.display_name ?? 'Grimify user'
  const description = profile.bio?.slice(0, 200) ?? `${name}'s profile on Grimify.`

  return pageMetadata({
    title: name,
    description,
    path: `/users/${id}`,
    ogType: 'profile',
    image: profile.display_name
      ? {
          url: buildOgUrl('user', id),
          width: 1200,
          height: 630,
          alt: name,
        }
      : undefined,
    keywords: [name, 'Grimify painter', 'miniature painting community'],
  })
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: profile }, { data: { user: currentUser } }] = await Promise.all([
    supabase.from('profiles').select('id, display_name, avatar_url, bio, created_at').eq('id', id).single(),
    supabase.auth.getUser(),
  ])

  if (!profile) {
    notFound()
  }

  const isOwner = currentUser?.id === profile.id

  const initials = (profile.display_name ?? '?')
    .split(/\s+/)
    .map((word: string) => word[0])
    .join('')
    .slice(0, 2)

  const joined = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.display_name ?? undefined,
    description: profile.bio ?? undefined,
    url: `https://grimify.app/users/${id}`,
  }

  return (
    <Main>
      <JsonLd data={jsonLd} />
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.display_name ?? 'User avatar'}
              width={72}
              height={72}
              className="size-18 rounded-full"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="avatar avatar-lg avatar-placeholder text-xl">
              {initials}
            </span>
          )}
          <div className="flex-1">
            <CardTitle className="text-2xl">
              {profile.display_name ?? 'Unnamed user'}
            </CardTitle>
            {joined && (
              <p className="text-sm text-muted-foreground">
                Joined {joined}
              </p>
            )}
          </div>
          {isOwner && (
            <Link href="/profile/edit" className="btn btn-outline btn-sm ml-auto">
              Edit profile
            </Link>
          )}
        </CardHeader>
        <CardContent>
          {profile.bio ? (
            <MarkdownRenderer content={profile.bio} />
          ) : (
            <p className="text-sm text-muted-foreground italic">
              This user hasn&apos;t written a bio yet.
            </p>
          )}
        </CardContent>
      </Card>
    </Main>
  )
}
