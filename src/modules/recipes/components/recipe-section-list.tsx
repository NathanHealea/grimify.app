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
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import { addRecipeSection } from '@/modules/recipes/actions/add-recipe-section'
import { reorderRecipeSections } from '@/modules/recipes/actions/reorder-recipe-sections'
import { RecipeSectionCard } from '@/modules/recipes/components/recipe-section-card'
import type { RecipeSection } from '@/modules/recipes/types/recipe-section'
import { reorderArray } from '@/modules/palettes/utils/reorder-array'

/**
 * Drag-and-drop list of {@link RecipeSectionCard}s for the recipe builder.
 *
 * Wraps each section in a dnd-kit `DndContext` so users can reorder sections
 * within the recipe. Reorders are applied optimistically and persisted via
 * {@link reorderRecipeSections}; on failure the list rolls back to the last
 * confirmed order and surfaces a Sonner toast.
 *
 * Renders an "Add section" button below the list that calls
 * {@link addRecipeSection} with a default title; the server revalidates so
 * the new section appears on the next render.
 *
 * Section ids are mount-stable uuids (per `00-recipe-schema`), so they are
 * used directly as DnD ids — no synthetic id is needed.
 *
 * @param props.recipeId - UUID of the parent recipe.
 * @param props.sections - Ordered array of sections from the server.
 */
export function RecipeSectionList({
  recipeId,
  sections,
}: {
  recipeId: string
  sections: RecipeSection[]
}) {
  const [orderedSections, setOrderedSections] = useState<RecipeSection[]>(sections)
  const [trackedSections, setTrackedSections] = useState<RecipeSection[]>(sections)
  const [latestConfirmed, setLatestConfirmed] = useState<RecipeSection[]>(sections)
  const [isPending, startTransition] = useTransition()

  // Re-seed local optimistic state when the server sends a fresh sections
  // array (after revalidation). React 19 supports setting state during render
  // when an external prop has changed; this avoids the effect-only state
  // mirror anti-pattern.
  if (sections !== trackedSections) {
    setTrackedSections(sections)
    setOrderedSections(sections)
    setLatestConfirmed(sections)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const fromIndex = orderedSections.findIndex((s) => s.id === active.id)
    const toIndex = orderedSections.findIndex((s) => s.id === over.id)
    if (fromIndex === -1 || toIndex === -1) return

    const previousSections = latestConfirmed
    const newSections = reorderArray(orderedSections, fromIndex, toIndex)
    setOrderedSections(newSections)

    startTransition(async () => {
      const result = await reorderRecipeSections(
        recipeId,
        newSections.map((s) => s.id),
      )
      if (result?.error) {
        setOrderedSections(previousSections)
        toast.error(result.error)
      } else {
        setLatestConfirmed(newSections)
      }
    })
  }

  function handleAddSection() {
    startTransition(async () => {
      const result = await addRecipeSection(recipeId, 'New section')
      if ('error' in result) {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {orderedSections.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
          No sections yet. Add the first section to start outlining this recipe.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={orderedSections.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-4">
              {orderedSections.map((section, index) => (
                <RecipeSectionCard
                  key={section.id}
                  section={section}
                  dndId={section.id}
                  label={String(index + 1)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <div>
        <button
          type="button"
          onClick={handleAddSection}
          disabled={isPending}
          className="btn btn-sm btn-outline"
        >
          <Plus className="size-4" aria-hidden />
          Add section
        </button>
      </div>
    </div>
  )
}
