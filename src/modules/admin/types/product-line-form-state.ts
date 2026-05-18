/**
 * State returned by product-line server actions (create, update, delete).
 *
 * When `null`, no action has been dispatched yet.
 * On validation failure, `errors` contains field-level messages.
 * On server error, `error` contains a general message.
 * On success, `success` is `true`.
 */
export type ProductLineFormState = {
  errors?: {
    name?: string
    slug?: string
  }
  error?: string
  success?: boolean
} | null
