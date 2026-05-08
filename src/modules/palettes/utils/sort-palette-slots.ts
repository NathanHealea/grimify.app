import { sortPaintsBy } from '@/modules/paints/utils/sort-paints'
import type { PaintSortDirection, PaintSortField, SortablePaint } from '@/modules/paints/utils/sort-paints'

/**
 * Minimal shape required to sort palette slot-like objects.
 *
 * `groupId` is optional: slots without it are treated as ungrouped (flat list).
 * When any slot carries a `groupId`, per-group sorting is activated.
 */
type SlotWithGroup = {
  paint?: SortablePaint
  groupId?: string | null
}

/**
 * Sort palette slots by a paint field, with optional per-group partitioning.
 *
 * - If **no slot** has a `groupId` property defined, sorts the flat list via
 *   {@link sortPaintsBy} and returns.
 * - If any slot has `groupId` defined: partitions by `groupId` (preserving
 *   first-seen group order), sorts each partition independently, then
 *   concatenates. Slots with `groupId === null` are sorted as their own
 *   "ungrouped" partition.
 *
 * Slots whose `paint` is `undefined` sort last within their partition.
 *
 * @param slots - Array of palette slots to sort.
 * @param field - The {@link PaintSortField} to sort by.
 * @param direction - `'asc'` or `'desc'`.
 * @returns A new sorted array; `slots` is not mutated.
 */
export function sortPaletteSlots<T extends SlotWithGroup>(
  slots: T[],
  field: PaintSortField,
  direction: PaintSortDirection,
): T[] {
  const hasGroups = slots.some((s) => 'groupId' in s)

  if (!hasGroups) {
    return sortPaintsBy(slots, (s) => s.paint, field, direction)
  }

  // Partition by groupId, preserving first-seen group order
  const groupOrder: Array<string | null> = []
  const partitions = new Map<string | null, T[]>()

  for (const slot of slots) {
    const gid = (slot as { groupId?: string | null }).groupId ?? null
    if (!partitions.has(gid)) {
      groupOrder.push(gid)
      partitions.set(gid, [])
    }
    partitions.get(gid)!.push(slot)
  }

  const sorted: T[] = []
  for (const gid of groupOrder) {
    const partition = partitions.get(gid)!
    sorted.push(...sortPaintsBy(partition, (s) => s.paint, field, direction))
  }

  return sorted
}
