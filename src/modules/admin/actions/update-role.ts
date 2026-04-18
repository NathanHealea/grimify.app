'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { validateRoleName } from '@/modules/admin/validation'

/**
 * Renames an existing custom role.
 *
 * Validates the new name, checks the role is not built-in, and updates
 * the `roles` row. Database triggers also guard against renaming built-in
 * roles. Revalidates the roles pages on success.
 *
 * @param roleId - UUID of the role to rename.
 * @param newName - The new name for the role.
 * @returns Object with an optional `error` message on failure.
 */
export async function updateRole(
  roleId: string,
  newName: string
): Promise<{ error?: string }> {
  const trimmed = newName.trim()
  const validationError = validateRoleName(trimmed)
  if (validationError) {
    return { error: validationError }
  }

  const supabase = await createClient()

  // Verify role exists and is not built-in
  const { data: role, error: fetchError } = await supabase
    .from('roles')
    .select('id, builtin')
    .eq('id', roleId)
    .single()

  if (fetchError || !role) {
    return { error: 'Role not found.' }
  }

  if (role.builtin) {
    return { error: 'Built-in roles cannot be renamed.' }
  }

  const { error } = await supabase
    .from('roles')
    .update({ name: trimmed })
    .eq('id', roleId)

  if (error) {
    if (error.code === '23505') {
      return { error: 'Role name already exists.' }
    }
    return { error: error.message }
  }

  revalidatePath('/admin/roles')
  return {}
}
