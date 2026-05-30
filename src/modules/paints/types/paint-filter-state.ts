import { UNTYPED_PAINT_TYPE } from '@/modules/paints/types/similar-paints-filter-state'

export { UNTYPED_PAINT_TYPE }

/**
 * URL-synced filter state for the public paint explorer, excluding the
 * existing hue and query state which are owned by `useHueFilter` and the
 * search input respectively.
 *
 * @remarks
 * Filter combination semantics: AND across dimensions, OR within a dimension.
 * An empty array for a multi-select dimension means "no constraint" — it does
 * not filter anything.
 *
 * URL contract:
 * - `brandIds`       → `brand=<comma-sep IDs>`
 * - `paintTypes`     → `type=<comma-sep strings>`
 * - `productLineIds` → `line=<comma-sep IDs>` (only when ≥1 brand selected)
 * - `discontinued`   → `disc=include|exclude|only` (omitted when `'include'`)
 * - `metallicOnly`   → `metal=1` (omitted when `false`)
 *
 * @remarks
 * This type intentionally diverges from `WheelFilterState` in the color-wheel
 * module. Unifying them would be a cross-domain refactor — see the feature doc
 * for details.
 *
 * @property brandIds - Brand database IDs to filter by (OR within dimension).
 * @property paintTypes - `paint_type` strings to filter by (OR within dimension).
 *   Use {@link UNTYPED_PAINT_TYPE} to represent paints with `paint_type === null`.
 * @property productLineIds - Product-line IDs to filter by (OR within dimension).
 *   Only shown in UI when ≥1 brand is selected.
 * @property discontinued - Tri-state for `is_discontinued`:
 *   `'include'` (default, no constraint) | `'exclude'` (active only) | `'only'`.
 * @property metallicOnly - When `true`, only `is_metallic = true` paints are shown.
 */
export type PaintFilterState = {
  brandIds: number[]
  paintTypes: string[]
  productLineIds: number[]
  discontinued: 'include' | 'exclude' | 'only'
  metallicOnly: boolean
}

/** Neutral starting state for {@link PaintFilterState}. */
export const EMPTY_PAINT_FILTER_STATE: PaintFilterState = {
  brandIds: [],
  paintTypes: [],
  productLineIds: [],
  discontinued: 'include',
  metallicOnly: false,
}
