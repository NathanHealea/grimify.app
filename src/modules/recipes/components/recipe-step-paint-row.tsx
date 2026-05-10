'use client'

import { useState, useTransition } from 'react'
import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'
import { toast } from 'sonner'

import type { RecipeStepPaint } from '@/modules/recipes/types/recipe-step-paint'
import { removeRecipeStepPaint } from '@/modules/recipes/actions/remove-recipe-step-paint'
import { updateRecipeStepPaint } from '@/modules/recipes/actions/update-recipe-step-paint'
import { PaletteDragHandle } from '@/modules/palettes/components/palette-drag-handle'
import { formatStepPaintSource } from '@/modules/recipes/utils/format-step-paint-source'

/**
 * A single row in a recipe step's paint list.
 *
 * In edit mode the row is sortable via dnd-kit (drag handle is the sole
 * activator) and exposes ratio + note inputs that auto-save on blur via
 * {@link updateRecipeStepPaint}. The remove button calls
 * {@link removeRecipeStepPaint} inside a `useTransition`. Toasts surface
 * success or error from each action.
 *
 * In read mode (`canEdit={false}`, `dndId` absent), the row renders the
 * swatch, name, brand line, palette-source chip, ratio, and note as plain
 * text — no inputs, no drag handle.
 *
 * The "From palette" chip renders when {@link formatStepPaintSource} resolves
 * to `'palette'` so users can tell whether the paint came from the recipe's
 * linked palette or the full library.
 *
 * @param props.paint - The hydrated step paint row (must include `paint`).
 * @param props.canEdit - When true, renders inputs, drag handle, remove button.
 * @param props.dndId - Mount-stable DnD id assigned by `RecipeStepPaintList`; required when `canEdit` is true.
 */
export function RecipeStepPaintRow({
  paint,
  canEdit,
  dndId,
}: {
  paint: RecipeStepPaint
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

  const [isRemoving, startRemove] = useTransition()
  const [isSavingRatio, startSaveRatio] = useTransition()
  const [isSavingNote, startSaveNote] = useTransition()

  const [ratio, setRatio] = useState(paint.ratio ?? '')
  const [note, setNote] = useState(paint.note ?? '')
  const [trackedRatio, setTrackedRatio] = useState(paint.ratio ?? '')
  const [trackedNote, setTrackedNote] = useState(paint.note ?? '')

  // Re-seed local input state when the server sends fresh paint values.
  // Setting state during render when an external prop has changed avoids the
  // effect-only state mirror anti-pattern.
  const incomingRatio = paint.ratio ?? ''
  if (incomingRatio !== trackedRatio) {
    setTrackedRatio(incomingRatio)
    setRatio(incomingRatio)
  }
  const incomingNote = paint.note ?? ''
  if (incomingNote !== trackedNote) {
    setTrackedNote(incomingNote)
    setNote(incomingNote)
  }

  const data = paint.paint
  const brandLine = data
    ? [data.brand_name, data.product_line_name].filter(Boolean).join(': ')
    : ''
  const source = formatStepPaintSource(paint.paletteSlotId)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  function handleRemove() {
    startRemove(async () => {
      const result = await removeRecipeStepPaint(paint.id)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success(`Removed '${data?.name ?? 'paint'}' from step`)
    })
  }

  function commitRatio(next: string) {
    const trimmed = next.trim()
    const previous = paint.ratio ?? ''
    if (trimmed === previous.trim()) return
    startSaveRatio(async () => {
      const result = await updateRecipeStepPaint(paint.id, {
        ratio: trimmed === '' ? null : trimmed,
      })
      if (result?.error) {
        toast.error(result.error)
        setRatio(previous)
      }
    })
  }

  function commitNote(next: string) {
    const trimmed = next.trim()
    const previous = paint.note ?? ''
    if (trimmed === previous.trim()) return
    startSaveNote(async () => {
      const result = await updateRecipeStepPaint(paint.id, {
        note: trimmed === '' ? null : trimmed,
      })
      if (result?.error) {
        toast.error(result.error)
        setNote(previous)
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
          aria-label={`Reorder ${data?.name ?? 'paint'}`}
          {...attributes}
          {...listeners}
        />
      )}
      {data ? (
        <div
          className="mt-0.5 size-6 shrink-0 rounded-sm"
          style={{ backgroundColor: data.hex }}
          title={data.hex}
        />
      ) : (
        <div className="mt-0.5 size-6 shrink-0 rounded-sm border border-dashed border-border" />
      )}
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">
              {data?.name ?? 'Paint unavailable'}
            </p>
            {source === 'palette' && (
              <span className="badge badge-xs badge-secondary">From palette</span>
            )}
          </div>
          {brandLine && (
            <p className="text-xs text-muted-foreground">{brandLine}</p>
          )}
        </div>
        {canEdit ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-muted-foreground">Ratio</span>
              <input
                type="text"
                value={ratio}
                onChange={(e) => setRatio(e.target.value)}
                onBlur={(e) => commitRatio(e.target.value)}
                maxLength={200}
                disabled={isSavingRatio}
                placeholder="e.g. 50/50 with Lahmian Medium"
                className="input input-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-muted-foreground">Note</span>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onBlur={(e) => commitNote(e.target.value)}
                maxLength={500}
                disabled={isSavingNote}
                placeholder="Optional note"
                className="input input-sm"
              />
            </label>
          </div>
        ) : (
          (paint.ratio || paint.note) && (
            <div className="space-y-0.5 text-xs">
              {paint.ratio && (
                <p>
                  <span className="text-muted-foreground">Ratio: </span>
                  {paint.ratio}
                </p>
              )}
              {paint.note && (
                <p>
                  <span className="text-muted-foreground">Note: </span>
                  {paint.note}
                </p>
              )}
            </div>
          )
        )}
      </div>
      {canEdit && (
        <button
          type="button"
          onClick={handleRemove}
          disabled={isRemoving}
          className="btn btn-sm btn-ghost text-destructive hover:text-destructive"
          aria-label={`Remove ${data?.name ?? 'paint'}`}
        >
          {isRemoving ? 'Removing…' : 'Remove'}
        </button>
      )}
    </div>
  )
}
