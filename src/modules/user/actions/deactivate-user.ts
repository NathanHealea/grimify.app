'use server'

import { revalidatePath } from 'next/cache'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

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

  // Block modification of owner accounts
  const { data: targetRoles } = await supabase
    .from('user_roles')
    .select('roles(name)')
    .eq('user_id', userId)

  const targetRoleNames = (
    (targetRoles ?? []) as unknown as { roles: { name: string } | null }[]
  )
    .map((r) => r.roles?.name)
    .filter((n): n is string => typeof n === 'string')

  if (targetRoleNames.includes('owner')) {
    return { error: 'The owner account cannot be deactivated.' }
  }

  const adminClient = createAdminClient()

  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    ban_duration: ban ? '876000h' : 'none',
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/users')
  revalidatePath(`/admin/users/${userId}`)
  return {}
}
