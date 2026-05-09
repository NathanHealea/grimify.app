import type { RecipeNote } from '@/modules/recipes/types/recipe-note'
import type { RecipePhoto } from '@/modules/recipes/types/recipe-photo'
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
 *
 * `photos` is an ordered list of {@link RecipePhoto} attached to this step,
 * populated by hydrated reads; it is empty when no step photos exist.
 *
 * `notes` is an ordered list of {@link RecipeNote} attached to this step,
 * populated by hydrated reads; it is empty when no step notes exist.
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
  /** Ordered photos attached to this step, sorted by `position` ascending. */
  photos: RecipePhoto[]
  /** Ordered notes attached to this step, sorted by `position` ascending. */
  notes: RecipeNote[]
}
