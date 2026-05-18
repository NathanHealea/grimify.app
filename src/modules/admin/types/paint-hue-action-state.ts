/**
 * State returned by paint-hue association server actions.
 *
 * When `null`, no action has been dispatched yet.
 * On error, `error` contains a message.
 * On success, `success` is `true` and `removed_count` indicates how many
 * paint rows had their `hue_id` cleared.
 */
export type PaintHueActionState = {
  error?: string
  success?: boolean
  removed_count?: number
} | null
