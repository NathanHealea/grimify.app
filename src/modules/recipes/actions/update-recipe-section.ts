'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createRecipeService } from '@/modules/recipes/services/recipe-service'

/**
 * Server action that patches a recipe section's title.
 *
 * Verifies the caller owns the parent recipe (joined through `recipe_sections
 * → recipes`). Revalidates the builder and detail pages on success.
 * Validation: title trimmed, 1–120 chars.
 *
 * @param sectionId - UUID of the section to update.
 * @param patch - Fields to update (currently only `title`).
 * @returns `undefined` on success; `{ error: string }` on failure.
 */
export async function updateRecipeSection(
  sectionId: string,
  patch: { title: string },
): Promise<{ error: string } | undefined> {
  if (!sectionId) return { error: 'Section ID is required.' }

  const trimmed = patch.title.trim()
  if (!trimmed) return { error: 'Section title is required.' }
  if (trimmed.length > 120) return { error: 'Section title must be 120 characters or fewer.' }

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

  try {
    await service.updateSection(sectionId, { title: trimmed })
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to update section.' }
  }

  revalidatePath(`/user/recipes/${row.recipe_id}/edit`)
  revalidatePath(`/recipes/${row.recipe_id}`)
}
