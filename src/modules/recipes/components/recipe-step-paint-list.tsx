'use client'

import { useState, useTransition } from 'react'
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

import type { RecipeStepPaint } from '@/modules/recipes/types/recipe-step-paint'
import { reorderRecipeStepPaints } from '@/modules/recipes/actions/reorder-recipe-step-paints'
import { RecipeStepPaintRow } from '@/modules/recipes/components/recipe-step-paint-row'
import { reorderArray } from '@/modules/palettes/utils/reorder-array'

/**
 * Mount-stable wrapper assigning a synthetic DnD id to each step paint.
 *
 * The row's database `id` would normally serve, but
 * {@link reorderRecipeStepPaints} re-issues row UUIDs via the underlying
 * RPC's DELETE+INSERT pattern — so a synthetic stable id keeps optimistic
 * ordering coherent across saves.
 */
type DraggableStepPaint = {
  dndId: string
  paint: RecipeStepPaint
}

function seedSlots(paints: RecipeStepPaint[]): DraggableStepPaint[] {
  return paints.map((paint) => ({
    dndId: crypto.randomUUID(),
    paint,
  }))
}

/**
 * Vertical list of paint rows for a recipe step.
 *
 * In edit mode (`canEdit={true}`), wraps the list in a dnd-kit `DndContext`
 * so users can drag to reorder. The new order is persisted optimistically
 * via {@link reorderRecipeStepPaints}; on failure the list rolls back to the
 * last confirmed snapshot and surfaces the error via a Sonner toast.
 *
 * In read mode (`canEdit={false}`), renders a plain stack of rows without
 * any DnD wiring.
 *
 * @param props.stepId - UUID of the parent step (passed to reorder action).
 * @param props.paints - Ordered array of hydrated step paints.
 * @param props.canEdit - When true, enables drag-to-reorder, inputs, remove buttons.
 */
export function RecipeStepPaintList({
  stepId,
  paints,
  canEdit,
}: {
  stepId: string
  paints: RecipeStepPaint[]
  canEdit: boolean
}) {
  const [slots, setSlots] = useState<DraggableStepPaint[]>(() => seedSlots(paints))
  const [trackedPaints, setTrackedPaints] = useState<RecipeStepPaint[]>(paints)
  const [latestConfirmed, setLatestConfirmed] = useState<DraggableStepPaint[]>(slots)
  const [, startTransition] = useTransition()

  // Re-seed slots when the server sends a fresh paints array (after
  // revalidation). Setting state during render when an external prop has
  // changed avoids the effect-only state mirror anti-pattern.
  if (paints !== trackedPaints) {
    const next = seedSlots(paints)
    setTrackedPaints(paints)
    setSlots(next)
    setLatestConfirmed(next)
  }

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

    const previousSlots = latestConfirmed
    const newSlots = reorderArray(slots, fromIndex, toIndex)
    setSlots(newSlots)

    startTransition(async () => {
      const result = await reorderRecipeStepPaints(
        stepId,
        newSlots.map((s) => s.paint.id),
      )
      if (result?.error) {
        setSlots(previousSlots)
        toast.error(result.error)
      } else {
        setLatestConfirmed(newSlots)
      }
    })
  }

  if (paints.length === 0) {
    return null
  }

  if (!canEdit) {
    return (
      <div className="flex flex-col gap-2">
        {paints.map((paint) => (
          <RecipeStepPaintRow key={paint.id} paint={paint} canEdit={false} />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={slots.map((s) => s.dndId)} strategy={verticalListSortingStrategy}>
          {slots.map((slot) => (
            <RecipeStepPaintRow
              key={slot.dndId}
              dndId={slot.dndId}
              paint={slot.paint}
              canEdit={true}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  )
}
