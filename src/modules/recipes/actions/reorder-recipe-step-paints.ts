'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createRecipeService } from '@/modules/recipes/services/recipe-service'

/**
 * Server action that persists a new paint order for a step.
 *
 * Verifies ownership through `recipe_steps → recipe_sections → recipes`
 * and that `orderedPaintIds` is a permutation of the step's existing
 * paints. Reads each row's full payload (paint_id, palette_slot_id, ratio,
 * note) so the `replace_recipe_step_paints` RPC can write a complete set
 * of rows at the new positions.
 *
 * Cross-step moves are out of scope; the caller should remove + re-add to
 * relocate.
 *
 * @param stepId - UUID of the parent step.
 * @param orderedPaintIds - Step paint UUIDs in the desired order, head first.
 * @returns `undefined` on success; `{ error: string }` on failure.
 */
export async function reorderRecipeStepPaints(
  stepId: string,
  orderedPaintIds: string[],
): Promise<{ error: string } | undefined> {
  if (!stepId || !Array.isArray(orderedPaintIds)) {
    return { error: 'Invalid reorder request.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in to reorder a recipe.' }

  const { data: row, error: ownerError } = await supabase
    .from('recipe_steps')
    .select('section_id, recipe_sections!inner(recipe_id, recipes!inner(user_id))')
    .eq('id', stepId)
    .maybeSingle()

  if (ownerError) return { error: ownerError.message }
  if (!row) return { error: 'Step not found.' }

  const section = row.recipe_sections as unknown as
    | { recipe_id: string; recipes: { user_id: string } | null }
    | null
  const ownerId = section?.recipes?.user_id
  const recipeId = section?.recipe_id
  if (!ownerId || ownerId !== user.id || !recipeId) {
    return { error: 'You can only reorder recipes you own.' }
  }

  const { data: existing, error: existingError } = await supabase
    .from('recipe_step_paints')
    .select('id, paint_id, palette_slot_id, ratio, note')
    .eq('step_id', stepId)

  if (existingError) return { error: existingError.message }

  const byId = new Map<
    string,
    { paint_id: string; palette_slot_id: string | null; ratio: string | null; note: string | null }
  >()
  for (const r of existing ?? []) {
    byId.set(r.id as string, {
      paint_id: r.paint_id as string,
      palette_slot_id: (r.palette_slot_id as string | null) ?? null,
      ratio: (r.ratio as string | null) ?? null,
      note: (r.note as string | null) ?? null,
    })
  }

  if (byId.size !== orderedPaintIds.length) {
    return { error: 'Reorder list does not match step paints.' }
  }
  for (const id of orderedPaintIds) {
    if (!byId.has(id)) {
      return { error: 'Reorder list does not match step paints.' }
    }
  }

  const service = createRecipeService(supabase)
  try {
    await service.setStepPaints(
      stepId,
      orderedPaintIds.map((id, index) => {
        const payload = byId.get(id)!
        return {
          position: index,
          paintId: payload.paint_id,
          paletteSlotId: payload.palette_slot_id,
          ratio: payload.ratio,
          note: payload.note,
        }
      }),
    )
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to reorder paints.' }
  }

  revalidatePath(`/user/recipes/${recipeId}/edit`)
  revalidatePath(`/recipes/${recipeId}`)
}
