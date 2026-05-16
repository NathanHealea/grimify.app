import type { PalettePaint } from '@/modules/palettes/types/palette-paint'

/**
 * A reference from a palette group to one of its palette's master-list entries.
 *
 * @remarks
 * The same {@link palettePaintId} may appear in many groups simultaneously —
 * memberships are independent across groups. Within a single group, each paint
 * appears at most once (enforced by the `palette_group_paints_unique_membership`
 * constraint).
 *
 * `palettePaint` is the hydrated master entry, present when loaded via
 * `getPaletteById`. Use it to read the paint's display data.
 */
export type PaletteGroupPaint = {
  /** Stable UUID primary key for this membership row. */
  id: string
  /** UUID of the parent group (FK to palette_groups). */
  groupId: string
  /** UUID of the referenced master-list entry (FK to palette_paints). */
  palettePaintId: string
  /** 0-based sort index within the group. */
  position: number
  /** ISO timestamp when this membership was created. */
  addedAt: string
  /** Hydrated master entry; present when loaded via `getPaletteById`. */
  palettePaint?: PalettePaint
}
