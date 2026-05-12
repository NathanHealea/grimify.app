/**
 * Filter state for the Similar Paints section on the paint detail page.
 *
 * @property brandIds - Brand IDs the user has restricted to. Empty array
 *   means "all brands except the source brand" (engine default behaviour).
 * @property paintTypes - Paint types the user has restricted to. Empty array
 *   means "all types". The sentinel `'Untyped'` represents `paint_type === null`.
 * @property sameBrandOnly - When `true`, the engine is asked to keep
 *   same-brand candidates and `brandIds` is restricted to the source brand.
 *   Mutually exclusive with the `brandIds` chips — the UI disables the brand
 *   multi-select while this is on.
 */
export type SimilarPaintsFilterState = {
  brandIds: string[]
  paintTypes: string[]
  sameBrandOnly: boolean
}

/** The neutral starting state for {@link SimilarPaintsFilterState}. */
export const EMPTY_SIMILAR_PAINTS_FILTER_STATE: SimilarPaintsFilterState = {
  brandIds: [],
  paintTypes: [],
  sameBrandOnly: false,
}

/** Sentinel used to represent paints with `paint_type === null` in the filter UI. */
export const UNTYPED_PAINT_TYPE = 'Untyped'
