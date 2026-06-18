import Link from 'next/link'

import { BrandStrip } from '@/modules/marketing/components/brand-strip'
import { HeroSearch } from '@/modules/marketing/components/hero-search'

/**
 * One swatch per top-level hue. The `hue` value matches the lowercase hue
 * name used by the `/paints?hue=` filter param. Hex values are representative
 * midpoints for each hue group — chosen for visual variety, not data accuracy.
 */
const HUE_SWATCHES = [
  { hue: 'red',         hex: '#C41E3A' },
  { hue: 'yellow-red',  hex: '#D4590A' },
  { hue: 'yellow',      hex: '#D4AC0D' },
  { hue: 'green-yellow',hex: '#7DB72A' },
  { hue: 'green',       hex: '#27AE60' },
  { hue: 'blue-green',  hex: '#1A8C7A' },
  { hue: 'blue',        hex: '#2E86C1' },
  { hue: 'purple-blue', hex: '#4A4FA8' },
  { hue: 'purple',      hex: '#7D3C98' },
  { hue: 'red-purple',  hex: '#A0366A' },
  { hue: 'neutral',     hex: '#717D7E' },
]

/**
 * Marketing hero for the homepage.
 *
 * Uses semantic theme tokens so it adapts to both light and dark mode.
 * The swatch strip links each colour circle to the paints page pre-filtered
 * by the corresponding hue group.
 */
export function Hero() {
  return (
    <section className="hero">
      <div className="hero-content">
        <p className="hero-eyebrow">The miniature painter&apos;s toolkit</p>
        <h1 className="hero-title">Find any miniature paint — across every brand</h1>
        <p className="hero-description">
          Search Citadel, Vallejo, Army Painter, Scale75, and more — all in one place. Build
          palettes, track your shelf, and share your recipes.
        </p>
        <div className="hero-actions">
          <HeroSearch />
          <BrandStrip />
        </div>
        <div className="hero-swatch-strip">
          {HUE_SWATCHES.map(({ hue, hex }) => (
            <Link
              key={hue}
              href={`/paints?hue=${hue}`}
              aria-label={`Browse ${hue} paints`}
              className="hero-swatch"
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
