import type { DraggableGroup } from '@/modules/palettes/types/draggable-group'
import type { GroupRefDraggable } from '@/modules/palettes/types/group-ref-draggable'

/**
 * Resolves a palette group id from a dnd-kit `over.id` string.
 *
 * An `over.id` may be either a group-header `DraggableGroup.dndId` or a
 * group-membership `GroupRefDraggable.dndId`. This function checks both
 * collections and returns the parent group id, or `null` if the id belongs to
 * neither (e.g., a master-list slot).
 *
 * @param dndId - The dnd-kit `over.id` to resolve.
 * @param draggableGroups - Current array of draggable group items.
 * @param groupRefs - Current Map from group id to group-membership ref items.
 * @returns The matching group id, or `null` when not found.
 */
export function resolveTargetGroupId(
  dndId: string,
  draggableGroups: DraggableGroup[],
  groupRefs: Map<string, GroupRefDraggable[]>,
): string | null {
  const headerMatch = draggableGroups.find((dg) => dg.dndId === dndId)
  if (headerMatch) return headerMatch.group.id
  for (const [groupId, refs] of groupRefs) {
    if (refs.some((r) => r.dndId === dndId)) return groupId
  }
  return null
}
