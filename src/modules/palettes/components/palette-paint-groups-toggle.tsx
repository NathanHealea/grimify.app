'use client'

import { useOptimistic, useTransition } from 'react'
import { toast } from 'sonner'

import type { PaletteGroup } from '@/modules/palettes/types/palette-group'
import { addPaintToGroup } from '@/modules/palettes/actions/add-paint-to-group'
import { removePaintFromGroup } from '@/modules/palettes/actions/remove-paint-from-group'

/**
 * Chip multi-toggle for managing a master-list paint's group memberships.
 *
 * Each chip represents one named group. An active (filled) chip means the paint
 * is currently a member of that group; clicking it removes the membership via
 * {@link removePaintFromGroup}. An inactive chip adds the paint to the group via
 * {@link addPaintToGroup}. Membership changes are optimistic and roll back on
 * server error via a Sonner toast.
 *
 * Renders nothing when `groups` is empty.
 *
 * @param props.paletteId - UUID of the owning palette.
 * @param props.palettePaintId - Stable UUID of the master-list entry to toggle.
 * @param props.groups - All named groups for this palette.
 * @param props.activeGroupIds - Group IDs the paint currently belongs to.
 */
export function PalettePaintGroupsToggle({
  paletteId,
  palettePaintId,
  groups,
  activeGroupIds,
}: {
  paletteId: string
  palettePaintId: string
  groups: PaletteGroup[]
  activeGroupIds: string[]
}) {
  const [optimisticIds, setOptimisticIds] = useOptimistic(
    new Set(activeGroupIds),
    (state: Set<string>, update: { groupId: string; active: boolean }) => {
      const next = new Set(state)
      if (update.active) next.add(update.groupId)
      else next.delete(update.groupId)
      return next
    },
  )
  const [, startTransition] = useTransition()

  if (groups.length === 0) return null

  function handleToggle(groupId: string) {
    const nowActive = !optimisticIds.has(groupId)
    startTransition(async () => {
      setOptimisticIds({ groupId, active: nowActive })
      const result = nowActive
        ? await addPaintToGroup(paletteId, groupId, palettePaintId)
        : await removePaintFromGroup(paletteId, groupId, palettePaintId)
      if (result?.error) toast.error(result.error)
    })
  }

  return (
    <div className="flex flex-wrap gap-1">
      {groups.map((g) => (
        <button
          key={g.id}
          type="button"
          onClick={() => handleToggle(g.id)}
          className={[
            'btn btn-xs',
            optimisticIds.has(g.id) ? 'btn-primary' : 'btn-ghost border border-border',
          ].join(' ')}
          aria-pressed={optimisticIds.has(g.id)}
          title={optimisticIds.has(g.id) ? `Remove from ${g.name}` : `Add to ${g.name}`}
        >
          {g.name}
        </button>
      ))}
    </div>
  )
}
