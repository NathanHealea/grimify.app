'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'

import type { PaletteGroup } from '@/modules/palettes/types/palette-group'
import { assignPaintToGroup } from '@/modules/palettes/actions/assign-paint-to-group'

/**
 * Per-row group selector rendered inside a palette paint row in edit mode.
 *
 * Renders a `<select>` with an "Ungrouped" option and one option per group.
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

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value
    const groupId = value === '' ? null : value

    startTransition(async () => {
      const result = await assignPaintToGroup(paletteId, position, groupId)
      if (result?.error) {
        toast.error(result.error)
      }
    })
  }

  return (
    <select
      value={currentGroupId ?? ''}
      onChange={handleChange}
      disabled={isPending}
      className="select select-sm"
      aria-label="Assign to group"
    >
      <option value="">Ungrouped</option>
      {groups.map((g) => (
        <option key={g.id} value={g.id}>
          {g.name}
        </option>
      ))}
    </select>
  )
}
