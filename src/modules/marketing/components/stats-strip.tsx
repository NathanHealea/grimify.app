/**
 * Static social-proof stat row rendered between the feature grid and the CTA section.
 *
 * @remarks Values are hardcoded for now.
 *   TODO: replace with live counts from the database once user growth warrants it.
 */
export function StatsStrip() {
  const stats = [
    { value: '2,300+', label: 'paints indexed' },
    { value: '5', label: 'supported brands' },
    { value: 'Free', label: 'to browse — always' },
  ]
  return (
    <section className="border-b border-border">
      <div className="mx-auto flex w-full max-w-3xl flex-wrap justify-center gap-8 px-4 py-10 text-center">
        {stats.map(({ value, label }) => (
          <div key={label} className="flex flex-col gap-1">
            <span className="text-2xl font-semibold tracking-tight">{value}</span>
            <span className="text-sm text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
