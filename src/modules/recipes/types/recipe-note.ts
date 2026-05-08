/**
 * A free-form note attached to either a recipe or a single step.
 *
 * @remarks
 * Exactly one of `recipeId` and `stepId` is non-null — enforced by a CHECK
 * constraint on the table. `position` orders notes within their parent and
 * is renumbered via `normalizeRecipePositions` on reorder.
 */
export type RecipeNote = {
  /** UUID primary key. */
  id: string
  /** UUID of the parent recipe, or `null` if the note attaches to a step. */
  recipeId: string | null
  /** UUID of the parent step, or `null` if the note attaches to a recipe. */
  stepId: string | null
  /** 0-based note index within the parent. */
  position: number
  /** Markdown-allowed body; required, max 5000 characters. */
  body: string
  /** ISO timestamp of creation. */
  createdAt: string
}
