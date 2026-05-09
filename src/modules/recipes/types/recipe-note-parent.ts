/**
 * Discriminated union identifying which entity owns a recipe note.
 *
 * Notes are polymorphic in the schema — `recipe_notes.recipe_id` and
 * `recipe_notes.step_id` are mutually exclusive (XOR constraint). The
 * server actions that create or reorder notes accept this union so
 * callers can never construct an ambiguous parent reference.
 */
export type RecipeNoteParent =
  | { kind: 'recipe'; recipeId: string }
  | { kind: 'step'; stepId: string }
