'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import type { ProductLineFormState } from '@/modules/admin/types/product-line-form-state'

/** Slug validation pattern: only lowercase letters, digits, and hyphens. */
const SLUG_PATTERN = /^[a-z0-9-]+$/

/**
 * Creates a new product line under a brand.
 *
 * Reads `brand_id` from the hidden form field, validates required fields
 * (name, slug), and inserts into `product_lines`. Revalidates the brand
 * detail page after success.
 *
 * @param prevState - The previous action state.
 * @param formData - Form data containing `brand_id`, `name`, `slug`.
 * @returns Updated {@link ProductLineFormState} indicating success or error.
 */
export async function createProductLine(
  prevState: ProductLineFormState,
  formData: FormData
): Promise<ProductLineFormState> {
  const brand_id = parseInt(formData.get('brand_id') as string, 10)
  const name = (formData.get('name') as string | null)?.trim() ?? ''
  const slug = (formData.get('slug') as string | null)?.trim() ?? ''

  const fieldErrors: { name?: string; slug?: string } = {}

  if (!name) fieldErrors.name = 'Name is required.'
  if (!slug) {
    fieldErrors.slug = 'Slug is required.'
  } else if (!SLUG_PATTERN.test(slug)) {
    fieldErrors.slug = 'Slug may only contain lowercase letters, digits, and hyphens.'
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { errors: fieldErrors }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('product_lines')
    .insert({ brand_id, name, slug })

  if (error) {
    if (error.code === '23505') {
      return { errors: { slug: 'A product line with this slug already exists for this brand.' } }
    }
    return { error: error.message }
  }

  revalidatePath(`/admin/brands/${brand_id}`)
  return { success: true }
}

/**
 * Updates an existing product line.
 *
 * Reads `id` and `brand_id` from hidden form fields, validates required fields,
 * and updates the `product_lines` row. Revalidates the brand detail page.
 *
 * @param prevState - The previous action state.
 * @param formData - Form data containing `id`, `brand_id`, `name`, `slug`.
 * @returns Updated {@link ProductLineFormState} indicating success or error.
 */
export async function updateProductLine(
  prevState: ProductLineFormState,
  formData: FormData
): Promise<ProductLineFormState> {
  const id = parseInt(formData.get('id') as string, 10)
  const brand_id = parseInt(formData.get('brand_id') as string, 10)
  const name = (formData.get('name') as string | null)?.trim() ?? ''
  const slug = (formData.get('slug') as string | null)?.trim() ?? ''

  const fieldErrors: { name?: string; slug?: string } = {}

  if (!name) fieldErrors.name = 'Name is required.'
  if (!slug) {
    fieldErrors.slug = 'Slug is required.'
  } else if (!SLUG_PATTERN.test(slug)) {
    fieldErrors.slug = 'Slug may only contain lowercase letters, digits, and hyphens.'
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { errors: fieldErrors }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('product_lines')
    .update({ name, slug })
    .eq('id', id)

  if (error) {
    if (error.code === '23505') {
      return { errors: { slug: 'A product line with this slug already exists for this brand.' } }
    }
    return { error: error.message }
  }

  revalidatePath(`/admin/brands/${brand_id}`)
  return { success: true }
}

/**
 * Deletes a product line.
 *
 * Reads `id` and `brand_id` from hidden form fields, deletes the row,
 * and revalidates the brand detail page.
 *
 * @param prevState - The previous action state.
 * @param formData - Form data containing `id`, `brand_id`.
 * @returns Updated {@link ProductLineFormState} indicating success or error.
 */
export async function deleteProductLine(
  prevState: ProductLineFormState,
  formData: FormData
): Promise<ProductLineFormState> {
  const id = parseInt(formData.get('id') as string, 10)
  const brand_id = parseInt(formData.get('brand_id') as string, 10)

  const supabase = await createClient()
  const { error } = await supabase.from('product_lines').delete().eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/admin/brands/${brand_id}`)
  return { success: true }
}
