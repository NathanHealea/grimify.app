'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import type { ArmyFormState } from '@/modules/armies/types/army-form-state'

/**
 * Server action that deletes an army entry.
 *
 * Blocks deletion when:
 * - The army has children (`armies.parent_id = $id`).
 * - The army is linked to one or more palettes (`palettes.army_id = $id`). This
 *   check is wrapped in a try/catch because the `army_id` column is added by a
 *   later migration — if the column does not yet exist the check is skipped.
 *
 * On success, revalidates `/admin/armies` and redirects there.
 *
 * @param _prevState - Previous action state (required by `useActionState`).
 * @param formData - Submitted form data. Must include hidden `id` field.
 * @returns {@link ArmyFormState} on error; redirects on success.
 */
export async function deleteArmy(
  _prevState: ArmyFormState,
  formData: FormData,
): Promise<ArmyFormState> {
  const id = (formData.get('id') as string | null)?.trim() ?? ''

  if (!id) {
    return { error: 'Army ID is required.' }
  }

  const supabase = await createClient()

  // Block deletion when children exist.
  const { count: childCount, error: childError } = await supabase
    .from('armies')
    .select('id', { count: 'exact', head: true })
    .eq('parent_id', id)

  if (childError) {
    return { error: childError.message }
  }

  if (childCount && childCount > 0) {
    return {
      error: `Cannot delete: this army has ${childCount} child ${childCount === 1 ? 'army' : 'armies'}. Remove or re-parent them first.`,
    }
  }

  // Check palette associations (guarded — army_id column may not exist yet).
  try {
    const { count: paletteCount } = await supabase
      .from('palettes')
      .select('id', { count: 'exact', head: true })
      .eq('army_id', id)

    if (paletteCount && paletteCount > 0) {
      return {
        error: `Cannot delete: ${paletteCount} ${paletteCount === 1 ? 'palette is' : 'palettes are'} linked to this army. Update those palettes first.`,
      }
    }
  } catch {
    // Column not present yet (Feature 02 migration pending) — skip check.
  }

  const { error: deleteError } = await supabase.from('armies').delete().eq('id', id)

  if (deleteError) {
    return { error: deleteError.message }
  }

  revalidatePath('/admin/armies')
  return { success: true }
}
