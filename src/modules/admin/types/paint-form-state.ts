/**
 * State returned by paint server actions (create, update, delete).
 *
 * When `null`, no action has been dispatched yet.
 * On validation failure, `errors` contains field-level messages.
 * On server error, `error` contains a general message.
 * On success, `success` is `true`.
 */
export type PaintFormState = {
  errors?: {
    name?: string
    slug?: string
    hex?: string
    brand_id?: string
    product_line_id?: string
    hue?: string
    brand_paint_id?: string
  }
  error?: string
  success?: boolean
} | null
