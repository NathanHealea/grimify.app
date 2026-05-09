'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'

import type { PaletteGroup } from '@/modules/palettes/types/palette-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { assignPaintToGroup } from '@/modules/palettes/actions/assign-paint-to-group'

const UNGROUPED_VALUE = '__ungrouped__'

/**
 * Per-row group selector rendered inside a palette paint row in edit mode.
 *
 * Renders a Radix select with an "Ungrouped" option and one option per group.
 * On change, calls {@link assignPaintToGroup} inside `useTransition` and
 * surfaces any failure via a Sonner toast.
 *
 * @param props.paletteId - UUID of the owning palette.
 * @param props.position - 0-based slot index of the paint.
 * @param props.currentGroupId - The group the paint currently belongs to; `null` for ungrouped.
 * @param props.groups - All named groups for this palette.
 */
export function PalettePaintGroupSelect({
  paletteId,
  position,
  currentGroupId,
  groups,
}: {
  paletteId: string
  position: number
  currentGroupId: string | null
  groups: PaletteGroup[]
}) {
  const [isPending, startTransition] = useTransition()

  const currentLabel = currentGroupId
    ? (groups.find((g) => g.id === currentGroupId)?.name ?? 'Ungrouped')
    : 'Ungrouped'

  function handleChange(value: string) {
    const groupId = value === UNGROUPED_VALUE ? null : value

    startTransition(async () => {
      const result = await assignPaintToGroup(paletteId, position, groupId)
      if (result?.error) {
        toast.error(result.error)
      }
    })
  }

  return (
    <Select
      value={currentGroupId ?? UNGROUPED_VALUE}
      onValueChange={handleChange}
      disabled={isPending}
    >
      <SelectTrigger className="select-trigger-sm" aria-label="Assign to group">
        <SelectValue>{currentLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNGROUPED_VALUE}>Ungrouped</SelectItem>
        {groups.map((g) => (
          <SelectItem key={g.id} value={g.id}>
            {g.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
