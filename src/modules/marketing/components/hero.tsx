import { BrandStrip } from '@/modules/marketing/components/brand-strip'
import { HeroSearch } from '@/modules/marketing/components/hero-search'

/**
 * Representative paint hex values rendered as a decorative swatch strip.
 * Drawn from common miniature painting palettes across reds, blues, greens,
 * browns, purples, and neutrals to suggest the breadth of the colour database.
 */
const HERO_PAINT_COLORS = [
  '#8B0000', '#C41E3A', '#B03A2E', '#1B4F72',
  '#2E86C1', '#1A5C38', '#27AE60', '#784212',
  '#D4AC0D', '#7D3C98', '#717D7E', '#2C3E50',
]

/**
 * Dark full-bleed marketing hero for the homepage.
 *
 * Rendered on a fixed dark surface (`.hero`) with the `.dark` context class so
 * all semantic tokens — input borders, primary gold CTA, muted text — resolve
 * to dark-mode values regardless of the visitor's OS colour-scheme preference.
 *
 * The {@link HERO_PAINT_COLORS} swatch strip visually communicates the breadth
 * of the paint database before the visitor types a character.
 *
 * @remarks The site navbar already shows the Grimify wordmark; this hero leads
 *   with copy rather than a duplicated logo.
 */
export function Hero() {
  return (
    <section className="dark hero">
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
        <div aria-hidden className="hero-swatch-strip">
          {HERO_PAINT_COLORS.map((hex) => (
            <div key={hex} className="hero-swatch" style={{ backgroundColor: hex }} />
          ))}
        </div>
      </div>
    </section>
  )
}
