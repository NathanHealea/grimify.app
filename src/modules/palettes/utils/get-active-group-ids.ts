import type { GroupRefDraggable } from '@/modules/palettes/types/group-ref-draggable'

/**
 * Returns the ids of all groups that currently contain the given master-list paint.
 *
 * Traverses the `groupRefs` Map and collects every group whose ref list includes
 * a ref with the matching `palettePaintId`. Used to derive which toggle chips are
 * active for a given master-list row.
 *
 * @param palettePaintId - The `palette_paints.id` to look up.
 * @param groupRefs - Current Map from group id to group-membership ref items.
 * @returns An array of group ids (may be empty if the paint belongs to no groups).
 */
export function getActiveGroupIds(
  palettePaintId: string,
  groupRefs: Map<string, GroupRefDraggable[]>,
): string[] {
  const active: string[] = []
  for (const [groupId, refs] of groupRefs) {
    if (refs.some((r) => r.palettePaintId === palettePaintId)) active.push(groupId)
  }
  return active
}
