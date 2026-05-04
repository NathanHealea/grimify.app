/**
 * Return shape for `createPalette` and `updatePalette` server actions.
 *
 * Compatible with React 19's `useActionState`. On validation failure, `errors`
 * contains per-field messages and `values` echoes the submitted inputs so the
 * form can re-populate. On success, `success` is `true` and the action
 * redirects — so this state is only observed on error.
 */
export type PaletteFormState = {
  /** Last-submitted field values, used to re-populate the form on error. */
  values: {
    name: string
    description: string
    isPublic: boolean
  }
  /** Per-field and form-level error messages. */
  errors: {
    /** Validation error for the name field. */
    name?: string
    /** Validation error for the description field. */
    description?: string
    /** General form-level error (e.g. auth failure, DB error). */
    form?: string
  }
  /** `true` after a successful mutation (before redirect fires). */
  success?: boolean
}
