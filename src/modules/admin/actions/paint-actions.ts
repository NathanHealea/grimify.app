'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { hexToRgb, rgbToHsl } from '@/lib/color-utils'
import type { PaintFormState } from '@/modules/admin/types/paint-form-state'

/**
 * Converts a raw string into a URL-safe slug.
 *
 * @param value - The raw input string.
 * @returns A lowercase, hyphenated slug string.
 */
function toSlug(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

/**
 * Creates a new paint.
 *
 * Validates required fields (name, hex, product_line_id, brand_paint_id).
 * Computes RGB and HSL from hex. Auto-generates slug from name.
 * Verifies child hue belongs to parent hue if both are provided.
 * Sets `hue_id` to child_hue_id when present, else parent_hue_id.
 * Inserts into `paints`, revalidates `/admin/paints`, and redirects to the
 * new paint's detail page.
 *
 * @param prevState - The previous action state.
 * @param formData - Form data with name, hex, product_line_id, brand_paint_id,
 *   optionally parent_hue_id, child_hue_id, is_metallic, is_discontinued, paint_type.
 * @returns Updated {@link PaintFormState} on error, or redirects on success.
 */
export async function createPaint(
  prevState: PaintFormState,
  formData: FormData
): Promise<PaintFormState> {
  const name = (formData.get('name') as string | null)?.trim() ?? ''
  const hex = (formData.get('hex') as string | null)?.trim().replace('#', '') ?? ''
  const product_line_id = formData.get('product_line_id') as string | null
  const brand_paint_id = (formData.get('brand_paint_id') as string | null)?.trim() ?? ''
  const paint_type = (formData.get('paint_type') as string | null)?.trim() || null
  const parent_hue_id = (formData.get('parent_hue_id') as string | null)?.trim() || null
  const child_hue_id = (formData.get('child_hue_id') as string | null)?.trim() || null
  const is_metallic = formData.get('is_metallic') === 'on'
  const is_discontinued = formData.get('is_discontinued') === 'on'

  const fieldErrors: NonNullable<NonNullable<PaintFormState>['errors']> = {}

  if (!name) fieldErrors.name = 'Name is required.'
  if (!hex) {
    fieldErrors.hex = 'Hex color is required.'
  } else if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    fieldErrors.hex = 'Hex must be a valid 6-digit hex code.'
  }
  if (!product_line_id) fieldErrors.product_line_id = 'Product line is required.'
  if (!brand_paint_id) fieldErrors.brand_paint_id = 'Brand paint ID is required.'

  if (Object.keys(fieldErrors).length > 0) {
    return { errors: fieldErrors }
  }

  const rgb = hexToRgb(hex)
  if (!rgb) return { errors: { hex: 'Invalid hex color.' } }
  const { r, g, b } = rgb
  const { h, s, l } = rgbToHsl(r, g, b)
  const slug = toSlug(name)

  // Determine hue_id
  let hue_id: string | null = null
  const supabase = await createClient()

  if (child_hue_id && parent_hue_id) {
    // Verify child belongs to parent
    const { data: childHue } = await supabase
      .from('hues')
      .select('id, parent_id')
      .eq('id', child_hue_id)
      .single()

    if (!childHue || childHue.parent_id !== parent_hue_id) {
      return { errors: { hue: 'Selected child hue does not belong to the selected parent hue.' } }
    }
    hue_id = child_hue_id
  } else if (parent_hue_id) {
    hue_id = parent_hue_id
  }

  const { data, error } = await supabase
    .from('paints')
    .insert({
      name,
      slug,
      hex,
      r,
      g,
      b,
      hue: h,
      saturation: s,
      lightness: l,
      product_line_id: parseInt(product_line_id!, 10),
      brand_paint_id,
      hue_id,
      is_metallic,
      is_discontinued,
      paint_type,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { errors: { slug: 'A paint with this name/slug already exists.' } }
    }
    return { error: error.message }
  }

  revalidatePath('/admin/paints')
  redirect(`/admin/paints/${data.id}`)
}

/**
 * Updates an existing paint.
 *
 * Same validation and color computation logic as {@link createPaint}.
 * Reads `id` from the hidden form field and updates the paint row.
 * Revalidates `/admin/paints` and the paint detail page.
 *
 * @param prevState - The previous action state.
 * @param formData - Form data with `id` plus the same fields as createPaint.
 * @returns Updated {@link PaintFormState} indicating success or error.
 */
export async function updatePaint(
  prevState: PaintFormState,
  formData: FormData
): Promise<PaintFormState> {
  const id = (formData.get('id') as string | null)?.trim() ?? ''
  const name = (formData.get('name') as string | null)?.trim() ?? ''
  const hex = (formData.get('hex') as string | null)?.trim().replace('#', '') ?? ''
  const product_line_id = formData.get('product_line_id') as string | null
  const brand_paint_id = (formData.get('brand_paint_id') as string | null)?.trim() ?? ''
  const paint_type = (formData.get('paint_type') as string | null)?.trim() || null
  const parent_hue_id = (formData.get('parent_hue_id') as string | null)?.trim() || null
  const child_hue_id = (formData.get('child_hue_id') as string | null)?.trim() || null
  const is_metallic = formData.get('is_metallic') === 'on'
  const is_discontinued = formData.get('is_discontinued') === 'on'

  const fieldErrors: NonNullable<NonNullable<PaintFormState>['errors']> = {}

  if (!name) fieldErrors.name = 'Name is required.'
  if (!hex) {
    fieldErrors.hex = 'Hex color is required.'
  } else if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    fieldErrors.hex = 'Hex must be a valid 6-digit hex code.'
  }
  if (!product_line_id) fieldErrors.product_line_id = 'Product line is required.'
  if (!brand_paint_id) fieldErrors.brand_paint_id = 'Brand paint ID is required.'

  if (Object.keys(fieldErrors).length > 0) {
    return { errors: fieldErrors }
  }

  const rgb = hexToRgb(hex)
  if (!rgb) return { errors: { hex: 'Invalid hex color.' } }
  const { r, g, b } = rgb
  const { h, s, l } = rgbToHsl(r, g, b)
  const slug = toSlug(name)

  const supabase = await createClient()

  let hue_id: string | null = null

  if (child_hue_id && parent_hue_id) {
    const { data: childHue } = await supabase
      .from('hues')
      .select('id, parent_id')
      .eq('id', child_hue_id)
      .single()

    if (!childHue || childHue.parent_id !== parent_hue_id) {
      return { errors: { hue: 'Selected child hue does not belong to the selected parent hue.' } }
    }
    hue_id = child_hue_id
  } else if (parent_hue_id) {
    hue_id = parent_hue_id
  }

  const { error } = await supabase
    .from('paints')
    .update({
      name,
      slug,
      hex,
      r,
      g,
      b,
      hue: h,
      saturation: s,
      lightness: l,
      product_line_id: parseInt(product_line_id!, 10),
      brand_paint_id,
      hue_id,
      is_metallic,
      is_discontinued,
      paint_type,
    })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/paints')
  revalidatePath(`/admin/paints/${id}`)
  return { success: true }
}

/**
 * Deletes a paint by ID.
 *
 * Reads `id` from the hidden form field, deletes the row, revalidates
 * `/admin/paints`, and redirects there.
 *
 * @param prevState - The previous action state.
 * @param formData - Form data containing `id`.
 * @returns Updated {@link PaintFormState} on error, or redirects on success.
 */
export async function deletePaint(
  prevState: PaintFormState,
  formData: FormData
): Promise<PaintFormState> {
  const id = (formData.get('id') as string | null)?.trim() ?? ''

  const supabase = await createClient()
  const { error } = await supabase.from('paints').delete().eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/paints')
  redirect('/admin/paints')
}
