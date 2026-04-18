import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/modules/user/types/role'

/**
 * Fetches all roles assigned to a user.
 *
 * Queries the `user_roles` table joined with `roles` to return an array
 * of role name strings. Each call hits the database to ensure freshness.
 *
 * @param userId - The user's UUID.
 * @returns Array of {@link Role} name strings.
 */
export async function getUserRoles(userId: string): Promise<Role[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('user_roles')
    .select('roles(name)')
    .eq('user_id', userId)

  if (error || !data) {
    return []
  }

  return data
    .map((row) => (row.roles as unknown as { name: string })?.name)
    .filter((name): name is string => typeof name === 'string')
}

/**
 * Checks whether a user holds a specific role.
 *
 * Convenience wrapper around {@link getUserRoles} for single-role checks.
 *
 * @param userId - The user's UUID.
 * @param role - The {@link Role} to check for.
 * @returns `true` if the user has the role, `false` otherwise.
 */
export async function hasRole(userId: string, role: Role): Promise<boolean> {
  const roles = await getUserRoles(userId)
  return roles.includes(role)
}
