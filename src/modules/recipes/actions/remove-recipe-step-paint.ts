'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createRecipeService } from '@/modules/recipes/services/recipe-service'

/**
 * Server action that hard-deletes a step paint row and renumbers siblings.
 *
 * Verifies ownership through
 * `recipe_step_paints → recipe_steps → recipe_sections → recipes`. After
 * deletion, fetches remaining sibling paints, normalizes positions to
 * `0..N-1`, and writes the new order via `replace_recipe_step_paints`.
 * Revalidates the builder + detail pages.
 *
 * @param id - UUID of the step paint to remove.
 * @returns `undefined` on success; `{ error: string }` on failure.
 */
export async function removeRecipeStepPaint(
  id: string,
): Promise<{ error: string } | undefined> {
  if (!id) return { error: 'Step paint ID is required.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in to edit a recipe.' }

  const { data: row, error: ownerError } = await supabase
    .from('recipe_step_paints')
    .select(
      'step_id, recipe_steps!inner(section_id, recipe_sections!inner(recipe_id, recipes!inner(user_id)))',
    )
    .eq('id', id)
    .maybeSingle()

  if (ownerError) return { error: ownerError.message }
  if (!row) return { error: 'Step paint not found.' }

  const stepId = row.step_id as string
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
    await service.deleteStepPaint(id)

    const { data: remaining, error: remainingError } = await supabase
      .from('recipe_step_paints')
      .select('id, paint_id, palette_slot_id, ratio, note, position')
      .eq('step_id', stepId)
      .order('position', { ascending: true })

    if (remainingError) return { error: remainingError.message }

    if (remaining && remaining.length > 0) {
      await service.setStepPaints(
        stepId,
        remaining.map((r, index) => ({
          position: index,
          paintId: r.paint_id as string,
          paletteSlotId: (r.palette_slot_id as string | null) ?? null,
          ratio: (r.ratio as string | null) ?? null,
          note: (r.note as string | null) ?? null,
        })),
      )
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to remove paint.' }
  }

  revalidatePath(`/user/recipes/${recipeId}/edit`)
  revalidatePath(`/recipes/${recipeId}`)
}
