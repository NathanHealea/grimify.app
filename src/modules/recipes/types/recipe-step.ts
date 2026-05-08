import type { RecipeStepPaint } from '@/modules/recipes/types/recipe-step-paint'

/**
 * A single step within a recipe section.
 *
 * @remarks
 * Steps may be unlabeled (`title` is nullable). `position` forms part of the
 * unique constraint `(section_id, position)` and is renumbered with the
 * `normalizeRecipePositions` util on reorder.
 *
 * `paints` is an ordered list of {@link RecipeStepPaint} populated by
 * hydrated reads; it is absent or empty on summary list views.
 */
export type RecipeStep = {
  /** UUID primary key. */
  id: string
  /** UUID of the parent section. */
  sectionId: string
  /** 0-based step index within the section. */
  position: number
  /** Optional step heading; `null` when not set. */
  title: string | null
  /** Free-form technique label (e.g. `"stipple"`, `"wet blend"`); `null` when not set. */
  technique: string | null
  /** Markdown-allowed instructions body; `null` when not set. Max 5000 characters. */
  instructions: string | null
  /** Ordered paint assignments for this step, sorted by `position` ascending. */
  paints: RecipeStepPaint[]
}
