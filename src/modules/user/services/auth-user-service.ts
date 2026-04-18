import type { User } from '@supabase/supabase-js'

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Retrieves the Supabase auth user record for a given user ID.
 *
 * Uses the service-role admin client which bypasses RLS and exposes full
 * auth metadata: ban status, linked identities, last sign-in time, etc.
 * Returns `null` if the user is not found or the lookup fails.
 *
 * @param userId - UUID of the auth user to look up.
 * @returns The Supabase {@link User} object, or `null`.
 */
export async function getAuthUser(userId: string): Promise<User | null> {
  const adminClient = createAdminClient()
  const { data } = await adminClient.auth.admin.getUserById(userId)
  return data?.user ?? null
}

/**
 * Bans or unbans a user account via the Supabase Admin API.
 *
 * Sets `ban_duration` to `'876000h'` (~100 years) to effectively deactivate
 * the account, or `'none'` to lift an existing ban. Does not delete any data.
 *
 * @param userId - UUID of the account to update.
 * @param ban - `true` to ban (deactivate), `false` to unban (reactivate).
 * @returns Object with an optional `error` message on failure.
 */
export async function setBanStatus(
  userId: string,
  ban: boolean
): Promise<{ error?: string }> {
  const adminClient = createAdminClient()
  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    ban_duration: ban ? '876000h' : 'none',
  })
  if (error) return { error: error.message }
  return {}
}
