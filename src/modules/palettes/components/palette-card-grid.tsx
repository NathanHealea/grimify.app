import type { PaletteSummary } from '@/modules/palettes/types/palette-summary'
import { PaletteCard } from '@/modules/palettes/components/palette-card'

/**
 * Responsive grid of {@link PaletteCard} tiles.
 *
 * Pure layout component — empty-state handling belongs in the calling page.
 *
 * @param props.summaries - Array of lightweight palette rows to display.
 * @param props.canEditAll - When true, every card shows an "Edit" affordance.
 */
export function PaletteCardGrid({
  summaries,
  canEditAll,
}: {
  summaries: PaletteSummary[]
  canEditAll?: boolean
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {summaries.map((summary) => (
        <PaletteCard key={summary.id} summary={summary} canEdit={canEditAll} />
      ))}
    </div>
  )
}
