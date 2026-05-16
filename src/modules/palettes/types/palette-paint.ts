import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'

/**
 * A single entry in a palette's master list — one unique paint in the palette.
 *
 * @remarks
 * `id` is the stable UUID primary key introduced in the master-list/group-membership
 * split. `position` is the 0-based sort index within the palette's master list.
 *
 * Group membership is no longer stored here; see {@link PaletteGroupPaint} for the
 * join-table rows that reference master entries from named groups.
 *
 * `paint` is the embedded {@link ColorWheelPaint} loaded by `getPaletteById`.
 * It is absent on lightweight list rows (e.g. summary swatches).
 */
export type PalettePaint = {
  /** Stable UUID primary key for this master-list entry. */
  id: string
  /** 0-based sort index within the palette master list. */
  position: number
  /** UUID of the referenced paint. */
  paintId: string
  /** Per-slot painter note; `null` when not set. */
  note: string | null
  /** ISO timestamp when this paint was added to the palette. */
  addedAt: string
  /** Full paint data, present when loaded via `getPaletteById`. */
  paint?: ColorWheelPaint
}
