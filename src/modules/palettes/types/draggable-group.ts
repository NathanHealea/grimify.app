import type { PaletteGroup } from '@/modules/palettes/types/palette-group'

/**
 * A palette group augmented with a mount-stable DnD id.
 *
 * Created by {@link seedGroups} and stored in the `draggableGroups` state array
 * of `PaletteGroupedPaintList`. The `dndId` is used as the dnd-kit item
 * identifier for group-header drag-to-reorder; it is not persisted.
 */
export type DraggableGroup = {
  /** Mount-stable UUID used as the dnd-kit item id for group reordering. */
  dndId: string
  /** The underlying palette group data. */
  group: PaletteGroup
}
