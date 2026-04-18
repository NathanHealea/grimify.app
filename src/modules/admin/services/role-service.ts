import { createClient } from '@/lib/supabase/server'

/**
 * A role with its database ID and display name.
 */
export type RoleSummary = { id: string; name: string }

/**
 * Returns all roles in the system, ordered alphabetically by name.
 *
 * @returns Array of `{ id, name }` role objects.
 */
export async function listRoles(): Promise<RoleSummary[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('roles').select('id, name').order('name')
  return data ?? []
}

/**
 * Fetches a single role by its ID.
 *
 * @param roleId - UUID of the role to look up.
 * @returns The role's name, or `null` if the role does not exist.
 */
export async function getRoleById(
  roleId: string
): Promise<{ name: string } | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('roles')
    .select('name')
    .eq('id', roleId)
    .single()
  return data ?? null
}
