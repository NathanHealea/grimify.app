/**
 * Validates the palette name field.
 *
 * @param name - The raw input string from the form.
 * @returns An error message string, or `null` if valid.
 * @remarks Name is required and must be 1–80 characters after trimming.
 */
export function validatePaletteName(name: string): string | null {
  const trimmed = name.trim()
  if (!trimmed) return 'Name is required.'
  if (trimmed.length > 80) return 'Name must be 80 characters or fewer.'
  return null
}

/**
 * Validates the palette description field.
 *
 * @param desc - The raw input string from the form.
 * @returns An error message string, or `null` if valid.
 * @remarks Description is optional; if provided it must be ≤ 1000 characters after trimming.
 */
export function validatePaletteDescription(desc: string): string | null {
  if (desc.trim().length > 1000) return 'Description must be 1000 characters or fewer.'
  return null
}

/**
 * Validates a palette group name field.
 *
 * @param name - The raw input string.
 * @returns An error message string, or `null` if valid.
 * @remarks Name is required and must be 1–100 characters after trimming.
 */
export function validateGroupName(name: string): string | null {
  const trimmed = name.trim()
  if (!trimmed) return 'Group name is required.'
  if (trimmed.length > 100) return 'Group name must be 100 characters or fewer.'
  return null
}

/**
 * Validates the combined palette form input.
 *
 * @param input - The raw form values.
 * @param input.name - Palette name field value.
 * @param input.description - Palette description field value.
 * @returns A map of field names to error messages; empty object means no errors.
 */
export function validatePaletteForm(input: {
  name: string
  description: string
}): { name?: string; description?: string } {
  const errors: { name?: string; description?: string } = {}

  const nameError = validatePaletteName(input.name)
  if (nameError) errors.name = nameError

  const descError = validatePaletteDescription(input.description)
  if (descError) errors.description = descError

  return errors
}
