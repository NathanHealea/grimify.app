'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createRecipeService } from '@/modules/recipes/services/recipe-service'
import type { RecipeStep } from '@/modules/recipes/types/recipe-step'

/**
 * Server action that appends a new step to a section.
 *
 * Verifies ownership through `recipe_sections → recipes`. Allows blank
 * fields — a fresh step starts with no title, technique, or instructions.
 * Inserts at `position = max + 1`. Revalidates builder and detail pages.
 * Validation: title ≤ 120, technique ≤ 60, instructions ≤ 5000 (after trim).
 *
 * @param sectionId - UUID of the parent section.
 * @param init - Optional initial fields. All trimmed before validation.
 * @returns The created step on success; `{ error: string }` on failure.
 */
export async function addRecipeStep(
  sectionId: string,
  init?: {
    title?: string | null
    technique?: string | null
    instructions?: string | null
  },
): Promise<{ step: RecipeStep } | { error: string }> {
  if (!sectionId) return { error: 'Section ID is required.' }

  const title = init?.title?.trim() || null
  const technique = init?.technique?.trim() || null
  const instructions = init?.instructions?.trim() || null

  if (title && title.length > 120) {
    return { error: 'Step title must be 120 characters or fewer.' }
  }
  if (technique && technique.length > 60) {
    return { error: 'Technique must be 60 characters or fewer.' }
  }
  if (instructions && instructions.length > 5000) {
    return { error: 'Instructions must be 5000 characters or fewer.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in to edit a recipe.' }

  const { data: row, error: ownerError } = await supabase
    .from('recipe_sections')
    .select('recipe_id, recipes!inner(user_id)')
    .eq('id', sectionId)
    .maybeSingle()

  if (ownerError) return { error: ownerError.message }
  if (!row) return { error: 'Section not found.' }

  const ownerId = (row.recipes as unknown as { user_id: string } | null)?.user_id
  if (!ownerId || ownerId !== user.id) {
    return { error: 'You can only edit recipes you own.' }
  }

  const service = createRecipeService(supabase)

  let step: RecipeStep
  try {
    step = await service.addStep(sectionId, { title, technique, instructions })
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to add step.' }
  }

  revalidatePath(`/user/recipes/${row.recipe_id}/edit`)
  revalidatePath(`/recipes/${row.recipe_id}`)

  return { step }
}
