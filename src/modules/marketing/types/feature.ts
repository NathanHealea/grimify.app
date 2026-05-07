import type { LucideIcon } from 'lucide-react'

/**
 * A marketing feature card definition rendered on the homepage feature grid.
 *
 * @remarks Each entry maps 1:1 to a {@link FeatureCard} on the landing page
 *   and is sourced from the static list in `utils/features.ts`.
 */
export type Feature = {
  /** Slug used for keys and analytics — e.g., `'color-wheel'`. */
  slug: string
  /** Card title — keep to ~3 words. */
  title: string
  /** One-line blurb explaining the feature. */
  blurb: string
  /** lucide-react icon component rendered at the top of the card. */
  icon: LucideIcon
  /** Destination route the card links to. */
  href: string
}
