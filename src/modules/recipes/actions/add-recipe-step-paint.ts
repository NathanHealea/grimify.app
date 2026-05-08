'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createRecipeService } from '@/modules/recipes/services/recipe-service'
import type { RecipeStepPaint } from '@/modules/recipes/types/recipe-step-paint'

/**
 * Server action that appends a paint to a step.
 *
 * Verifies ownership through `recipe_steps → recipe_sections → recipes`,
 * inserts at `position = max + 1`, and revalidates the builder + detail
 * pages. Validation: ratio ≤ 200, note ≤ 500 (after trim). The
 * `paletteSlotId` is recorded as a free-form uuid — the schema does not
 * FK it, so any non-empty string is accepted.
 *
 * @param stepId - UUID of the parent step.
 * @param init - Paint reference plus optional palette context, ratio, note.
 * @returns The created step paint on success; `{ error: string }` on failure.
 */
export async function addRecipeStepPaint(
  stepId: string,
  init: {
    paintId: string
    paletteSlotId?: string | null
    ratio?: string | null
    note?: string | null
  },
): Promise<{ paint: RecipeStepPaint } | { error: string }> {
  if (!stepId) return { error: 'Step ID is required.' }
  if (!init?.paintId) return { error: 'Paint ID is required.' }

  const ratio = init.ratio?.trim() || null
  const note = init.note?.trim() || null
  const paletteSlotId = init.paletteSlotId?.trim() || null

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
    return { error: 'You can only edit recipes you own.' }
  }

  const service = createRecipeService(supabase)

  let paint: RecipeStepPaint
  try {
    paint = await service.addStepPaint(stepId, {
      paintId: init.paintId,
      paletteSlotId,
      ratio,
      note,
    })
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to add paint.' }
  }

  revalidatePath(`/user/recipes/${recipeId}/edit`)
  revalidatePath(`/recipes/${recipeId}`)

  return { paint }
}
