/**
 * Validates the recipe title field.
 *
 * @param title - The raw input string from the form.
 * @returns An error message string, or `null` if valid.
 * @remarks Title is required and must be 1–120 characters after trimming.
 */
export function validateRecipeTitle(title: string): string | null {
  const trimmed = title.trim()
  if (!trimmed) return 'Title is required.'
  if (trimmed.length > 120) return 'Title must be 120 characters or fewer.'
  return null
}

/**
 * Validates the recipe summary field.
 *
 * @param summary - The raw input string from the form.
 * @returns An error message string, or `null` if valid.
 * @remarks Summary is optional; if provided it must be ≤ 5000 characters after trimming.
 */
export function validateRecipeSummary(summary: string): string | null {
  if (summary.trim().length > 5000) return 'Summary must be 5000 characters or fewer.'
  return null
}

/**
 * Validates the combined recipe form input.
 *
 * @param input - The raw form values.
 * @param input.title - Recipe title field value.
 * @param input.summary - Recipe summary field value.
 * @returns A map of field names to error messages; empty object means no errors.
 */
export function validateRecipeForm(input: {
  title: string
  summary: string
}): { title?: string; summary?: string } {
  const errors: { title?: string; summary?: string } = {}

  const titleError = validateRecipeTitle(input.title)
  if (titleError) errors.title = titleError

  const summaryError = validateRecipeSummary(input.summary)
  if (summaryError) errors.summary = summaryError

  return errors
}
