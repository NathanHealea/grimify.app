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
    <section className="marketing-section">
      <div className="marketing-section-body">
        <header className="marketing-section-header">
          <p className="marketing-section-eyebrow">Features</p>
          <h2 className="marketing-section-heading">Built for miniature painters</h2>
          <p className="marketing-section-desc">
            Cross-brand search, palette building, collection tracking — every tool on one shelf.
          </p>
        </header>
        <ul className="feature-grid">
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
