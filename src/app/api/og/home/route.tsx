import { ImageResponse } from 'next/og'

export const runtime = 'edge'

const SIZE = { width: 1200, height: 630 } as const
const BG = '#0a0a0a'
const FG = '#fafafa'

/** Hardcoded paint swatch colours sampled from Citadel, Vallejo, and Army Painter ranges. */
const SWATCHES = [
  '#a93226', '#c0392b', '#d35400', '#e67e22', '#d4ac0d',
  '#1e8449', '#16a085', '#1a5276', '#2980b9', '#3498db',
  '#76448a', '#9b59b6',
]

/**
 * Renders a static 1200×630 OG image for the Grimify homepage.
 *
 * Shows the site tagline, a sub-line naming key supported brands, and a
 * colour-sampled swatch strip at the bottom to visually represent the paint
 * library. No entity data is fetched — this image is fully static and
 * aggressively cached.
 */
export async function GET() {
  const swatchWidth = Math.floor(SIZE.width / SWATCHES.length)

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
            padding: '0 72px',
          }}
        >
          <div style={{ fontSize: 20, opacity: 0.5, letterSpacing: 3, marginBottom: 28, display: 'flex' }}>
            GRIMIFY
          </div>
          <div style={{ fontSize: 68, fontWeight: 600, lineHeight: 1.1, display: 'flex' }}>
            Find any miniature paint
          </div>
          <div style={{ fontSize: 44, fontWeight: 400, opacity: 0.7, marginTop: 12, display: 'flex' }}>
            across every brand
          </div>
          <div style={{ fontSize: 22, opacity: 0.45, marginTop: 36, display: 'flex' }}>
            Citadel · Vallejo · Army Painter · Scale75 · and more
          </div>
        </div>
        <div style={{ display: 'flex', height: 80, width: '100%' }}>
          {SWATCHES.map((hex, i) => (
            <div
              key={i}
              style={{ width: swatchWidth, height: '100%', backgroundColor: hex, display: 'flex' }}
            />
          ))}
        </div>
      </div>
    ),
    {
      ...SIZE,
      headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' },
    },
  )
}
