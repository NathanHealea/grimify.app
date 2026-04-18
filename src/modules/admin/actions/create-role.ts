'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { validateRoleName } from '@/modules/admin/validation'

/**
 * Creates a new custom role.
 *
 * Validates the name, inserts into `roles` with `builtin: false`, and
 * revalidates the roles list page. RLS enforces that only admins can insert.
 *
 * @param name - The role name to create.
 * @returns Object with an optional `error` message on failure.
 */
export async function createRole(
  name: string
): Promise<{ error?: string }> {
  const trimmed = name.trim()
  const validationError = validateRoleName(trimmed)
  if (validationError) {
    return { error: validationError }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('roles')
    .insert({ name: trimmed, builtin: false })

  if (error) {
    if (error.code === '23505') {
      return { error: 'Role name already exists.' }
    }
    return { error: error.message }
  }

  revalidatePath('/admin/roles')
  return {}
}
