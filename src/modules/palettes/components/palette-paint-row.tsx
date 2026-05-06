'use client'

import { useTransition } from 'react'
import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'
import { toast } from 'sonner'

import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'
import { removePalettePaint } from '@/modules/palettes/actions/remove-palette-paint'
import { PaletteDragHandle } from '@/modules/palettes/components/palette-drag-handle'
import { PaletteSwapButton } from '@/modules/palettes/components/palette-swap-button'

/**
 * A single row in a palette's paint list.
 *
 * In edit mode, the row is sortable via dnd-kit: the drag handle is the
 * sole activator node so clicks on the row's other elements (remove button)
 * remain usable. `isDragging` applies a lifted visual state. Removing the
 * slot is handled via a `useTransition`-wrapped click that calls
 * {@link removePalettePaint} directly and surfaces success/error through
 * Sonner toasts.
 *
 * In read mode (`canEdit={false}`, `dndId` absent), the row renders without
 * any DnD wiring or handle.
 *
 * @param props.paletteId - UUID of the owning palette.
 * @param props.position - 0-based slot index; passed to {@link removePalettePaint}.
 * @param props.paint - Full paint data for display.
 * @param props.note - Optional per-slot painter note.
 * @param props.canEdit - When true, renders the remove button and drag handle.
 * @param props.dndId - Mount-stable DnD id assigned by `PalettePaintList`; required when `canEdit` is true.
 */
export function PalettePaintRow({
  paletteId,
  position,
  paint,
  note,
  canEdit,
  dndId,
}: {
  paletteId: string
  position: number
  paint: ColorWheelPaint
  note: string | null
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

  const [isPending, startTransition] = useTransition()

  const brandLine = [paint.brand_name, paint.product_line_name].filter(Boolean).join(': ')

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  function handleRemove() {
    startTransition(async () => {
      const result = await removePalettePaint(paletteId, position)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success(`Removed '${paint.name}' from palette`)
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
        {brandLine && (
          <p className="text-xs text-muted-foreground">{brandLine}</p>
        )}
        {note && (
          <p className="mt-1 text-xs text-muted-foreground">{note}</p>
        )}
      </div>
      {canEdit && (
        <div className="flex items-center gap-1">
          <PaletteSwapButton paletteId={paletteId} position={position} paint={paint} />
          <button
            type="button"
            onClick={handleRemove}
            disabled={isPending}
            className="btn btn-sm btn-ghost text-destructive hover:text-destructive"
            aria-label={`Remove ${paint.name}`}
          >
            {isPending ? 'Removing…' : 'Remove'}
          </button>
        </div>
      )}
    </div>
  )
}
