import Image from 'next/image'
import { notFound } from 'next/navigation'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, bio, created_at')
    .eq('id', id)
    .single()

  if (!profile) {
    notFound()
  }

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

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
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
          <div>
            <CardTitle className="text-2xl">
              {profile.display_name ?? 'Unnamed user'}
            </CardTitle>
            {joined && (
              <p className="text-sm text-muted-foreground">
                Joined {joined}
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {profile.bio ? (
            <p className="whitespace-pre-wrap text-sm">{profile.bio}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              This user hasn&apos;t written a bio yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
