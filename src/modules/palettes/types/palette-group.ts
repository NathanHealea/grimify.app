import type { PaletteGroupPaint } from '@/modules/palettes/types/palette-group-paint'

/**
 * A named, ordered group within a palette used to organise paints by model part
 * (e.g. "Basecoat", "Highlights", "Metallics").
 *
 * @remarks
 * Groups are ordered by `position` (0-based, normalised to 0..N-1 on every
 * reorder). Deleting a group cascades to delete all of its {@link PaletteGroupPaint}
 * memberships; master-list {@link PalettePaint} rows are untouched.
 *
 * `paints` is the ordered list of membership rows for this group, sorted by
 * `position` ascending. Each membership references a master-list entry by
 * `palettePaintId`, so the same paint can belong to multiple groups simultaneously.
 */
export type PaletteGroup = {
  /** UUID primary key. */
  id: string
  /** UUID of the parent palette (FK to palettes). */
  paletteId: string
  /** Display name; 1–100 characters. */
  name: string
  /** 0-based sort index within the palette. */
  position: number
  /** ISO timestamp of creation. */
  createdAt: string
  /** Ordered membership rows for this group, sorted by `position` ascending. */
  paints: PaletteGroupPaint[]
}
