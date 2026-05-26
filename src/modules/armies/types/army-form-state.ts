/**
 * State returned by army server actions (create, update, delete).
 *
 * When `null`, no action has been dispatched yet.
 * On validation failure, `errors` contains field-level messages and `values`
 * echoes the submitted inputs so the form can re-populate.
 * On server error, `error` contains a general message.
 * On success, `success` is `true`.
 */
export type ArmyFormState = {
  /** Echoed form values so the form can re-populate on error. */
  values?: {
    name?: string
    slug?: string
    parent_id?: string | null
    sort_order?: number | null
  }
  /** Field-level validation errors. */
  errors?: {
    name?: string
    slug?: string
    parent_id?: string
    sort_order?: string
  }
  /** General server or DB error message. */
  error?: string
  /** `true` after a successful mutation (before any redirect fires). */
  success?: boolean
} | null
