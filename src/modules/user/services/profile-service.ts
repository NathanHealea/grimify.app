import { createClient } from '@/lib/supabase/server'
import type { UserWithRoles } from '@/modules/user/types/user-with-roles'

/**
 * Parameters for the paginated user list query.
 */
export interface ListProfilesParams {
  /** Display name search term (case-insensitive substring match). */
  q?: string | null
  /** Filter to users assigned this role ID. Omit or pass `null` for all users. */
  roleId?: string | null
  /** Zero-based row offset for pagination. */
  offset: number
  /** Maximum number of rows to return. */
  limit: number
}

/**
 * A full `profiles` table row.
 *
 * Mirrors the columns selected by {@link getProfileById}. The `email` field
 * is synced from `auth.users` via trigger and may be `null` for legacy rows.
 */
export type ProfileRow = {
  id: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  email: string | null
  has_setup_profile: boolean
  created_at: string
  updated_at: string
}

/**
 * Returns a paginated list of user profiles joined with their assigned role names.
 *
 * Performs a left-join through `user_roles → roles` to include each profile's
 * role names. Supports optional display-name substring search and role filtering.
 *
 * @param params - Pagination, search, and filter options.
 * @returns Mapped {@link UserWithRoles} array and the total matching row count.
 */
export async function listProfiles(
  params: ListProfilesParams
): Promise<{ users: UserWithRoles[]; count: number }> {
  const supabase = await createClient()

  let query = supabase
    .from('profiles')
    .select(
      'id, display_name, avatar_url, email, created_at, user_roles!left(role_id, roles(name))',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(params.offset, params.offset + params.limit - 1)

  if (params.q) {
    query = query.ilike('display_name', `%${params.q}%`)
  }

  if (params.roleId) {
    query = query.eq('user_roles.role_id', params.roleId)
  }

  const { data, count } = await query

  const users: UserWithRoles[] = (data ?? []).map((profile) => ({
    id: profile.id,
    display_name: profile.display_name,
    avatar_url: profile.avatar_url,
    email: (profile.email as string | null) ?? null,
    created_at: profile.created_at,
    roles: (
      (profile.user_roles as unknown as { roles: { name: string } | null }[]) ?? []
    )
      .map((ur) => ur.roles?.name)
      .filter((name): name is string => typeof name === 'string'),
  }))

  return { users, count: count ?? 0 }
}

/**
 * Fetches a single profile row by user ID.
 *
 * Returns `null` when the profile does not exist rather than throwing, so
 * callers can branch to `notFound()` or handle the absence explicitly.
 *
 * @param id - UUID of the user whose profile to fetch.
 * @returns The full {@link ProfileRow}, or `null` if not found.
 */
export async function getProfileById(id: string): Promise<ProfileRow | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()
  return (data as ProfileRow | null) ?? null
}
