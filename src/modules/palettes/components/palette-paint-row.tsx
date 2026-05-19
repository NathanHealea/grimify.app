'use client'

import { useTransition } from 'react'
import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'
import { toast } from 'sonner'

import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'
import type { PaletteGroup } from '@/modules/palettes/types/palette-group'
import { removePalettePaint } from '@/modules/palettes/actions/remove-palette-paint'
import { removePaintFromGroup } from '@/modules/palettes/actions/remove-paint-from-group'
import { PaletteDragHandle } from '@/modules/palettes/components/palette-drag-handle'
import { PalettePaintGroupsToggle } from '@/modules/palettes/components/palette-paint-groups-toggle'
import { Button } from '@/components/ui/button'
import { PaletteSwapButton } from '@/modules/palettes/components/palette-swap-button'

/**
 * A single row in a palette's paint list, shared by the master-list section and
 * per-group membership sections.
 *
 * In `'master'` variant the row represents a master-list entry: it shows
 * group-membership toggle chips ({@link PalettePaintGroupsToggle}), the hue-swap
 * button, and a "Remove from palette" button that deletes the master-list entry
 * (cascading all group memberships). In `'group'` variant the row represents a
 * group-membership reference: it shows only a "Remove from group" button that
 * deletes the membership without touching the master list.
 *
 * In edit mode the row is sortable via dnd-kit; the drag handle is the sole
 * activator node. In read mode (`canEdit={false}`, `dndId` absent) DnD wiring
 * and edit controls are hidden.
 *
 * @param props.paletteId - UUID of the owning palette.
 * @param props.palettePaintId - Stable UUID of the master-list entry.
 * @param props.paint - Full paint data for display.
 * @param props.note - Per-slot painter note; shown in master variant only.
 * @param props.canEdit - When true, renders edit controls and the drag handle.
 * @param props.dndId - Mount-stable DnD id; required when `canEdit` is true.
 * @param props.variant - `'master'` for master-list rows; `'group'` for membership ref rows.
 * @param props.groups - Named palette groups; master variant only, used for toggle chips.
 * @param props.activeGroupIds - Group IDs the paint currently belongs to; master variant only.
 * @param props.groupId - UUID of the group; required for the `'group'` variant remove action.
 * @param props.onGroupToggle - Called after a successful group toggle with the toggled group id and its new active state; master variant only.
 */
export function PalettePaintRow({
  paletteId,
  palettePaintId,
  paint,
  note,
  canEdit,
  dndId,
  variant,
  groups,
  activeGroupIds,
  groupId,
  onGroupToggle,
}: {
  paletteId: string
  palettePaintId: string
  paint: ColorWheelPaint
  note: string | null
  canEdit: boolean
  dndId?: string
  variant: 'master' | 'group'
  groups?: PaletteGroup[]
  activeGroupIds?: string[]
  groupId?: string
  onGroupToggle?: (groupId: string, active: boolean) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: dndId ?? '', disabled: !canEdit || !dndId })

  const [isPending, startTransition] = useTransition()

  const brandLine = [paint.brand_name, paint.product_line_name].filter(Boolean).join(': ')

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  function handleRemove() {
    startTransition(async () => {
      if (variant === 'group' && groupId) {
        const result = await removePaintFromGroup(paletteId, groupId, palettePaintId)
        if (result?.error) {
          toast.error(result.error)
          return
        }
        toast.success(`Removed '${paint.name}' from group`)
      } else {
        const result = await removePalettePaint(paletteId, palettePaintId)
        if (result?.error) {
          toast.error(result.error)
          return
        }
        toast.success(`Removed '${paint.name}' from palette`)
      }
    })
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        'flex items-start gap-3 rounded-lg border border-border p-3',
        isDragging ? 'shadow-lg bg-muted' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {canEdit && dndId && (
        <PaletteDragHandle
          ref={setActivatorNodeRef}
          aria-label={`Reorder ${paint.name}`}
          {...attributes}
          {...listeners}
        />
      )}
      <div
        className="mt-0.5 size-8 shrink-0 rounded-sm"
        style={{ backgroundColor: paint.hex }}
        title={paint.hex}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{paint.name}</p>
        {brandLine && <p className="text-xs text-muted-foreground">{brandLine}</p>}
        {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
      </div>
      {canEdit && (
        <div className="flex items-center gap-1 flex-wrap justify-end">
          {variant === 'master' && groups && groups.length > 0 && activeGroupIds && (
            <PalettePaintGroupsToggle
              paletteId={paletteId}
              palettePaintId={palettePaintId}
              groups={groups}
              activeGroupIds={activeGroupIds}
              onToggle={onGroupToggle ?? (() => {})}
            />
          )}
          {variant === 'master' && (
            <PaletteSwapButton
              paletteId={paletteId}
              palettePaintId={palettePaintId}
              paint={paint}
            />
          )}
          <Button
            type="button"
            onClick={handleRemove}
            disabled={isPending}
            className="btn-sm btn-ghost text-destructive hover:text-destructive"
            aria-label={
              variant === 'group' ? `Remove ${paint.name} from group` : `Remove ${paint.name}`
            }
          >
            {isPending ? 'Removing…' : 'Remove'}
          </Button>
        </div>
      )}
    </div>
  )
}
