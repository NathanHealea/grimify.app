'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { setBanStatus } from '@/modules/user/services/auth-user-service'
import { getUserRoles } from '@/modules/user/services/user-roles-service'

/**
 * Bans or unbans a user account via the Supabase Admin API.
 *
 * Uses `ban_duration: '876000h'` (100 years) to effectively ban the user,
 * or `ban_duration: 'none'` to remove the ban. Does not delete any data.
 *
 * @remarks
 * Prevents admins from deactivating their own account or the owner account.
 * Authentication is checked via the anon client; the ban itself is applied
 * via the service-role admin client which bypasses RLS.
 *
 * @param userId - UUID of the account to ban or unban.
 * @param ban - `true` to deactivate (ban), `false` to reactivate (unban).
 * @returns Object with an optional `error` message on failure.
 */
export async function deactivateUser(
  userId: string,
  ban: boolean
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated.' }
  }

  if (user.id === userId) {
    return { error: 'You cannot deactivate your own account.' }
  }

  const roles = await getUserRoles(userId)

  if (roles.some((r) => r.name === 'owner')) {
    return { error: 'The owner account cannot be deactivated.' }
  }

  const result = await setBanStatus(userId, ban)
  if (result.error) return result

  revalidatePath('/admin/users')
  revalidatePath(`/admin/users/${userId}`)
  return {}
}
