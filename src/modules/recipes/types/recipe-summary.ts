/**
 * Lightweight recipe row used in browse and list views.
 *
 * @remarks
 * Returned by `listRecipesForUser` and `listPublicRecipes`. Avoids loading
 * the full recipe tree — only enough fields to render a card.
 */
export type RecipeSummary = {
  /** UUID primary key. */
  id: string
  /** Display title of the recipe. */
  title: string
  /** Whether the recipe is publicly visible. */
  isPublic: boolean
  /** Total number of steps across all sections. */
  stepCount: number
  /** Public URL of the cover photo, or `null` if none is set. */
  coverPhotoUrl: string | null
  /** ISO timestamp of last update; used for default sort order. */
  updatedAt: string
  /**
   * Owner's profile display name. Populated by `listPublicRecipes` so catalog
   * cards can credit the author; omitted (or `null`) on owner-scoped queries
   * where the viewer always owns the recipe.
   */
  ownerDisplayName?: string | null
}
