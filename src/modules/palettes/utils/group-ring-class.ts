import type { GroupDropState } from '@/modules/palettes/types/group-drop-state'

/**
 * Derives the Tailwind ring CSS class for a group container based on the
 * current drop feedback state.
 *
 * Returns an empty string when the given group has no active feedback.
 * Returns a colored `ring-2` class when the group is the current hover/success/error target:
 * - `'hover'` → blue primary ring
 * - `'success'` → green ring
 * - `'error'` → red ring
 *
 * @param groupId - The group id to check against `dropState`.
 * @param dropState - Current {@link GroupDropState} held in component state.
 * @returns A Tailwind CSS class string, or `""` when no feedback applies.
 */
export function getGroupRingClass(groupId: string, dropState: GroupDropState): string {
  if (dropState?.groupId !== groupId) return ''
  if (dropState.kind === 'error') return 'ring-2 ring-red-500'
  if (dropState.kind === 'success') return 'ring-2 ring-green-500'
  return 'ring-2 ring-primary'
}
