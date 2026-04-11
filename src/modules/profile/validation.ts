/**
 * Validates a display name string.
 *
 * Used both client-side (pre-submit) and server-side (in the action)
 * to enforce consistent rules.
 *
 * @param name - The raw display name input to validate.
 * @returns An error message string if invalid, or `null` if valid.
 *
 * @remarks
 * Rules:
 * - Required (non-empty after trim)
 * - 2–50 characters
 * - Only letters, numbers, hyphens, underscores (`/^[a-zA-Z0-9_-]+$/`)
 */
export function validateDisplayName(name: string): string | null {
  const trimmed = name.trim()

  if (!trimmed) {
    return 'Display name is required.'
  }

  if (trimmed.length < 2) {
    return 'Display name must be at least 2 characters.'
  }

  if (trimmed.length > 50) {
    return 'Display name must be 50 characters or fewer.'
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return 'Display name can only contain letters, numbers, hyphens, and underscores.'
  }

  return null
}
