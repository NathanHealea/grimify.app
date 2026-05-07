import { FeatureCard } from '@/modules/marketing/components/feature-card'
import { features } from '@/modules/marketing/utils/features'

/**
 * Marketing feature section. Renders a responsive grid of {@link FeatureCard}s
 * sourced from the static {@link features} list.
 *
 * @remarks Layout: 1 column on mobile, 2 columns on tablet (`sm`), and 3
 *   columns on desktop (`lg`).
 */
export function FeatureGrid() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Everything in one place
          </h2>
          <p className="mt-3 text-base text-muted-foreground text-balance">
            From discovery to documentation — the tools to research, plan, and share what you
            paint.
          </p>
        </div>
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <li key={feature.slug}>
              <FeatureCard feature={feature} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
