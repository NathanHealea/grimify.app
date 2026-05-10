import type { Palette } from '@/modules/palettes/types/palette'
import type { RecipeNote } from '@/modules/recipes/types/recipe-note'
import type { RecipePhoto } from '@/modules/recipes/types/recipe-photo'
import type { RecipeSection } from '@/modules/recipes/types/recipe-section'

/**
 * A fully hydrated recipe including its sections, steps, paints, notes, and photos.
 *
 * @remarks
 * Returned by `getRecipeById`. The hydrated read joins the whole tree in one
 * Supabase query and shapes it here. `sections` is sorted by `position`
 * ascending; each section's `steps` and each step's `paints` are likewise
 * sorted.
 *
 * `paletteId` is nullable because a recipe may not pin to a palette. Visibility
 * of the linked palette is the consumer's concern: a public recipe pinned to a
 * private palette should hide the palette section but still render the recipe.
 *
 * `coverPhotoId` references a photo in `photos` (whose `recipeId` matches this
 * recipe). The service layer is responsible for resolving the photo and not
 * letting it dangle on delete.
 */
export type Recipe = {
  /** UUID primary key. */
  id: string
  /** UUID of the owning user (FK to profiles). */
  userId: string
  /** UUID of the linked palette, or `null` if not pinned. */
  paletteId: string | null
  /**
   * The hydrated linked palette, or `null` when no palette is pinned or the
   * palette is not visible to the caller (RLS).
   *
   * Loaded by `getRecipeById` via the palette service when `paletteId` is set.
   * Consumers (the step-paint picker, the detail view's palette section) read
   * this to render palette-mode candidates without an extra round-trip.
   */
  palette: Palette | null
  /** Display title; 1–120 characters. */
  title: string
  /** Optional summary; `null` when not set. Max 5000 characters, markdown allowed. */
  summary: string | null
  /** UUID of the chosen cover photo, or `null` if not set. */
  coverPhotoId: string | null
  /** Whether the recipe is publicly visible. Defaults to `false`. */
  isPublic: boolean
  /** ISO timestamp of creation. */
  createdAt: string
  /** ISO timestamp of last update; maintained by the `set_updated_at` trigger. */
  updatedAt: string
  /** Ordered sections, sorted by `position` ascending. */
  sections: RecipeSection[]
  /** Notes attached directly to the recipe (not to individual steps). */
  notes: RecipeNote[]
  /** Photos attached directly to the recipe (not to individual steps). */
  photos: RecipePhoto[]
}
