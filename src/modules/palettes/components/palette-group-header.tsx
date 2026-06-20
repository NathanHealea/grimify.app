'use client'

import { useRef, useState, useTransition } from 'react'
import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'

import type { PaletteGroup } from '@/modules/palettes/types/palette-group'
import { updatePaletteGroup } from '@/modules/palettes/actions/update-palette-group'
import { validateGroupName } from '@/modules/palettes/validation'
import { PaletteDragHandle } from '@/modules/palettes/components/palette-drag-handle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PaletteGroupDeleteDialog } from '@/modules/palettes/components/palette-group-delete-dialog'

/**
 * A draggable section-divider header for one palette group.
 *
 * In edit mode the header includes a drag handle (via `useSortable`), an inline
 * text input that auto-saves on blur via {@link updatePaletteGroup}, and a
 * delete button that opens {@link PaletteGroupDeleteDialog}.
 *
 * When the group is being dragged (`isDragging` is true from `useSortable`), the
 * header renders a minimal outlined placeholder — the group name as muted text and
 * a paint-count badge — to mark the "hole" in the list while the ghost is shown
 * via `DragOverlay`.
 *
 * In read mode (`canEdit={false}`) a plain `<h3>` is rendered.
 *
 * @param props.paletteId - UUID of the parent palette.
 * @param props.group - The group being displayed.
 * @param props.canEdit - When true, enables drag handle, rename input, and delete button.
 * @param props.dndId - Mount-stable DnD id; required for draggability in edit mode.
 * @param props.paintCount - Number of paints in the group; shown in the drag placeholder badge.
 */
export function PaletteGroupHeader({
  paletteId,
  group,
  canEdit,
  dndId,
  paintCount = 0,
}: {
  paletteId: string
  group: PaletteGroup
  canEdit: boolean
  dndId?: string
  paintCount?: number
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

  const [nameValue, setNameValue] = useState(group.name)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [, startTransition] = useTransition()

  const savedNameRef = useRef(group.name)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  function handleBlur() {
    const trimmed = nameValue.trim()
    if (trimmed === savedNameRef.current) return

    const validationError = validateGroupName(trimmed)
    if (validationError) {
      setNameValue(savedNameRef.current)
      toast.error(validationError)
      return
    }

    startTransition(async () => {
      const result = await updatePaletteGroup(paletteId, group.id, trimmed)
      if (!result.ok) {
        setNameValue(savedNameRef.current)
        toast.error(result.error)
      } else {
        savedNameRef.current = trimmed
      }
    })
  }

  if (!canEdit) {
    return (
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-2 mb-1 px-1">
        {group.name}
      </h3>
    )
  }

  // While dragging render a minimal outlined placeholder — the full content is
  // shown in the DragOverlay instead.
  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-center gap-2 rounded-md border border-dashed border-border px-2 py-1 opacity-50"
      >
        <span className="flex-1 text-sm font-semibold text-muted-foreground">{group.name}</span>
        <span className="rounded px-1.5 py-0.5 text-xs text-muted-foreground bg-muted">
          {paintCount} {paintCount === 1 ? 'paint' : 'paints'}
        </span>
      </div>
    )
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-center gap-2 rounded-md border border-dashed border-border px-2 py-1"
      >
        {dndId && (
          <PaletteDragHandle
            ref={setActivatorNodeRef}
            aria-label={`Reorder group ${group.name}`}
            {...attributes}
            {...listeners}
          />
        )}
        <Input
          type="text"
          value={nameValue}
          onChange={(e) => setNameValue(e.target.value)}
          onBlur={handleBlur}
          maxLength={100}
          className="input-sm flex-1 bg-transparent border-0 shadow-none focus:ring-0 font-semibold text-sm"
          aria-label="Group name"
        />
        <Button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="btn-ghost btn-xs text-muted-foreground hover:text-destructive"
          aria-label={`Delete group ${group.name}`}
        >
          <Trash2 className="size-3.5" aria-hidden />
        </Button>
      </div>

      <PaletteGroupDeleteDialog
        paletteId={paletteId}
        group={group}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  )
}
