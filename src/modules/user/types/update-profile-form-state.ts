/**
 * State returned by the {@link updateProfile} server action.
 *
 * `null` represents the initial state before the form has been submitted.
 * Field-level errors are keyed by their form field name. The top-level
 * `error` field carries general (non-field) errors. `success` is `true`
 * when the update completed without errors.
 */
export type UpdateProfileFormState = {
  errors?: {
    display_name?: string
    bio?: string
  }
  error?: string
  success?: boolean
} | null
