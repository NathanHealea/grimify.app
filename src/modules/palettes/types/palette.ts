import type { PaletteGroup } from '@/modules/palettes/types/palette-group'
import type { PalettePaint } from '@/modules/palettes/types/palette-paint'

/**
 * A fully hydrated palette including its master paint list and named groups.
 *
 * @remarks
 * Returned by `getPaletteById`. The two collections represent separate concerns:
 *
 * - `paints` — the **master list**: every unique paint added to this palette,
 *   sorted by `position` ascending. Each entry has its {@link PalettePaint.paint}
 *   embedded.
 * - `groups` — the **named groups**: ordered group sections, each carrying its own
 *   `paints` array of {@link PaletteGroupPaint} membership rows. A paint from the
 *   master list may appear in zero, one, or many groups simultaneously.
 */
export type Palette = {
  /** UUID primary key. */
  id: string
  /** UUID of the owning user (FK to profiles). */
  userId: string
  /** Display name; 1–80 characters. */
  name: string
  /** Optional description; `null` when not set. Max 1000 characters. */
  description: string | null
  /** Whether the palette is publicly visible. Defaults to `false`. */
  isPublic: boolean
  /** ISO timestamp of creation. */
  createdAt: string
  /** ISO timestamp of last update; maintained by the `set_updated_at` trigger. */
  updatedAt: string
  /** Named groups ordered by `position` ascending; empty array for ungrouped palettes. */
  groups: PaletteGroup[]
  /** Master paint list, sorted by `position` ascending. */
  paints: PalettePaint[]
}
