import type { PalettePaint } from '@/modules/palettes/types/palette-paint'
import type { PaletteGroup } from '@/modules/palettes/types/palette-group'
import type { MasterDraggable } from '@/modules/palettes/types/master-draggable'
import type { GroupRefDraggable } from '@/modules/palettes/types/group-ref-draggable'
import type { DraggableGroup } from '@/modules/palettes/types/draggable-group'

/**
 * Transforms a master-list paint array into mount-stable DnD items.
 *
 * Assigns a fresh `crypto.randomUUID()` as `dndId` for each slot. Call this
 * once at component mount and on every server-driven paints update; do not
 * call it inside drag handlers (UUIDs changing mid-drag breaks dnd-kit state).
 *
 * @param paints - Ordered master-list slots from the server.
 * @returns An array of {@link MasterDraggable} items ready for `SortableContext`.
 */
export function seedMaster(paints: PalettePaint[]): MasterDraggable[] {
  return paints.map((p) => ({
    dndId: crypto.randomUUID(),
    palettePaintId: p.id,
    paintId: p.paintId,
    note: p.note,
    addedAt: p.addedAt,
    paint: p.paint,
  }))
}

/**
 * Transforms a palette groups array into a Map of mount-stable DnD membership refs.
 *
 * Each group gets an array of {@link GroupRefDraggable} items; the Map is keyed
 * by `group.id`. Call this once at mount and on every server-driven groups update.
 *
 * @param groups - Named palette groups sorted by `position` ascending.
 * @returns A Map from group id to an array of {@link GroupRefDraggable} items.
 */
export function seedGroupRefs(groups: PaletteGroup[]): Map<string, GroupRefDraggable[]> {
  const map = new Map<string, GroupRefDraggable[]>()
  for (const g of groups) {
    map.set(
      g.id,
      g.paints.map((gp) => ({
        dndId: crypto.randomUUID(),
        groupMembershipId: gp.id,
        palettePaintId: gp.palettePaintId,
        paint: gp.palettePaint?.paint,
      })),
    )
  }
  return map
}

/**
 * Transforms a palette groups array into mount-stable DnD group items.
 *
 * Used by the group-reorder `SortableContext`. Call this once at mount and on
 * every server-driven groups update.
 *
 * @param groups - Named palette groups sorted by `position` ascending.
 * @returns An array of {@link DraggableGroup} items ready for `SortableContext`.
 */
export function seedGroups(groups: PaletteGroup[]): DraggableGroup[] {
  return groups.map((g) => ({ dndId: crypto.randomUUID(), group: g }))
}
