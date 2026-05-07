import { ImageResponse } from 'next/og'

import { getBrandService } from '@/modules/brands/services/brand-service.server'

export const runtime = 'edge'

const SIZE = { width: 1200, height: 630 } as const
const BG = '#0a0a0a'
const FG = '#fafafa'
const MAX_SWATCHES = 10

/**
 * Renders a 1200×630 OG image for a brand detail page.
 *
 * Shows the brand name (large) and total paint count above a sampled row of
 * up to 10 paint swatches drawn from the brand's catalog. Brand logos are
 * intentionally omitted — Grimify does not host brand marks.
 *
 * Returns 404 when the brand id is invalid or missing.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numericId = parseInt(id, 10)
  if (isNaN(numericId)) {
    return new Response('Not found', { status: 404 })
  }

  const service = await getBrandService()
  const brand = await service.getBrandById(numericId)
  if (!brand) {
    return new Response('Not found', { status: 404 })
  }

  const paints = await service.getBrandPaints(numericId)
  const swatches = paints.slice(0, MAX_SWATCHES).map((p) => p.hex)
  const swatchWidth = swatches.length > 0 ? Math.floor(1200 / swatches.length) : 0

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
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
          <div style={{ fontSize: 72, fontWeight: 600, lineHeight: 1.1 }}>{brand.name}</div>
          <div style={{ fontSize: 28, opacity: 0.7, marginTop: 24 }}>
            {`${paints.length} ${paints.length === 1 ? 'paint' : 'paints'} on Grimify`}
          </div>
        </div>
        {swatches.length > 0 ? (
          <div style={{ display: 'flex', height: 200, width: '100%' }}>
            {swatches.map((hex, i) => (
              <div
                key={i}
                style={{ width: swatchWidth, height: '100%', backgroundColor: hex, display: 'flex' }}
              />
            ))}
          </div>
        ) : null}
      </div>
    ),
    {
      ...SIZE,
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=86400' },
    },
  )
}
