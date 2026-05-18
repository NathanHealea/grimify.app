'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { toSlug } from '@/modules/admin/utils/to-slug'
import type { BrandFormState } from '@/modules/admin/types/brand-form-state'

/** Slug validation pattern: only lowercase letters, digits, and hyphens. */
const SLUG_PATTERN = /^[a-z0-9-]+$/

/**
 * Creates a new brand.
 *
 * Validates required fields (name, slug), inserts into the `brands` table,
 * revalidates `/admin/brands`, and redirects to the new brand's detail page.
 * On validation or server error, returns a {@link BrandFormState} with messages.
 *
 * @param prevState - The previous action state (unused but required by useActionState).
 * @param formData - Form data containing `name`, `slug`, `website_url`, `logo_url`.
 * @returns Updated {@link BrandFormState} or redirects on success.
 */
export async function createBrand(
  prevState: BrandFormState,
  formData: FormData
): Promise<BrandFormState> {
  const name = (formData.get('name') as string | null)?.trim() ?? ''
  const slug = (formData.get('slug') as string | null)?.trim() ?? ''
  const website_url = (formData.get('website_url') as string | null)?.trim() || null
  const logo_url = (formData.get('logo_url') as string | null)?.trim() || null

  const fieldErrors: { name?: string; slug?: string; website_url?: string; logo_url?: string } = {}

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
  const { data, error } = await supabase
    .from('brands')
    .insert({ name, slug, website_url, logo_url })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { errors: { slug: 'A brand with this slug already exists.' } }
    }
    return { error: error.message }
  }

  revalidatePath('/admin/brands')
  redirect(`/admin/brands/${data.id}`)
}

/**
 * Updates an existing brand.
 *
 * Reads `id` from the hidden form field, validates required fields, and updates
 * the `brands` row. Revalidates `/admin/brands` and the brand detail page.
 *
 * @param prevState - The previous action state.
 * @param formData - Form data containing `id`, `name`, `slug`, `website_url`, `logo_url`.
 * @returns Updated {@link BrandFormState} indicating success or error.
 */
export async function updateBrand(
  prevState: BrandFormState,
  formData: FormData
): Promise<BrandFormState> {
  const id = parseInt(formData.get('id') as string, 10)
  const name = (formData.get('name') as string | null)?.trim() ?? ''
  const slug = (formData.get('slug') as string | null)?.trim() ?? ''
  const website_url = (formData.get('website_url') as string | null)?.trim() || null
  const logo_url = (formData.get('logo_url') as string | null)?.trim() || null

  const fieldErrors: { name?: string; slug?: string; website_url?: string; logo_url?: string } = {}

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
    .from('brands')
    .update({ name, slug, website_url, logo_url })
    .eq('id', id)

  if (error) {
    if (error.code === '23505') {
      return { errors: { slug: 'A brand with this slug already exists.' } }
    }
    return { error: error.message }
  }

  revalidatePath('/admin/brands')
  revalidatePath(`/admin/brands/${id}`)
  return { success: true }
}

/**
 * Deletes a brand and all its product lines/paints (cascade).
 *
 * Reads `id` from the hidden form field, deletes the row, revalidates
 * `/admin/brands`, and redirects there.
 *
 * @param prevState - The previous action state.
 * @param formData - Form data containing `id`.
 * @returns Updated {@link BrandFormState} on error, or redirects on success.
 */
export async function deleteBrand(
  prevState: BrandFormState,
  formData: FormData
): Promise<BrandFormState> {
  const id = parseInt(formData.get('id') as string, 10)

  const supabase = await createClient()
  const { error } = await supabase.from('brands').delete().eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/brands')
  redirect('/admin/brands')
}
