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

import { reorderRecipeNotes } from '@/modules/recipes/actions/reorder-recipe-notes'
import { RecipeNoteCard } from '@/modules/recipes/components/recipe-note-card'
import type { RecipeNote } from '@/modules/recipes/types/recipe-note'
import type { RecipeNoteParent } from '@/modules/recipes/types/recipe-note-parent'
import { reorderArray } from '@/modules/palettes/utils/reorder-array'

const MAX_DRAFTS = 5

/**
 * Mount-stable wrapper assigning a synthetic DnD id to each note slot.
 *
 * `note` is `null` while a draft has not yet been saved. Once
 * {@link RecipeNoteCard} successfully calls `addRecipeNote`, the slot's
 * `note` is populated with the persisted row.
 */
type NoteSlot = {
  dndId: string
  note: RecipeNote | null
  startInEdit: boolean
}

function seedSlots(notes: RecipeNote[]): NoteSlot[] {
  return notes.map((note) => ({
    dndId: crypto.randomUUID(),
    note,
    startInEdit: false,
  }))
}

/**
 * List of notes for a recipe-level or step-level parent.
 *
 * In edit mode (`canEdit={true}`) renders each note inside a dnd-kit
 * `<SortableContext>` (vertical list strategy) and exposes an "Add note"
 * button below the list. New notes are added as **drafts** — their
 * server row is created on the first blur with non-empty content via
 * {@link addRecipeNote}. Empty drafts are silently discarded so the
 * user can click "Add note" without committing to a save.
 *
 * Reorder persists optimistically via {@link reorderRecipeNotes} and
 * rolls back on failure with a Sonner toast.
 *
 * In read mode this component is not used; see `RecipeNoteDisplay`.
 *
 * @param props.parent - Discriminated union for which entity owns these notes.
 * @param props.notes - Server-loaded notes (head first, ordered by `position`).
 */
export function RecipeNoteList({
  parent,
  notes,
}: {
  parent: RecipeNoteParent
  notes: RecipeNote[]
}) {
  const [slots, setSlots] = useState<NoteSlot[]>(() => seedSlots(notes))
  const [trackedNotes, setTrackedNotes] = useState<RecipeNote[]>(notes)
  const [latestConfirmed, setLatestConfirmed] = useState<NoteSlot[]>(slots)
  const [, startTransition] = useTransition()

  if (notes !== trackedNotes) {
    const incoming = seedSlots(notes)
    const drafts = slots.filter((s) => s.note === null)
    const next = [...incoming, ...drafts]
    setTrackedNotes(notes)
    setSlots(next)
    setLatestConfirmed(next)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleAdd() {
    const draftCount = slots.filter((s) => s.note === null).length
    if (draftCount >= MAX_DRAFTS) {
      toast.info('Save your existing draft notes before adding more.')
      return
    }
    setSlots((prev) => [
      ...prev,
      { dndId: crypto.randomUUID(), note: null, startInEdit: true },
    ])
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const fromIndex = slots.findIndex((s) => s.dndId === active.id)
    const toIndex = slots.findIndex((s) => s.dndId === over.id)
    if (fromIndex === -1 || toIndex === -1) return

    const previousSlots = latestConfirmed
    const newSlots = reorderArray(slots, fromIndex, toIndex)
    setSlots(newSlots)

    const orderedIds = newSlots
      .map((s) => s.note?.id)
      .filter((id): id is string => typeof id === 'string')

    startTransition(async () => {
      const result = await reorderRecipeNotes(parent, orderedIds)
      if (result?.error) {
        setSlots(previousSlots)
        toast.error(result.error)
      } else {
        setLatestConfirmed(newSlots)
      }
    })
  }

  function handleSaved(slotId: string, note: RecipeNote) {
    setSlots((prev) =>
      prev.map((s) =>
        s.dndId === slotId ? { ...s, note, startInEdit: false } : s,
      ),
    )
  }

  function handleDeleted(slotId: string) {
    setSlots((prev) => prev.filter((s) => s.dndId !== slotId))
  }

  function handleDraftRemove(slotId: string) {
    setSlots((prev) => prev.filter((s) => s.dndId !== slotId))
  }

  return (
    <div className="flex flex-col gap-2">
      {slots.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No notes yet. Click "Add note" to capture a tip or callout.
        </p>
      )}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={slots.map((s) => s.dndId)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2">
            {slots.map((slot) => (
              <RecipeNoteCard
                key={slot.dndId}
                dndId={slot.dndId}
                noteId={slot.note?.id ?? null}
                parent={parent}
                initialBody={slot.note?.body ?? ''}
                startInEdit={slot.startInEdit}
                onSaved={(note) => handleSaved(slot.dndId, note)}
                onDeleted={() => handleDeleted(slot.dndId)}
                onDraftRemove={() => handleDraftRemove(slot.dndId)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <button
        type="button"
        onClick={handleAdd}
        className="btn btn-ghost btn-sm self-start"
      >
        <Plus className="size-4" aria-hidden />
        <span>Add note</span>
      </button>
    </div>
  )
}
