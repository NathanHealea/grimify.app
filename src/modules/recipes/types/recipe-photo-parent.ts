/**
 * Discriminated union identifying which entity owns a recipe photo.
 *
 * Photos are polymorphic in the schema — `recipe_photos.recipe_id` and
 * `recipe_photos.step_id` are mutually exclusive (XOR constraint). The
 * server actions that create, reorder, or move photos accept this union
 * so callers can never construct an ambiguous parent reference.
 */
export type RecipePhotoParent =
  | { kind: 'recipe'; recipeId: string }
  | { kind: 'step'; stepId: string }
