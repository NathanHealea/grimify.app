import Link from 'next/link'

import type { Feature } from '@/modules/marketing/types/feature'

/**
 * A single clickable feature tile rendered on the marketing feature grid.
 * Wraps the entire card in a `<Link>` so the whole surface is the click target.
 *
 * @param props.feature - The {@link Feature} record this card represents.
 */
export function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = feature.icon
  return (
    <Link href={feature.href} aria-label={feature.title} className="card feature-card">
      <span className="feature-card-icon">
        <Icon className="size-5" />
      </span>
      <h3 className="feature-card-title">{feature.title}</h3>
      <p className="feature-card-blurb">{feature.blurb}</p>
    </Link>
  )
}
