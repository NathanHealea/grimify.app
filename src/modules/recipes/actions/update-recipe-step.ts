'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createRecipeService } from '@/modules/recipes/services/recipe-service'

/**
 * Server action that patches a recipe step's editable text fields.
 *
 * Verifies ownership by joining `recipe_steps → recipe_sections → recipes`.
 * Empty trimmed values are persisted as `null` (the schema allows null for
 * all three fields). Pass an explicit `null` to clear; omit a key to leave
 * unchanged. Revalidates builder and detail pages on success.
 * Validation: title ≤ 120, technique ≤ 60, instructions ≤ 5000.
 *
 * @param stepId - UUID of the step to update.
 * @param patch - Fields to update.
 * @returns `undefined` on success; `{ error: string }` on failure.
 */
export async function updateRecipeStep(
  stepId: string,
  patch: {
    title?: string | null
    technique?: string | null
    instructions?: string | null
  },
): Promise<{ error: string } | undefined> {
  if (!stepId) return { error: 'Step ID is required.' }

  const normalized: typeof patch = {}
  if (patch.title !== undefined) {
    const trimmed = patch.title?.trim() ?? ''
    if (trimmed.length > 120) {
      return { error: 'Step title must be 120 characters or fewer.' }
    }
    normalized.title = trimmed || null
  }
  if (patch.technique !== undefined) {
    const trimmed = patch.technique?.trim() ?? ''
    if (trimmed.length > 60) {
      return { error: 'Technique must be 60 characters or fewer.' }
    }
    normalized.technique = trimmed || null
  }
  if (patch.instructions !== undefined) {
    const trimmed = patch.instructions?.trim() ?? ''
    if (trimmed.length > 5000) {
      return { error: 'Instructions must be 5000 characters or fewer.' }
    }
    normalized.instructions = trimmed || null
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
  try {
    await service.updateStep(stepId, normalized)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to update step.' }
  }

  revalidatePath(`/user/recipes/${recipeId}/edit`)
  revalidatePath(`/recipes/${recipeId}`)
}
