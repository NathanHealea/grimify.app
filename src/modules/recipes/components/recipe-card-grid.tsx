import type { RecipeSummary } from '@/modules/recipes/types/recipe-summary'
import { RecipeCard } from '@/modules/recipes/components/recipe-card'

/**
 * Responsive grid of {@link RecipeCard} tiles.
 *
 * Pure layout component — empty-state handling belongs in the calling page.
 *
 * @param props.summaries - Array of lightweight recipe rows to display.
 * @param props.canEditAll - When true, every card shows an "Edit" affordance.
 */
export function RecipeCardGrid({
  summaries,
  canEditAll,
}: {
  summaries: RecipeSummary[]
  canEditAll?: boolean
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {summaries.map((summary) => (
        <RecipeCard key={summary.id} summary={summary} canEdit={canEditAll} />
      ))}
    </div>
  )
}
