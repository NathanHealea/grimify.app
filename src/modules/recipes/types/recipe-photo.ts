/**
 * A photo attached to either a recipe or a single step.
 *
 * @remarks
 * Exactly one of `recipeId` and `stepId` is non-null — enforced by a CHECK
 * constraint on the table. Files live in the public `recipe-photos` Storage
 * bucket under `{userId}/{recipeId}/{photoId}.{ext}`.
 *
 * The chosen `coverPhotoId` on the parent {@link Recipe} must reference a
 * photo whose `recipeId` matches that recipe — enforced in app code.
 */
export type RecipePhoto = {
  /** UUID primary key. */
  id: string
  /** UUID of the parent recipe, or `null` if the photo attaches to a step. */
  recipeId: string | null
  /** UUID of the parent step, or `null` if the photo attaches to a recipe. */
  stepId: string | null
  /** 0-based photo index within the parent. */
  position: number
  /** Storage object path inside the `recipe-photos` bucket. */
  storagePath: string
  /** Public URL for the storage object; resolved by the service layer. */
  url: string
  /** Native pixel width; `null` if unknown. */
  widthPx: number | null
  /** Native pixel height; `null` if unknown. */
  heightPx: number | null
  /** Optional caption; `null` when not set. Max 200 characters. */
  caption: string | null
  /** ISO timestamp of creation. */
  createdAt: string
}
