/**
 * State returned by paint server actions (create, update, delete).
 *
 * When `null`, no action has been dispatched yet.
 * On validation failure, `errors` contains field-level messages and
 * `fields` contains the submitted values for form repopulation.
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
  /** Submitted field values echoed back on error for form repopulation. */
  fields?: {
    name?: string
    slug?: string
    hex?: string
    brand_id?: string
    product_line_id?: string
    brand_paint_id?: string
    paint_type?: string
    parent_hue_id?: string
    child_hue_id?: string
    is_metallic?: boolean
    is_discontinued?: boolean
  }
  error?: string
  success?: boolean
} | null
