import Link from 'next/link'

import { BrandStrip } from '@/modules/marketing/components/brand-strip'
import { HeroSearch } from '@/modules/marketing/components/hero-search'

/**
 * One swatch per top-level hue. The `hue` value matches the lowercase hue
 * name used by the `/paints?hue=` filter param. Hex values are representative
 * midpoints for each hue group — chosen for visual variety, not data accuracy.
 */
const HUE_SWATCHES = [
  { hue: 'red',          hex: '#FF0000' },
  { hue: 'yellow-red',   hex: '#FF8C00' },
  { hue: 'yellow',       hex: '#FFFF00' },
  { hue: 'green-yellow', hex: '#9ACD32' },
  { hue: 'green',        hex: '#008000' },
  { hue: 'blue-green',   hex: '#008080' },
  { hue: 'blue',         hex: '#0000FF' },
  { hue: 'purple-blue',  hex: '#4B0082' },
  { hue: 'purple',       hex: '#800080' },
  { hue: 'red-purple',   hex: '#FF00FF' },
  { hue: 'neutral',      hex: '#808080' },
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
