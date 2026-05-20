import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'

/**
 * A single group-membership reference augmented with a mount-stable DnD id.
 *
 * Created by {@link seedGroupRefs} and stored in the `groupRefs` state Map of
 * `PaletteGroupedPaintList`. One `GroupRefDraggable` exists per
 * `palette_group_paints` row; multiple refs can point to the same
 * `palettePaintId` across different groups.
 */
export type GroupRefDraggable = {
  /** Mount-stable UUID used as the dnd-kit item id. */
  dndId: string
  /** Stable database UUID of the group-membership row (`palette_group_paints.id`). */
  groupMembershipId: string
  /** UUID of the master-list entry this ref points to (`palette_paints.id`). */
  palettePaintId: string
  /** Full paint data for rendering; undefined when the paint record is missing. */
  paint: ColorWheelPaint | undefined
}
