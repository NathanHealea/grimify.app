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

import { reorderRecipeSteps } from '@/modules/recipes/actions/reorder-recipe-steps'
import { RecipeStepCard } from '@/modules/recipes/components/recipe-step-card'
import type { RecipeStep } from '@/modules/recipes/types/recipe-step'
import { reorderArray } from '@/modules/palettes/utils/reorder-array'

/**
 * Drag-and-drop list of step cards for a single recipe section.
 *
 * Wraps {@link RecipeStepCard} in a dnd-kit `DndContext`. Reorders are
 * applied optimistically and persisted via {@link reorderRecipeSteps}; on
 * failure the list rolls back to the last confirmed order and surfaces a
 * Sonner toast.
 *
 * Step ids are already mount-stable uuids, so no synthetic dnd id is needed
 * (cf. `palette-paint-list.tsx`, which uses synthetic ids because palettes
 * may contain duplicate paint ids).
 *
 * @param props.sectionId - UUID of the parent section.
 * @param props.sectionLabel - Section number used to compose step labels
 *   (e.g. `"1"` → `"1.1"`, `"1.2"`).
 * @param props.steps - Ordered array of steps from the server.
 */
export function RecipeStepList({
  sectionId,
  sectionLabel,
  steps,
}: {
  sectionId: string
  sectionLabel: string
  steps: RecipeStep[]
}) {
  const [orderedSteps, setOrderedSteps] = useState<RecipeStep[]>(steps)
  const [trackedSteps, setTrackedSteps] = useState<RecipeStep[]>(steps)
  const [latestConfirmed, setLatestConfirmed] = useState<RecipeStep[]>(steps)
  const [, startTransition] = useTransition()

  // Re-seed local optimistic state when the server sends a fresh steps array
  // (after revalidation). Setting state during render when an external prop
  // has changed avoids the effect-only state mirror anti-pattern.
  if (steps !== trackedSteps) {
    setTrackedSteps(steps)
    setOrderedSteps(steps)
    setLatestConfirmed(steps)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const fromIndex = orderedSteps.findIndex((s) => s.id === active.id)
    const toIndex = orderedSteps.findIndex((s) => s.id === over.id)
    if (fromIndex === -1 || toIndex === -1) return

    const previousSteps = latestConfirmed
    const newSteps = reorderArray(orderedSteps, fromIndex, toIndex)
    setOrderedSteps(newSteps)

    startTransition(async () => {
      const result = await reorderRecipeSteps(
        sectionId,
        newSteps.map((s) => s.id),
      )
      if (result?.error) {
        setOrderedSteps(previousSteps)
        toast.error(result.error)
      } else {
        setLatestConfirmed(newSteps)
      }
    })
  }

  if (orderedSteps.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
        No steps yet. Add the first step to start building this section.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={orderedSteps.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {orderedSteps.map((step, index) => (
            <RecipeStepCard
              key={step.id}
              step={step}
              dndId={step.id}
              label={`${sectionLabel}.${index + 1}`}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  )
}
