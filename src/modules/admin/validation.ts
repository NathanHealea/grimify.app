import { BUILTIN_ROLES } from '@/modules/user/types/role'

/** Pattern for valid role names: starts with a letter, then lowercase alphanumeric or hyphens. */
const ROLE_NAME_PATTERN = /^[a-z][a-z0-9-]*$/

/**
 * Validates a role name.
 *
 * Rules: 2-30 characters, lowercase alphanumeric with hyphens,
 * must start with a letter, cannot match a built-in role name.
 *
 * @param name - The role name to validate.
 * @returns Error message string, or `null` if valid.
 */
export function validateRoleName(name: string): string | null {
  const trimmed = name.trim()

  if (!trimmed) {
    return 'Role name is required.'
  }

  if (trimmed.length < 2 || trimmed.length > 30) {
    return 'Role name must be between 2 and 30 characters.'
  }

  if (!ROLE_NAME_PATTERN.test(trimmed)) {
    return 'Role name must start with a letter and contain only lowercase letters, numbers, and hyphens.'
  }

  if (
    BUILTIN_ROLES.includes(trimmed as (typeof BUILTIN_ROLES)[number])
  ) {
    return 'Cannot use a built-in role name.'
  }

  return null
}
