'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Admin-only server action that permanently deletes a user account.
 *
 * Invokes the `admin_delete_user` Postgres RPC, which re-verifies that the
 * caller holds the `admin` role, blocks self-deletion, and removes the row
 * from `auth.users` — cascading to `profiles` and `user_roles`.
 *
 * @param userId - UUID of the account to delete.
 * @returns Object with an optional `error` message on failure.
 */
export async function deleteUser(
  userId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase.rpc('admin_delete_user', {
    target_id: userId,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/users')
  return {}
}
