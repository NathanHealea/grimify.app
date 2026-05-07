import { ImageResponse } from 'next/og'

import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

const SIZE = { width: 1200, height: 630 } as const
const BG = '#0a0a0a'
const FG = '#fafafa'
const BIO_LIMIT = 140

/**
 * Renders a 1200×630 OG image for a user profile page.
 *
 * The left half stacks the avatar (or initials tile) above the display name;
 * the right half shows a bio truncated to {@link BIO_LIMIT} characters. Returns
 * 404 when the profile is missing or has no `display_name` so we never leak
 * partially-set-up profiles into social previews.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, bio, avatar_url')
    .eq('id', id)
    .single()

  if (!profile?.display_name) {
    return new Response('Not found', { status: 404 })
  }

  const initials = profile.display_name
    .split(/\s+/)
    .map((word: string) => word[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const bio =
    profile.bio && profile.bio.length > BIO_LIMIT
      ? `${profile.bio.slice(0, BIO_LIMIT - 1)}…`
      : profile.bio ?? ''

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          backgroundColor: BG,
          color: FG,
          padding: 64,
        }}
      >
        <div
          style={{
            width: 480,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 32,
          }}
        >
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- next/og satori only supports <img>, not next/image.
            <img
              src={profile.avatar_url}
              width={240}
              height={240}
              style={{ borderRadius: 240, objectFit: 'cover' }}
              alt=""
            />
          ) : (
            <div
              style={{
                width: 240,
                height: 240,
                borderRadius: 240,
                backgroundColor: '#1f2937',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 96,
                fontWeight: 600,
              }}
            >
              {initials || '?'}
            </div>
          )}
          <div style={{ fontSize: 44, fontWeight: 600, textAlign: 'center', lineHeight: 1.1 }}>
            {profile.display_name}
          </div>
        </div>
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '0 32px',
          }}
        >
          {bio ? (
            <div style={{ fontSize: 32, opacity: 0.85, lineHeight: 1.35 }}>{bio}</div>
          ) : (
            <div style={{ fontSize: 32, opacity: 0.6 }}>Grimify community member</div>
          )}
        </div>
      </div>
    ),
    {
      ...SIZE,
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=86400' },
    },
  )
}
