import type { Role } from '@/modules/user/types/role'

/**
 * A user profile with their assigned role names.
 *
 * Represents a `profiles` row joined with the user's roles from the
 * `user_roles` / `roles` tables. Used by admin interfaces to display
 * users alongside their current role assignments.
 *
 * `email` is synced from `auth.users` into the `profiles` table via trigger.
 * `created_at` is the profile creation timestamp (matches auth user creation).
 */
export type UserWithRoles = {
  id: string
  display_name: string | null
  avatar_url: string | null
  email: string | null
  created_at: string
  roles: Role[]
}
