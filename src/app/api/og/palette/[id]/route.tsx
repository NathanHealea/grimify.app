import { ImageResponse } from 'next/og'

import { createClient } from '@/lib/supabase/server'
import { createPaletteService } from '@/modules/palettes/services/palette-service'

export const runtime = 'edge'

const SIZE = { width: 1200, height: 630 } as const
const BG = '#0a0a0a'
const FG = '#fafafa'
const MAX_SWATCHES = 10

/**
 * Renders a 1200×630 OG image for a public palette.
 *
 * The top of the card shows the palette name and owner; the bottom is a
 * horizontal strip of up to 10 paint swatches. Palettes with more paints get a
 * trailing `+N more` tile.
 *
 * Returns 404 when the palette is missing or private — RLS already filters
 * private rows for anonymous crawlers, but the explicit `is_public` check
 * is defense-in-depth in case policies drift.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const service = createPaletteService(supabase)
  const palette = await service.getPaletteById(id)

  if (!palette || !palette.isPublic) {
    return new Response('Not found', { status: 404 })
  }

  const { data: ownerProfile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', palette.userId)
    .single()

  const swatches = palette.paints
    .map((p) => p.paint?.hex)
    .filter((hex): hex is string => Boolean(hex))
  const visibleSwatches = swatches.slice(0, MAX_SWATCHES)
  const overflow = swatches.length - visibleSwatches.length
  const swatchCount = visibleSwatches.length + (overflow > 0 ? 1 : 0)
  const swatchWidth = swatchCount > 0 ? Math.floor(1200 / swatchCount) : 0

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
          <div style={{ fontSize: 72, fontWeight: 600, lineHeight: 1.1 }}>{palette.name}</div>
          <div style={{ fontSize: 28, opacity: 0.7, marginTop: 24 }}>
            {`${palette.paints.length} ${palette.paints.length === 1 ? 'paint' : 'paints'}`}
            {ownerProfile?.display_name ? ` · by ${ownerProfile.display_name}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', height: 220, width: '100%' }}>
          {visibleSwatches.map((hex, i) => (
            <div key={i} style={{ width: swatchWidth, height: '100%', backgroundColor: hex, display: 'flex' }} />
          ))}
          {overflow > 0 ? (
            <div
              style={{
                width: swatchWidth,
                height: '100%',
                backgroundColor: '#1a1a1a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                opacity: 0.8,
              }}
            >
              {`+${overflow} more`}
            </div>
          ) : null}
        </div>
      </div>
    ),
    {
      ...SIZE,
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=86400' },
    },
  )
}
