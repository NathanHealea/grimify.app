import { createClient } from '@/lib/supabase/server'

/**
 * A role with its database ID and display name.
 */
export type RoleRecord = { id: string; name: string }

/**
 * Returns the roles assigned to a user, including their IDs and names.
 *
 * Joins `user_roles → roles` to include role metadata. Returns an empty
 * array when the user has no assigned roles or the user does not exist.
 *
 * @param userId - UUID of the user whose roles to fetch.
 * @returns Array of `{ id, name }` role objects.
 */
export async function getUserRoles(userId: string): Promise<RoleRecord[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('user_roles')
    .select('roles(id, name)')
    .eq('user_id', userId)

  return (
    (data ?? []) as unknown as { roles: { id: string; name: string } | null }[]
  )
    .map((r) => r.roles)
    .filter((r): r is RoleRecord => r !== null)
}
