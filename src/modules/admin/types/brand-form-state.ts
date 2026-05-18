/**
 * State returned by brand server actions (create, update, delete).
 *
 * When `null`, no action has been dispatched yet.
 * On validation failure, `errors` contains field-level messages.
 * On server error, `error` contains a general message.
 * On success, `success` is `true`.
 */
export type BrandFormState = {
  errors?: {
    name?: string
    slug?: string
    website_url?: string
    logo_url?: string
  }
  error?: string
  success?: boolean
} | null
