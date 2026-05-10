import type { RecipeStep } from '@/modules/recipes/types/recipe-step'

/**
 * A named group of steps within a recipe.
 *
 * @remarks
 * Sections mirror the structural headings of the inspiration page (e.g.,
 * "Base-coating the armour", "Final weathering and varnishing"). `position`
 * forms part of the unique constraint `(recipe_id, position)` and is
 * renumbered via `normalizeRecipePositions` on reorder.
 *
 * `steps` is sorted by `position` ascending and populated by hydrated reads.
 */
export type RecipeSection = {
  /** UUID primary key. */
  id: string
  /** UUID of the parent recipe. */
  recipeId: string
  /** 0-based section index within the recipe. */
  position: number
  /** Display heading; required, 1–120 characters. */
  title: string
  /** Ordered steps in this section, sorted by `position` ascending. */
  steps: RecipeStep[]
}
