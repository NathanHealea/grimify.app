'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createRecipeService } from '@/modules/recipes/services/recipe-service'

/**
 * Server action that hard-deletes a recipe section and renumbers siblings.
 *
 * Verifies ownership through `recipe_sections → recipes`. Cascades to all
 * child steps, step paints, notes, and photos. After deletion, fetches
 * remaining sibling sections and renumbers them to a contiguous `0..N-1`
 * range via {@link setSections}. Revalidates the builder and detail pages.
 *
 * @param sectionId - UUID of the section to delete.
 * @returns `undefined` on success; `{ error: string }` on failure.
 */
export async function deleteRecipeSection(
  sectionId: string,
): Promise<{ error: string } | undefined> {
  if (!sectionId) return { error: 'Section ID is required.' }

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

  const recipeId = row.recipe_id as string
  const service = createRecipeService(supabase)

  try {
    await service.deleteSection(sectionId)

    const { data: remaining, error: remainingError } = await supabase
      .from('recipe_sections')
      .select('id, position')
      .eq('recipe_id', recipeId)
      .order('position', { ascending: true })

    if (remainingError) return { error: remainingError.message }

    if (remaining && remaining.length > 0) {
      await service.setSections(
        recipeId,
        remaining.map((r, index) => ({ id: r.id as string, position: index })),
      )
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to delete section.' }
  }

  revalidatePath(`/user/recipes/${recipeId}/edit`)
  revalidatePath(`/recipes/${recipeId}`)
}
