'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createRecipeService } from '@/modules/recipes/services/recipe-service'

/**
 * Server action that hard-deletes a recipe step and renumbers siblings.
 *
 * Verifies ownership through `recipe_steps → recipe_sections → recipes`.
 * Cascades to all step paints, notes, and photos attached to this step.
 * After deletion, fetches remaining sibling steps and renumbers them via
 * {@link setSteps}. Revalidates builder and detail pages.
 *
 * @param stepId - UUID of the step to delete.
 * @returns `undefined` on success; `{ error: string }` on failure.
 */
export async function deleteRecipeStep(
  stepId: string,
): Promise<{ error: string } | undefined> {
  if (!stepId) return { error: 'Step ID is required.' }

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
  const sectionId = row.section_id as string
  if (!ownerId || ownerId !== user.id || !recipeId) {
    return { error: 'You can only edit recipes you own.' }
  }

  const service = createRecipeService(supabase)

  try {
    await service.deleteStep(stepId)

    const { data: remaining, error: remainingError } = await supabase
      .from('recipe_steps')
      .select('id, position')
      .eq('section_id', sectionId)
      .order('position', { ascending: true })

    if (remainingError) return { error: remainingError.message }

    if (remaining && remaining.length > 0) {
      await service.setSteps(
        sectionId,
        remaining.map((r, index) => ({ id: r.id as string, position: index })),
      )
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to delete step.' }
  }

  revalidatePath(`/user/recipes/${recipeId}/edit`)
  revalidatePath(`/recipes/${recipeId}`)
}
