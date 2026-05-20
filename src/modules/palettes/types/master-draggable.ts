import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'

/**
 * A single master-list slot augmented with a mount-stable DnD id.
 *
 * Created by {@link seedMaster} and stored in the `master` state array of
 * `PaletteGroupedPaintList`. The `dndId` is a UUID generated at seed time and
 * used as the dnd-kit item identifier; it is not persisted to the database.
 */
export type MasterDraggable = {
  /** Mount-stable UUID used as the dnd-kit item id. */
  dndId: string
  /** Stable database UUID of the master-list entry (`palette_paints.id`). */
  palettePaintId: string
  /** UUID of the underlying paint record. */
  paintId: string
  /** Per-slot painter note, or null when not set. */
  note: string | null
  /** ISO timestamp string when the paint was added to the palette. */
  addedAt: string
  /** Full paint data for rendering; undefined when the paint record is missing. */
  paint: ColorWheelPaint | undefined
}
