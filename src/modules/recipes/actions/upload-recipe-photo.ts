'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createRecipeService } from '@/modules/recipes/services/recipe-service'
import type { RecipePhoto } from '@/modules/recipes/types/recipe-photo'
import type { RecipePhotoParent } from '@/modules/recipes/types/recipe-photo-parent'

const RECIPE_PHOTOS_BUCKET = 'recipe-photos'

/**
 * Server action that finalizes a client-side upload by inserting the
 * `recipe_photos` row.
 *
 * The actual blob upload is performed by `<RecipePhotoUploader>` using the
 * browser Supabase client (storage policies enforce path ownership). Once
 * the object is in the bucket, the client calls this action with the
 * `storage_path`, parent reference, and any dimensions extracted from the
 * file. Ownership of the parent recipe (or step's parent recipe) is
 * re-verified server-side. If the row insert fails, the orphaned Storage
 * object is removed before returning the error.
 *
 * @param input.parent - Discriminated union identifying the photo's parent.
 * @param input.storagePath - The object key under the `recipe-photos` bucket.
 * @param input.widthPx - Optional decoded image width.
 * @param input.heightPx - Optional decoded image height.
 * @param input.caption - Optional initial caption (≤200 chars after trim).
 * @returns The created {@link RecipePhoto} on success; `{ error: string }` on failure.
 */
export async function uploadRecipePhoto(input: {
  parent: RecipePhotoParent
  storagePath: string
  widthPx?: number | null
  heightPx?: number | null
  caption?: string | null
}): Promise<{ photo: RecipePhoto } | { error: string }> {
  if (!input?.storagePath) return { error: 'Storage path is required.' }
  if (!input?.parent) return { error: 'Parent reference is required.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in to upload photos.' }

  let recipeId: string
  if (input.parent.kind === 'recipe') {
    const { data, error } = await supabase
      .from('recipes')
      .select('id, user_id')
      .eq('id', input.parent.recipeId)
      .maybeSingle()
    if (error) return { error: error.message }
    if (!data) return { error: 'Recipe not found.' }
    if (data.user_id !== user.id) {
      return { error: 'You can only edit recipes you own.' }
    }
    recipeId = data.id as string
  } else {
    const { data, error } = await supabase
      .from('recipe_steps')
      .select('recipe_sections!inner(recipe_id, recipes!inner(user_id))')
      .eq('id', input.parent.stepId)
      .maybeSingle()
    if (error) return { error: error.message }
    if (!data) return { error: 'Step not found.' }
    const section = data.recipe_sections as unknown as
      | { recipe_id: string; recipes: { user_id: string } | null }
      | null
    if (!section?.recipe_id || section.recipes?.user_id !== user.id) {
      return { error: 'You can only edit recipes you own.' }
    }
    recipeId = section.recipe_id
  }

  const captionTrimmed = input.caption?.trim() ?? ''
  const caption = captionTrimmed.length === 0 ? null : captionTrimmed
  if (caption && caption.length > 200) {
    return { error: 'Caption must be 200 characters or fewer.' }
  }

  const widthPx =
    typeof input.widthPx === 'number' && input.widthPx > 0 ? input.widthPx : null
  const heightPx =
    typeof input.heightPx === 'number' && input.heightPx > 0 ? input.heightPx : null

  const service = createRecipeService(supabase)

  let photo: RecipePhoto
  try {
    photo = await service.addRecipePhoto({
      parent: input.parent,
      storagePath: input.storagePath,
      widthPx,
      heightPx,
      caption,
    })
  } catch (err) {
    await supabase.storage.from(RECIPE_PHOTOS_BUCKET).remove([input.storagePath])
    return { error: err instanceof Error ? err.message : 'Failed to save photo.' }
  }

  revalidatePath(`/user/recipes/${recipeId}/edit`)
  revalidatePath(`/recipes/${recipeId}`)
  return { photo }
}
