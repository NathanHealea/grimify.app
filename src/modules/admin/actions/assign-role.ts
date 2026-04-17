'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'

/**
 * Assigns a role to a user.
 *
 * Inserts into `user_roles`. RLS enforces admin-only access; admins may
 * assign roles to themselves. Revalidates the role detail and users
 * pages on success.
 *
 * @param userId - UUID of the user to assign the role to.
 * @param roleId - UUID of the role to assign.
 * @returns Object with an optional `error` message on failure.
 */
export async function assignRole(
  userId: string,
  roleId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('user_roles')
    .insert({ user_id: userId, role_id: roleId })
    .select()

  if (error) {
    if (error.code === '23505') {
      return { error: 'User already has this role.' }
    }
    return { error: error.message }
  }

  if (!data || data.length === 0) {
    return {
      error:
        'Assignment was blocked. You may not have permission to assign this role.',
    }
  }

  revalidatePath('/admin/roles')
  revalidatePath('/admin/users')
  return {}
}
