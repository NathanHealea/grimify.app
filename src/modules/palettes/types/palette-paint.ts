import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'

/**
 * A single slot in a palette — one position in an ordered paint list.
 *
 * @remarks
 * `position` is the 0-based index within the palette and forms the second
 * half of the composite primary key `(palette_id, position)`. The same
 * `paintId` may appear at multiple positions (e.g. a recipe that uses the
 * same shade at two layering steps).
 *
 * `paint` is the embedded {@link ColorWheelPaint} loaded by `getPaletteById`.
 * It is absent on lightweight list rows (e.g. summary swatches).
 */
export type PalettePaint = {
  /** 0-based slot index within the palette. */
  position: number
  /** UUID of the referenced paint. */
  paintId: string
  /** Per-slot painter note; `null` when not set. */
  note: string | null
  /** ISO timestamp when this paint was added to the palette. */
  addedAt: string
  /** UUID of the group this paint belongs to; `null` when ungrouped. */
  groupId: string | null
  /** Full paint data, present when loaded via `getPaletteById`. */
  paint?: ColorWheelPaint
}
