/**
 * A named, ordered group within a palette used to organise paints by model part
 * (e.g. "Basecoat", "Highlights", "Metallics").
 *
 * @remarks
 * Groups are ordered by `position` (0-based, normalised to 0..N-1 on every
 * reorder). Deleting a group sets `group_id = NULL` on all member
 * {@link PalettePaint} rows via `ON DELETE SET NULL` — paints are never removed.
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
}
