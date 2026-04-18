'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'

/**
 * Revokes a role from a user.
 *
 * Looks up the role name and rejects if it is the baseline `user` role,
 * which cannot be removed from any account. RLS additionally prevents an
 * admin from revoking their own admin role (lockout protection) — that
 * case is detected here with a friendly message rather than a silent
 * no-op.
 *
 * @param userId - UUID of the user to revoke the role from.
 * @param roleId - UUID of the role to revoke.
 * @returns Object with an optional `error` message on failure.
 */
export async function revokeRole(
  userId: string,
  roleId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: role, error: fetchError } = await supabase
    .from('roles')
    .select('name')
    .eq('id', roleId)
    .single()

  if (fetchError || !role) {
    return { error: 'Role not found.' }
  }

  if (role.name === 'user') {
    return { error: 'The "user" role cannot be revoked from any account.' }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user && user.id === userId && role.name === 'admin') {
    return {
      error:
        'You cannot revoke your own admin role. Ask another admin to do it.',
    }
  }

  const { data, error } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role_id', roleId)
    .select()

  if (error) {
    return { error: error.message }
  }

  if (!data || data.length === 0) {
    return { error: 'Revoke was blocked. The assignment may not exist.' }
  }

  revalidatePath('/admin/roles')
  revalidatePath('/admin/users')
  return {}
}
