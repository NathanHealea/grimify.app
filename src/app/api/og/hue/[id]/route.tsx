import { ImageResponse } from 'next/og'

import { getHueService } from '@/modules/hues/services/hue-service.server'

export const runtime = 'edge'

const SIZE = { width: 1200, height: 630 } as const
const BG = '#0a0a0a'
const FG = '#fafafa'

/**
 * Renders a 1200×630 OG image for a hue detail page.
 *
 * The right half is a single 600×630 swatch in the hue's `hex_code`; the
 * left half stacks the hue name (large) and its Itten parent classification
 * (small, when available) over the dark Grimify background.
 *
 * Returns 404 when the hue does not exist.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const service = await getHueService()
  const hue = await service.getHueById(id)
  if (!hue) {
    return new Response('Not found', { status: 404 })
  }

  const parent = hue.parent_id ? await service.getHueById(hue.parent_id) : null

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          backgroundColor: BG,
          color: FG,
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '0 64px',
          }}
        >
          <div style={{ fontSize: 72, fontWeight: 600, lineHeight: 1.1 }}>{hue.name}</div>
          {parent ? (
            <div style={{ fontSize: 32, opacity: 0.7, marginTop: 24 }}>
              {`Itten: ${parent.name}`}
            </div>
          ) : null}
        </div>
        <div style={{ width: 600, height: '100%', backgroundColor: hue.hex_code, display: 'flex' }} />
      </div>
    ),
    {
      ...SIZE,
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=86400' },
    },
  )
}
