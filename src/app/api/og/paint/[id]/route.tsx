import { ImageResponse } from 'next/og'

import { getPaintService } from '@/modules/paints/services/paint-service.server'

export const runtime = 'edge'

const SIZE = { width: 1200, height: 630 } as const
const BG = '#0a0a0a'
const FG = '#fafafa'

/**
 * Renders a 1200×630 OG image for a paint detail page.
 *
 * The left half is a solid swatch in `paint.hex`; the right half stacks
 * brand name (small, 70% opacity), paint name (large, semibold), and the
 * uppercase hex (small, 60% opacity) over the dark Grimify background.
 *
 * Returns 404 when the paint does not exist so social platforms can skip
 * the image instead of caching a placeholder.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const service = await getPaintService()
  const paint = await service.getPaintById(id)

  if (!paint) {
    return new Response('Not found', { status: 404 })
  }

  const brandName = paint.product_lines?.brands?.name ?? ''
  const hex = paint.hex.toUpperCase()

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
        <div style={{ width: 600, height: '100%', backgroundColor: paint.hex, display: 'flex' }} />
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '0 64px',
          }}
        >
          {brandName ? (
            <div style={{ fontSize: 32, opacity: 0.7, marginBottom: 24 }}>{brandName}</div>
          ) : null}
          <div style={{ fontSize: 72, fontWeight: 600, lineHeight: 1.1 }}>{paint.name}</div>
          <div style={{ fontSize: 28, opacity: 0.6, marginTop: 32, letterSpacing: 4 }}>{hex}</div>
        </div>
      </div>
    ),
    {
      ...SIZE,
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=86400' },
    },
  )
}
