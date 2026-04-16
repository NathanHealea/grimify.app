'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Grants or revokes the admin role for the specified user.
 *
 * RLS enforces that only admins can call this and self-modification is blocked.
 * Revalidates `/admin/users` on success.
 *
 * @param userId - UUID of the target user.
 * @param action - Whether to `'grant'` or `'revoke'` the admin role.
 * @returns Object with an optional `error` message on failure.
 */
export async function toggleAdminRole(
  userId: string,
  action: 'grant' | 'revoke'
): Promise<{ error?: string }> {
  const supabase = await createClient()

  // Look up the admin role ID
  const { data: adminRole, error: roleError } = await supabase
    .from('roles')
    .select('id')
    .eq('name', 'admin')
    .single()

  if (roleError || !adminRole) {
    return { error: 'Failed to look up admin role.' }
  }

  if (action === 'grant') {
    const { error } = await supabase
      .from('user_roles')
      .insert({ user_id: userId, role_id: adminRole.id })

    if (error) {
      // Handle unique constraint violation (user already has the role)
      if (error.code === '23505') {
        return { error: 'User already has the admin role.' }
      }
      return { error: error.message }
    }
  } else {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role_id', adminRole.id)

    if (error) {
      return { error: error.message }
    }
  }

  revalidatePath('/admin/users')
  return {}
}
