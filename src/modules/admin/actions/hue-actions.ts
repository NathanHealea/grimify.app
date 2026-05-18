'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { toSlug } from '@/modules/admin/utils/to-slug'
import type { HueFormState } from '@/modules/admin/types/hue-form-state'
import type { PaintHueActionState } from '@/modules/admin/types/paint-hue-action-state'

/**
 * Creates a new hue.
 *
 * If `parent_id` is present in formData, creates a child hue; otherwise creates
 * a parent hue. Validates that `name` is not empty. Inserts into the `hues`
 * table, revalidates `/admin/hues`, and redirects to the new hue's detail page.
 *
 * @param prevState - The previous action state.
 * @param formData - Form data containing `name`, `slug`, `hex_code`, optionally `parent_id` and `sort_order`.
 * @returns Updated {@link HueFormState} on error, or redirects on success.
 */
export async function createHue(
  prevState: HueFormState,
  formData: FormData
): Promise<HueFormState> {
  const name = (formData.get('name') as string | null)?.trim() ?? ''
  const slug = (formData.get('slug') as string | null)?.trim() || toSlug(name)
  const hex_code = (formData.get('hex_code') as string | null)?.trim() ?? '#000000'
  const parent_id = (formData.get('parent_id') as string | null)?.trim() || null
  const sort_order_raw = formData.get('sort_order') as string | null

  if (!name) {
    return { errors: { name: 'Name is required.' } }
  }

  const sort_order =
    !parent_id && sort_order_raw && sort_order_raw.trim() !== ''
      ? parseInt(sort_order_raw, 10)
      : null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('hues')
    .insert({ name, slug, hex_code, parent_id, sort_order })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { errors: { slug: 'A hue with this slug already exists.' } }
    }
    return { error: error.message }
  }

  revalidatePath('/admin/hues')
  redirect(`/admin/hues/${data.id}`)
}

/**
 * Updates an existing hue.
 *
 * Reads `id` from the hidden form field, validates required fields,
 * and updates the `hues` row. Revalidates `/admin/hues` and the hue detail page.
 *
 * @param prevState - The previous action state.
 * @param formData - Form data containing `id`, `name`, `slug`, `hex_code`, optionally `sort_order`.
 * @returns Updated {@link HueFormState} indicating success or error.
 */
export async function updateHue(
  prevState: HueFormState,
  formData: FormData
): Promise<HueFormState> {
  const id = (formData.get('id') as string | null)?.trim() ?? ''
  const name = (formData.get('name') as string | null)?.trim() ?? ''
  const slug = (formData.get('slug') as string | null)?.trim() ?? ''
  const hex_code = (formData.get('hex_code') as string | null)?.trim() ?? '#000000'
  const parent_id = (formData.get('parent_id') as string | null)?.trim() || null
  const sort_order_raw = formData.get('sort_order') as string | null

  if (!name) {
    return { errors: { name: 'Name is required.' } }
  }

  const sort_order =
    !parent_id && sort_order_raw && sort_order_raw.trim() !== ''
      ? parseInt(sort_order_raw, 10)
      : null

  const supabase = await createClient()
  const { error } = await supabase
    .from('hues')
    .update({ name, slug, hex_code, sort_order })
    .eq('id', id)

  if (error) {
    if (error.code === '23505') {
      return { errors: { slug: 'A hue with this slug already exists.' } }
    }
    return { error: error.message }
  }

  revalidatePath('/admin/hues')
  revalidatePath(`/admin/hues/${id}`)
  return { success: true }
}

/**
 * Deletes a hue and all its children/paint associations (cascade).
 *
 * Reads `id` from the hidden form field, deletes the row, revalidates
 * `/admin/hues`, and redirects there.
 *
 * @param prevState - The previous action state.
 * @param formData - Form data containing `id`.
 * @returns Updated {@link HueFormState} on error, or redirects on success.
 */
export async function deleteHue(
  prevState: HueFormState,
  formData: FormData
): Promise<HueFormState> {
  const id = (formData.get('id') as string | null)?.trim() ?? ''

  const supabase = await createClient()
  const { error } = await supabase.from('hues').delete().eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/hues')
  redirect('/admin/hues')
}

/**
 * Removes the hue association from a single paint by setting `hue_id = null`.
 *
 * Reads `paint_id` from formData and clears its `hue_id`. Revalidates
 * the referring hue detail page via `hue_id` from formData.
 *
 * @param prevState - The previous action state.
 * @param formData - Form data containing `paint_id` and optionally `hue_id` for revalidation.
 * @returns Updated {@link PaintHueActionState} indicating success or error.
 */
export async function removePaintHueAssociation(
  prevState: PaintHueActionState,
  formData: FormData
): Promise<PaintHueActionState> {
  const paint_id = (formData.get('paint_id') as string | null)?.trim() ?? ''
  const hue_id = (formData.get('hue_id') as string | null)?.trim() ?? ''

  const supabase = await createClient()
  const { error } = await supabase
    .from('paints')
    .update({ hue_id: null })
    .eq('id', paint_id)

  if (error) {
    return { error: error.message }
  }

  if (hue_id) {
    revalidatePath(`/admin/hues/${hue_id}`)
  }

  return { success: true, removed_count: 1 }
}

/**
 * Removes hue associations from multiple paints by setting `hue_id = null`.
 *
 * Reads `paint_ids` (comma-separated) from formData and clears `hue_id` for
 * all matching paints. Revalidates the referring hue detail page.
 *
 * @param prevState - The previous action state.
 * @param formData - Form data containing `paint_ids` (comma-separated) and optionally `hue_id`.
 * @returns Updated {@link PaintHueActionState} indicating success or error.
 */
export async function bulkRemovePaintHueAssociations(
  prevState: PaintHueActionState,
  formData: FormData
): Promise<PaintHueActionState> {
  const paint_ids_raw = (formData.get('paint_ids') as string | null)?.trim() ?? ''
  const hue_id = (formData.get('hue_id') as string | null)?.trim() ?? ''
  const paint_ids = paint_ids_raw
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)

  if (paint_ids.length === 0) {
    return { error: 'No paints selected.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('paints')
    .update({ hue_id: null })
    .in('id', paint_ids)

  if (error) {
    return { error: error.message }
  }

  if (hue_id) {
    revalidatePath(`/admin/hues/${hue_id}`)
  }

  return { success: true, removed_count: paint_ids.length }
}
