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
 * - 3-20 characters
 * - Only letters, numbers, hyphens, underscores (`/^[a-zA-Z0-9_-]+$/`)
 */
export function validateDisplayName(name: string): string | null {
  const trimmed = name.trim()

  if (!trimmed) {
    return 'Display name is required.'
  }

  if (trimmed.length < 3) {
    return 'Display name must be at least 3 characters.'
  }

  if (trimmed.length > 20) {
    return 'Display name must be 20 characters or fewer.'
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return 'Display name can only contain letters, numbers, hyphens, and underscores.'
  }

  return null
}

/**
 * Validates a bio string.
 *
 * Bio is optional — an empty string is valid. The only constraint is
 * a 500-character maximum.
 *
 * @param bio - The raw bio input to validate.
 * @returns An error message string if invalid, or `null` if valid.
 */
export function validateBio(bio: string): string | null {
  if (bio.length > 500) return 'Bio must be 500 characters or fewer.'
  return null
}
