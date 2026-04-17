/** A role name string. Built-in roles are `'user'` and `'admin'`. */
export type Role = string

/** Built-in role names that cannot be modified or deleted. */
export const BUILTIN_ROLES = ['user', 'admin'] as const

/**
 * Type guard for checking if a role name is built-in.
 *
 * @param name - The role name to check.
 * @returns `true` if the role is one of the {@link BUILTIN_ROLES}.
 */
export function isBuiltinRole(name: string): boolean {
  return BUILTIN_ROLES.includes(name as (typeof BUILTIN_ROLES)[number])
}
