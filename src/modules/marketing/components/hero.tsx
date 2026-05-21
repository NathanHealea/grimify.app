import { BrandStrip } from '@/modules/marketing/components/brand-strip'
import { HeroSearch } from '@/modules/marketing/components/hero-search'

/**
 * Marketing hero section for the homepage. Leads with a tagline-first headline,
 * a value-prop sub-headline, and an embedded {@link HeroSearch} island that
 * hands off to `/paints`.
 *
 * @remarks The site navbar already shows the Grimify wordmark, so the hero
 *   intentionally leads with copy instead of a duplicated logo.
 */
export function Hero() {
  return (
    <section className="border-b border-border bg-gradient-to-b from-muted/40 to-background">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4 py-16 text-center sm:py-24">
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
          Find any miniature paint — across every brand
        </h1>
        <p className="text-lg text-muted-foreground text-balance sm:text-xl">
          Search Citadel, Vallejo, Army Painter, Scale75, and more — all in one place. Build
          palettes, track your shelf, and share your recipes.
        </p>
        <div className="flex w-full flex-col gap-3 pt-2">
          <HeroSearch />
          <BrandStrip />
        </div>
      </div>
    </section>
  )
}
