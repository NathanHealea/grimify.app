'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'

/**
 * Deletes a custom role that has no assigned users.
 *
 * Checks the role is not built-in and has zero user assignments before
 * deleting. Database triggers also prevent deletion of built-in roles.
 * Revalidates the roles list page on success.
 *
 * @param roleId - UUID of the role to delete.
 * @returns Object with an optional `error` message on failure.
 */
export async function deleteRole(
  roleId: string
): Promise<{ error?: string }> {
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
    return { error: 'Built-in roles cannot be deleted.' }
  }

  // Count assigned users
  const { count, error: countError } = await supabase
    .from('user_roles')
    .select('user_id', { count: 'exact', head: true })
    .eq('role_id', roleId)

  if (countError) {
    return { error: countError.message }
  }

  if (count && count > 0) {
    return { error: 'Role has assigned users. Revoke all assignments before deleting.' }
  }

  const { error } = await supabase
    .from('roles')
    .delete()
    .eq('id', roleId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/roles')
  return {}
}
