/**
 * Active filter selections for the color wheel.
 *
 * All array fields use IDs so the UI can resolve labels independently.
 * `ownedOnly` is silently ignored when `userPaintIds` is unavailable
 * (unauthenticated visitors who deep-link with `?owned=1`).
 */
export type WheelFilterState = {
  /** Selected brand IDs (multi-select). */
  brandIds: string[]
  /** Selected product line IDs — further narrows brand selection. */
  productLineIds: string[]
  /** Selected paint types (e.g. "Base", "Layer", "Shade"). */
  paintTypes: string[]
  /** When true, show only paints the signed-in user owns. */
  ownedOnly: boolean
}

/** Empty filter state — no filters active. */
export const EMPTY_FILTER_STATE: WheelFilterState = {
  brandIds: [],
  productLineIds: [],
  paintTypes: [],
  ownedOnly: false,
}
