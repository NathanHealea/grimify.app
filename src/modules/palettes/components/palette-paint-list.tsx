'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { toast } from 'sonner'

import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'
import type { PalettePaint } from '@/modules/palettes/types/palette-paint'
import { reorderPalettePaints } from '@/modules/palettes/actions/reorder-palette-paints'
import { PalettePaintRow } from '@/modules/palettes/components/palette-paint-row'
import { reorderArray } from '@/modules/palettes/utils/reorder-array'

/**
 * A single slot with a mount-stable synthetic DnD id.
 *
 * `dndId` is assigned once at component mount and never reused, so duplicate
 * paintIds can coexist and optimistic updates never collide keys.
 */
type DraggableSlot = {
  dndId: string
  paintId: string
  note: string | null
  paint: ColorWheelPaint | undefined
  addedAt: string
}

function seedSlots(paints: PalettePaint[]): DraggableSlot[] {
  return paints.map((slot) => ({
    dndId: crypto.randomUUID(),
    paintId: slot.paintId,
    note: slot.note,
    paint: slot.paint,
    addedAt: slot.addedAt,
  }))
}

/**
 * Vertical list of paint rows for a palette.
 *
 * In edit mode (`canEdit={true}`) the list wraps rows in a dnd-kit
 * `DndContext` so users can drag to reorder. Order is persisted optimistically
 * via {@link reorderPalettePaints}; on failure the list rolls back and surfaces
 * the error via a Sonner toast. In read mode the list renders a plain ordered
 * `<div>`.
 *
 * Public props are unchanged from the original server component so callers
 * (`PaletteDetail`, `PaletteBuilder`) need no updates.
 *
 * @param props.paletteId - UUID of the owning palette.
 * @param props.paints - Ordered array of paint slots from the server.
 * @param props.canEdit - When true, enables drag-to-reorder and row remove buttons.
 */
export function PalettePaintList({
  paletteId,
  paints,
  canEdit,
}: {
  paletteId: string
  paints: PalettePaint[]
  canEdit: boolean
}) {
  const [slots, setSlots] = useState<DraggableSlot[]>(() => seedSlots(paints))
  const [, startTransition] = useTransition()

  // Tracks the last successfully persisted order so rapid drags can roll back
  // to a stable snapshot rather than to a stale intermediate state.
  const latestConfirmedRef = useRef<DraggableSlot[]>(slots)

  // Re-seed when the server sends a fresh paints array (after revalidation).
  useEffect(() => {
    setSlots(seedSlots(paints))
  }, [paints])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const fromIndex = slots.findIndex((s) => s.dndId === active.id)
    const toIndex = slots.findIndex((s) => s.dndId === over.id)
    if (fromIndex === -1 || toIndex === -1) return

    const previousSlots = latestConfirmedRef.current
    const newSlots = reorderArray(slots, fromIndex, toIndex)
    setSlots(newSlots)

    startTransition(async () => {
      const result = await reorderPalettePaints(
        paletteId,
        newSlots.map((s) => ({ paintId: s.paintId, note: s.note })),
      )

      if (result?.error) {
        setSlots(previousSlots)
        toast.error(result.error)
      } else {
        latestConfirmedRef.current = newSlots
      }
    })
  }

  if (!canEdit) {
    return (
      <div className="flex flex-col gap-2">
        {paints.map((slot) =>
          slot.paint ? (
            <PalettePaintRow
              key={slot.position}
              paletteId={paletteId}
              position={slot.position}
              paint={slot.paint}
              note={slot.note}
              canEdit={false}
            />
          ) : (
            <div
              key={slot.position}
              className="flex items-center rounded-lg border border-border p-3 text-sm text-muted-foreground"
            >
              Paint unavailable
            </div>
          )
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={slots.map((s) => s.dndId)} strategy={verticalListSortingStrategy}>
          {slots.map((slot, index) =>
            slot.paint ? (
              <PalettePaintRow
                key={slot.dndId}
                dndId={slot.dndId}
                paletteId={paletteId}
                position={index}
                paint={slot.paint}
                note={slot.note}
                canEdit={true}
              />
            ) : (
              <div
                key={slot.dndId}
                className="flex items-center rounded-lg border border-border p-3 text-sm text-muted-foreground"
              >
                Paint unavailable
              </div>
            )
          )}
        </SortableContext>
      </DndContext>
    </div>
  )
}
