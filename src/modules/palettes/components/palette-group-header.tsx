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
import { PaletteGroupDeleteDialog } from '@/modules/palettes/components/palette-group-delete-dialog'

/**
 * A draggable section-divider header for one palette group.
 *
 * In edit mode the header includes a drag handle (via `useSortable`), an inline
 * text input that auto-saves on blur via {@link updatePaletteGroup}, and a
 * delete button that opens {@link PaletteGroupDeleteDialog}.
 *
 * In read mode (`canEdit={false}`) a plain `<h3>` is rendered.
 *
 * @param props.paletteId - UUID of the parent palette.
 * @param props.group - The group being displayed.
 * @param props.canEdit - When true, enables drag handle, rename input, and delete button.
 * @param props.dndId - Mount-stable DnD id; required for draggability in edit mode.
 */
export function PaletteGroupHeader({
  paletteId,
  group,
  canEdit,
  dndId,
}: {
  paletteId: string
  group: PaletteGroup
  canEdit: boolean
  dndId?: string
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
      if (result?.error) {
        setNameValue(savedNameRef.current)
        toast.error(result.error)
      } else {
        savedNameRef.current = trimmed
      }
    })
  }

  if (!canEdit) {
    return (
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mt-2 mb-1 px-1">
        {group.name}
      </h3>
    )
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={[
          'flex items-center gap-2 rounded-md border border-dashed border-border px-2 py-1',
          isDragging ? 'shadow-lg bg-muted opacity-80' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {dndId && (
          <PaletteDragHandle
            ref={setActivatorNodeRef}
            aria-label={`Reorder group ${group.name}`}
            {...attributes}
            {...listeners}
          />
        )}
        <input
          type="text"
          value={nameValue}
          onChange={(e) => setNameValue(e.target.value)}
          onBlur={handleBlur}
          maxLength={100}
          className="input input-sm flex-1 bg-transparent border-0 shadow-none focus:ring-0 font-semibold text-sm"
          aria-label="Group name"
        />
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="btn btn-ghost btn-xs text-muted-foreground hover:text-destructive"
          aria-label={`Delete group ${group.name}`}
        >
          <Trash2 className="size-3.5" aria-hidden />
        </button>
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
