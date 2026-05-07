import Link from 'next/link'

import type { Feature } from '@/modules/marketing/types/feature'

/**
 * A single clickable feature tile rendered on the marketing feature grid.
 * Wraps the entire card in a `<Link>` so the whole surface is the click
 * target.
 *
 * @param props.feature - The {@link Feature} record this card represents.
 */
export function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = feature.icon
  return (
    <Link
      href={feature.href}
      aria-label={feature.title}
      className="card group flex h-full flex-col gap-3 p-6 transition-colors hover:border-primary/50 hover:bg-muted/40"
    >
      <span className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-5" />
      </span>
      <h3 className="text-lg font-semibold leading-none tracking-tight">{feature.title}</h3>
      <p className="text-sm text-muted-foreground">{feature.blurb}</p>
    </Link>
  )
}
