import type { Role } from '@/modules/user/types/role'

/**
 * A user profile with their assigned role names.
 *
 * Represents a `profiles` row joined with the user's roles from the
 * `user_roles` / `roles` tables. Used by admin interfaces to display
 * users alongside their current role assignments.
 */
export type UserWithRoles = {
  id: string
  display_name: string | null
  avatar_url: string | null
  roles: Role[]
}
