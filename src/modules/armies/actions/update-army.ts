'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { armySchema } from '@/modules/armies/validation'
import type { ArmyFormState } from '@/modules/armies/types/army-form-state'
import { uploadArmyIcon, deleteArmyIcon } from '@/modules/armies/actions/upload-army-icon'
import { toSlug } from '@/modules/admin/utils/to-slug'
import type { Army } from '@/modules/armies/types/army'

/**
 * Guards against circular parent assignment by walking up the army tree.
 *
 * Returns `true` when `candidateParentId` is a descendant of `armyId`, meaning
 * assigning it as a parent would create a cycle.
 *
 * @param allArmies - Flat list of all armies used to walk the tree in memory.
 * @param armyId - The army being edited.
 * @param candidateParentId - The proposed new parent ID.
 * @returns `true` if the assignment would create a circular reference.
 */
function isCircularParent(
  allArmies: Army[],
  armyId: string,
  candidateParentId: string,
): boolean {
  const parentMap = new Map(allArmies.map((a) => [a.id, a.parent_id]))

  let current: string | null = candidateParentId
  while (current !== null) {
    if (current === armyId) return true
    current = parentMap.get(current) ?? null
  }
  return false
}

/**
 * Server action that updates an existing army entry.
 *
 * Validates form data, checks slug uniqueness at the correct level (excluding
 * the army's own row), guards against circular parent assignment by walking the
 * tree in memory via `getAllArmiesFlat`, handles icon replacement (deletes the
 * old icon from storage before uploading the new one), then updates the row and
 * revalidates `/admin/armies` and `/admin/armies/[id]`.
 *
 * @param _prevState - Previous action state (required by `useActionState`).
 * @param formData - Submitted form data. Must include hidden `id` field.
 * @returns {@link ArmyFormState} on error; returns `{ success: true }` on success.
 */
export async function updateArmy(
  _prevState: ArmyFormState,
  formData: FormData,
): Promise<ArmyFormState> {
  const id = (formData.get('id') as string | null)?.trim() ?? ''
  const rawName = (formData.get('name') as string | null)?.trim() ?? ''
  const rawSlug = (formData.get('slug') as string | null)?.trim() || toSlug(rawName)
  const rawParentId = (formData.get('parent_id') as string | null)?.trim() || null
  const rawSortOrder = (formData.get('sort_order') as string | null)?.trim()

  const sortOrder = rawSortOrder !== '' && rawSortOrder != null
    ? parseInt(rawSortOrder, 10)
    : null

  if (!id) {
    return { error: 'Army ID is required.' }
  }

  const parseResult = armySchema.safeParse({
    name: rawName,
    slug: rawSlug,
    parent_id: rawParentId,
    sort_order: sortOrder,
  })

  if (!parseResult.success) {
    const fieldErrors = parseResult.error.flatten().fieldErrors
    return {
      values: { name: rawName, slug: rawSlug, parent_id: rawParentId, sort_order: sortOrder },
      errors: {
        name: fieldErrors.name?.[0],
        slug: fieldErrors.slug?.[0],
        parent_id: fieldErrors.parent_id?.[0],
        sort_order: fieldErrors.sort_order?.[0],
      },
    }
  }

  const { name, slug, parent_id, sort_order } = parseResult.data

  const supabase = await createClient()

  // Fetch all armies for the circular reference check.
  const { data: allArmies } = await supabase.from('armies').select('*')
  const armies: Army[] = allArmies ?? []

  // Guard against circular parent assignment.
  if (parent_id && isCircularParent(armies, id, parent_id)) {
    return {
      values: { name, slug, parent_id, sort_order },
      errors: { parent_id: 'Cannot assign a descendant as parent (circular reference).' },
    }
  }

  // Check slug uniqueness at the correct level, excluding this army's own row.
  let slugQuery = supabase
    .from('armies')
    .select('id', { count: 'exact', head: true })
    .eq('slug', slug)
    .neq('id', id)

  if (parent_id) {
    slugQuery = slugQuery.eq('parent_id', parent_id)
  } else {
    slugQuery = slugQuery.is('parent_id', null)
  }

  const { count: slugCount } = await slugQuery
  if (slugCount && slugCount > 0) {
    return {
      values: { name, slug, parent_id, sort_order },
      errors: { slug: 'An army with this slug already exists at this level.' },
    }
  }

  // Handle optional icon upload / replacement.
  let iconUrl: string | undefined
  const iconFile = formData.get('icon') as File | null
  if (iconFile && iconFile.size > 0) {
    // Fetch current icon_url to delete the old file from storage.
    const currentArmy = armies.find((a) => a.id === id)
    if (currentArmy?.icon_url) {
      await deleteArmyIcon(supabase, currentArmy.icon_url)
    }
    const uploaded = await uploadArmyIcon(supabase, id, iconFile)
    if (uploaded) {
      iconUrl = uploaded
    }
  }

  const updatePayload: Partial<Army> & { parent_id?: string | null } = {
    name,
    slug,
    parent_id: parent_id ?? null,
    sort_order: sort_order ?? null,
    ...(iconUrl !== undefined && { icon_url: iconUrl }),
  }

  const { error: updateError } = await supabase
    .from('armies')
    .update(updatePayload)
    .eq('id', id)

  if (updateError) {
    if (updateError.code === '23505') {
      return {
        values: { name, slug, parent_id, sort_order },
        errors: { slug: 'An army with this slug already exists at this level.' },
      }
    }
    return {
      values: { name, slug, parent_id, sort_order },
      error: updateError.message,
    }
  }

  revalidatePath('/admin/armies')
  revalidatePath(`/admin/armies/${id}`)
  return { success: true }
}
