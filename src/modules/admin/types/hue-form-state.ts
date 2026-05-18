/**
 * State returned by hue server actions (create, update, delete).
 *
 * When `null`, no action has been dispatched yet.
 * On validation failure, `errors` contains field-level messages.
 * On server error, `error` contains a general message.
 * On success, `success` is `true`.
 */
export type HueFormState = {
  errors?: {
    name?: string
    slug?: string
    hex_code?: string
    sort_order?: string
  }
  error?: string
  success?: boolean
} | null
