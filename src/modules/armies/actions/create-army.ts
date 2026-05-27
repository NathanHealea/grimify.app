'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'

import { createClient } from '@/lib/supabase/server'
import { armySchema } from '@/modules/armies/validation'
import type { ArmyFormState } from '@/modules/armies/types/army-form-state'
import { uploadArmyIcon } from '@/modules/armies/actions/upload-army-icon'
import { toSlug } from '@/modules/admin/utils/to-slug'

/**
 * Server action that creates a new army entry.
 *
 * Validates form data against {@link armySchema}, checks slug uniqueness at the
 * correct level (root: `parent_id IS NULL`; child: `parent_id = $parent_id`),
 * uploads an optional icon to the `army-icons` bucket using a pre-generated UUID
 * so the storage path and the DB row share the same ID, inserts the row, then
 * revalidates `/admin/armies` and redirects there.
 *
 * @param _prevState - Previous action state (required by `useActionState`).
 * @param formData - Submitted form data.
 * @returns {@link ArmyFormState} on validation/DB error; redirects on success.
 */
export async function createArmy(
  _prevState: ArmyFormState,
  formData: FormData,
): Promise<ArmyFormState> {
  const rawName = (formData.get('name') as string | null)?.trim() ?? ''
  const rawSlug = (formData.get('slug') as string | null)?.trim() || toSlug(rawName)
  const rawParentId = (formData.get('parent_id') as string | null)?.trim() || null
  const rawSortOrder = (formData.get('sort_order') as string | null)?.trim()

  const sortOrder = rawSortOrder !== '' && rawSortOrder != null
    ? parseInt(rawSortOrder, 10)
    : null

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

  // Check slug uniqueness at the correct level.
  let slugQuery = supabase
    .from('armies')
    .select('id', { count: 'exact', head: true })
    .eq('slug', slug)

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

  // Pre-generate UUID so storage path and DB row share the same ID.
  const armyId = randomUUID()

  // Handle optional icon upload.
  let iconUrl: string | null = null
  const iconFile = formData.get('icon') as File | null
  if (iconFile && iconFile.size > 0) {
    iconUrl = await uploadArmyIcon(supabase, armyId, iconFile)
  }

  const { error: insertError } = await supabase.from('armies').insert({
    id: armyId,
    name,
    slug,
    parent_id: parent_id ?? null,
    sort_order: sort_order ?? null,
    icon_url: iconUrl,
  })

  if (insertError) {
    if (insertError.code === '23505') {
      return {
        values: { name, slug, parent_id, sort_order },
        errors: { slug: 'An army with this slug already exists at this level.' },
      }
    }
    return {
      values: { name, slug, parent_id, sort_order },
      error: insertError.message,
    }
  }

  revalidatePath('/admin/armies')
  redirect('/admin/armies')
}
