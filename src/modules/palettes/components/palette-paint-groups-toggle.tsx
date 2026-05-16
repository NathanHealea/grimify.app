'use client'

import { useOptimistic, useTransition } from 'react'
import { ChevronDown } from 'lucide-react'
import { toast } from 'sonner'

import type { PaletteGroup } from '@/modules/palettes/types/palette-group'
import { addPaintToGroup } from '@/modules/palettes/actions/add-paint-to-group'
import { removePaintFromGroup } from '@/modules/palettes/actions/remove-paint-from-group'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/**
 * Dropdown multi-toggle for managing a master-list paint's group memberships.
 *
 * Opens a menu listing all named groups; each row shows a checkbox reflecting
 * current membership. Checking an unchecked row adds the paint to that group
 * via {@link addPaintToGroup} and fires a success toast. Unchecking removes it
 * via {@link removePaintFromGroup}. Membership changes are optimistic and roll
 * back on server error via a Sonner toast.
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

  function handleToggle(groupId: string, groupName: string) {
    const nowActive = !optimisticIds.has(groupId)
    startTransition(async () => {
      setOptimisticIds({ groupId, active: nowActive })
      const result = nowActive
        ? await addPaintToGroup(paletteId, groupId, palettePaintId)
        : await removePaintFromGroup(paletteId, groupId, palettePaintId)
      if (result?.error) toast.error(result.error)
      else if (nowActive) toast.success(`Added to ${groupName}`)
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="btn btn-xs btn-outline flex items-center gap-1">
          Groups
          <ChevronDown className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {groups.map((g) => (
          <DropdownMenuCheckboxItem
            key={g.id}
            checked={optimisticIds.has(g.id)}
            onCheckedChange={() => handleToggle(g.id, g.name)}
          >
            {g.name}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
