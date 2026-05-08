import type { PaletteGroup } from '@/modules/palettes/types/palette-group'
import type { PalettePaint } from '@/modules/palettes/types/palette-paint'

/**
 * A fully hydrated palette including its ordered paint slots.
 *
 * Returned by `getPaletteById`. Each slot in `paints` has its embedded
 * {@link PalettePaint.paint} populated and the array is sorted by `position`
 * ascending.
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
  /** Ordered paint slots, sorted by `position` ascending. */
  paints: PalettePaint[]
}
