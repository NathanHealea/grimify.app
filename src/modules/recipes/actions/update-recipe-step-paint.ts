'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createRecipeService } from '@/modules/recipes/services/recipe-service'

/**
 * Server action that updates a step paint's ratio and/or note.
 *
 * Verifies ownership through
 * `recipe_step_paints → recipe_steps → recipe_sections → recipes`. Trims
 * inputs; empty strings become `null`. Pass `null` to clear a field; omit a
 * key to leave it unchanged. Revalidates the builder + detail pages.
 *
 * @param id - UUID of the step paint row.
 * @param patch - Fields to update.
 * @returns `undefined` on success; `{ error: string }` on failure.
 */
export async function updateRecipeStepPaint(
  id: string,
  patch: { ratio?: string | null; note?: string | null },
): Promise<{ error: string } | undefined> {
  if (!id) return { error: 'Step paint ID is required.' }

  const ratio =
    patch.ratio === undefined ? undefined : patch.ratio === null ? null : patch.ratio.trim() || null
  const note =
    patch.note === undefined ? undefined : patch.note === null ? null : patch.note.trim() || null

  if (ratio && ratio.length > 200) {
    return { error: 'Ratio must be 200 characters or fewer.' }
  }
  if (note && note.length > 500) {
    return { error: 'Note must be 500 characters or fewer.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in to edit a recipe.' }

  const { data: row, error: ownerError } = await supabase
    .from('recipe_step_paints')
    .select(
      'recipe_steps!inner(section_id, recipe_sections!inner(recipe_id, recipes!inner(user_id)))',
    )
    .eq('id', id)
    .maybeSingle()

  if (ownerError) return { error: ownerError.message }
  if (!row) return { error: 'Step paint not found.' }

  const step = row.recipe_steps as unknown as
    | {
        section_id: string
        recipe_sections: { recipe_id: string; recipes: { user_id: string } | null } | null
      }
    | null
  const section = step?.recipe_sections
  const ownerId = section?.recipes?.user_id
  const recipeId = section?.recipe_id
  if (!ownerId || ownerId !== user.id || !recipeId) {
    return { error: 'You can only edit recipes you own.' }
  }

  const service = createRecipeService(supabase)

  try {
    await service.updateStepPaint(id, { ratio, note })
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to update paint.' }
  }

  revalidatePath(`/user/recipes/${recipeId}/edit`)
  revalidatePath(`/recipes/${recipeId}`)
}
