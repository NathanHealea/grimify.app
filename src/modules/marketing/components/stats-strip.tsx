/**
 * Static social-proof stat row rendered between the feature grid and the CTA section.
 *
 * @remarks Values are hardcoded for now.
 *   TODO: replace with live counts from the database once user growth warrants it.
 */
export function StatsStrip() {
  const stats = [
    { value: '2,800+', label: 'paints indexed — and growing' },
    { value: '6',      label: 'supported brands — expanding' },
    { value: 'Free',   label: 'to browse — always' },
  ]

  return (
    <section className="marketing-section marketing-section-muted">
      <div className="marketing-section-body-sm">
        <dl className="marketing-stats">
          {stats.map(({ value, label }) => (
            <div key={label} className="marketing-stat">
              <dt className="marketing-stat-value">{value}</dt>
              <dd className="marketing-stat-label">{label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
