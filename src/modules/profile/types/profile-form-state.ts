/**
 * Server action return state for the profile setup form.
 *
 * - `errors` — field-level validation errors keyed by field name.
 * - `error` — a general error message (e.g. auth failure, DB error).
 * - `null` — initial state before any submission.
 */
export type ProfileFormState = {
  errors?: { display_name?: string }
  error?: string
} | null
