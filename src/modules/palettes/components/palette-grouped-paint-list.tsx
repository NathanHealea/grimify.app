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
import type { DragEndEvent, DragOverEvent } from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { toast } from 'sonner'

import type { PaletteGroup } from '@/modules/palettes/types/palette-group'
import type { PalettePaint } from '@/modules/palettes/types/palette-paint'
import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'
import { reorderPalettePaints } from '@/modules/palettes/actions/reorder-palette-paints'
import { reorderPaletteGroups } from '@/modules/palettes/actions/reorder-palette-groups'
import { PaletteGroupHeader } from '@/modules/palettes/components/palette-group-header'
import { PaletteGroupForm } from '@/modules/palettes/components/palette-group-form'
import { PalettePaintRow } from '@/modules/palettes/components/palette-paint-row'
import { reorderArray } from '@/modules/palettes/utils/reorder-array'

/** A paint slot augmented with a mount-stable DnD id. */
type DraggableSlot = {
  dndId: string
  paintId: string
  note: string | null
  groupId: string | null
  paint: ColorWheelPaint | undefined
  addedAt: string
}

/** A group augmented with a mount-stable DnD id. */
type DraggableGroup = {
  dndId: string
  group: PaletteGroup
}

function seedSlots(paints: PalettePaint[]): DraggableSlot[] {
  return paints.map((slot) => ({
    dndId: crypto.randomUUID(),
    paintId: slot.paintId,
    note: slot.note,
    groupId: slot.groupId,
    paint: slot.paint,
    addedAt: slot.addedAt,
  }))
}

function seedGroups(groups: PaletteGroup[]): DraggableGroup[] {
  return groups.map((g) => ({ dndId: crypto.randomUUID(), group: g }))
}

/**
 * Grouped vertical paint list with a unified DnD context for cross-group paint moves
 * and group reorder.
 *
 * A single `DndContext` handles both group header reordering and paint dragging.
 * Dragging a paint over a different group's section (or its header) moves it there
 * optimistically via `onDragOver`; the final order is persisted on `onDragEnd` via
 * {@link reorderPalettePaints}. Group reorder is persisted via
 * {@link reorderPaletteGroups}. Paints within named groups are visually indented.
 *
 * In read mode (`canEdit={false}`) only the structural layout is shown.
 *
 * @param props.paletteId - UUID of the owning palette.
 * @param props.paints - Ordered paint slots from the server.
 * @param props.groups - Named groups sorted by `position` ascending.
 * @param props.canEdit - When true, enables drag-to-reorder and edit controls.
 */
export function PaletteGroupedPaintList({
  paletteId,
  paints,
  groups,
  canEdit,
}: {
  paletteId: string
  paints: PalettePaint[]
  groups: PaletteGroup[]
  canEdit: boolean
}) {
  const [slots, setSlots] = useState<DraggableSlot[]>(() => seedSlots(paints))
  const [draggableGroups, setDraggableGroups] = useState<DraggableGroup[]>(() => seedGroups(groups))
  const [, startTransition] = useTransition()

  const latestConfirmedSlotsRef = useRef<DraggableSlot[]>(slots)
  const latestConfirmedGroupsRef = useRef<DraggableGroup[]>(draggableGroups)

  // Always holds the latest slots value — kept in sync via useEffect and also
  // updated synchronously within handleDragOver so handleDragEnd never reads a stale closure.
  const slotsRef = useRef<DraggableSlot[]>(slots)

  useEffect(() => {
    slotsRef.current = slots
  }, [slots])

  useEffect(() => {
    setSlots(seedSlots(paints))
  }, [paints])

  useEffect(() => {
    setDraggableGroups(seedGroups(groups))
  }, [groups])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  /** Builds the full ordered slot list grouped by current group + slot state. */
  function buildFullSlotList(
    currentSlots: DraggableSlot[],
    currentGroups: DraggableGroup[],
  ): DraggableSlot[] {
    const result: DraggableSlot[] = []
    for (const dg of currentGroups) {
      result.push(...currentSlots.filter((s) => s.groupId === dg.group.id))
    }
    result.push(...currentSlots.filter((s) => s.groupId === null))
    return result
  }

  /**
   * Reorders `group`'s slots within the flat `currentSlots` array by replacing
   * the slots at their original array positions with the reordered sequence.
   * Other groups' slots are untouched.
   */
  function applyGroupReorder(
    currentSlots: DraggableSlot[],
    groupId: string | null,
    reorderedGroup: DraggableSlot[],
  ): DraggableSlot[] {
    const groupIndices: number[] = []
    currentSlots.forEach((s, i) => {
      if (s.groupId === groupId) groupIndices.push(i)
    })
    const next = [...currentSlots]
    groupIndices.forEach((arrIdx, i) => {
      next[arrIdx] = reorderedGroup[i]
    })
    return next
  }

  /**
   * Optimistically moves a paint to a different group while dragging.
   * Updates `slotsRef` synchronously so `handleDragEnd` always reads
   * the latest group assignment regardless of React render timing.
   */
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const currentSlots = slotsRef.current
    const activeSlot = currentSlots.find((s) => s.dndId === active.id)
    if (!activeSlot) return // dragging a group header, not a paint

    const overSlot = currentSlots.find((s) => s.dndId === over.id)
    const overGroup = draggableGroups.find((dg) => dg.dndId === over.id)

    let targetGroupId: string | null
    if (overSlot) {
      targetGroupId = overSlot.groupId
    } else if (overGroup) {
      targetGroupId = overGroup.group.id
    } else {
      return
    }

    if (activeSlot.groupId === targetGroupId) return

    const updated = currentSlots.map((s) =>
      s.dndId === activeSlot.dndId ? { ...s, groupId: targetGroupId } : s,
    )
    slotsRef.current = updated // synchronous update for handleDragEnd
    setSlots(updated)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (!over) {
      // Drag cancelled — roll back any cross-group groupId changes from dragOver
      slotsRef.current = latestConfirmedSlotsRef.current
      setSlots(latestConfirmedSlotsRef.current)
      return
    }

    // ── Group reorder ──────────────────────────────────────────────────────────
    const activeGroupIndex = draggableGroups.findIndex((dg) => dg.dndId === active.id)
    if (activeGroupIndex !== -1) {
      if (active.id === over.id) return
      const toIndex = draggableGroups.findIndex((dg) => dg.dndId === over.id)
      if (toIndex === -1) return

      const previousGroups = latestConfirmedGroupsRef.current
      const newGroups = reorderArray(draggableGroups, activeGroupIndex, toIndex)
      setDraggableGroups(newGroups)

      startTransition(async () => {
        const result = await reorderPaletteGroups(
          paletteId,
          newGroups.map((dg, i) => ({ id: dg.group.id, position: i })),
        )
        if (result?.error) {
          setDraggableGroups(previousGroups)
          toast.error(result.error)
        } else {
          latestConfirmedGroupsRef.current = newGroups
        }
      })
      return
    }

    // ── Paint reorder (within-group or cross-group) ────────────────────────────
    // Read from slotsRef so we always have the groupId updated by handleDragOver,
    // even if React hasn't committed the setSlots call yet.
    const currentSlots = slotsRef.current
    const activeSlot = currentSlots.find((s) => s.dndId === active.id)
    if (!activeSlot) return

    const currentGroupId = activeSlot.groupId
    const groupSlots = currentSlots.filter((s) => s.groupId === currentGroupId)
    const fromIndex = groupSlots.findIndex((s) => s.dndId === active.id)

    // Only reorder within the group when the drop target is a paint in the same group
    const overSlotInGroup = currentSlots.find(
      (s) => s.dndId === over.id && s.groupId === currentGroupId,
    )
    const toIndex = overSlotInGroup
      ? groupSlots.findIndex((s) => s.dndId === over.id)
      : fromIndex

    let newSlots = currentSlots
    if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
      const reorderedGroup = reorderArray(groupSlots, fromIndex, toIndex)
      // Replace slots at their original array positions with the reordered sequence.
      // Using slots.map() would not change array order — it only replaces values
      // at existing positions with the same objects, leaving the order intact.
      newSlots = applyGroupReorder(currentSlots, currentGroupId, reorderedGroup)
      slotsRef.current = newSlots
      setSlots(newSlots)
    }

    const previousSlots = latestConfirmedSlotsRef.current
    const fullList = buildFullSlotList(newSlots, draggableGroups)

    startTransition(async () => {
      const result = await reorderPalettePaints(
        paletteId,
        fullList.map((s) => ({ paintId: s.paintId, note: s.note, groupId: s.groupId })),
      )
      if (result?.error) {
        slotsRef.current = previousSlots
        setSlots(previousSlots)
        toast.error(result.error)
      } else {
        latestConfirmedSlotsRef.current = newSlots
      }
    })
  }

  function renderSection(sectionSlots: DraggableSlot[], groupId: string | null) {
    const isNamedGroup = groupId !== null
    if (sectionSlots.length === 0 && !canEdit) return null

    return (
      <div className={['flex flex-col gap-1', isNamedGroup ? 'pl-6' : ''].filter(Boolean).join(' ')}>
        <SortableContext
          items={sectionSlots.map((s) => s.dndId)}
          strategy={verticalListSortingStrategy}
        >
          {sectionSlots.map((slot) => {
            const idx = slots.findIndex((s) => s.dndId === slot.dndId)
            return slot.paint ? (
              <PalettePaintRow
                key={slot.dndId}
                dndId={canEdit ? slot.dndId : undefined}
                paletteId={paletteId}
                position={idx}
                paint={slot.paint}
                note={slot.note}
                canEdit={canEdit}
                groups={canEdit ? groups : undefined}
                currentGroupId={slot.groupId}
              />
            ) : (
              <div
                key={slot.dndId}
                className="flex items-center rounded-lg border border-border p-3 text-sm text-muted-foreground"
              >
                Paint unavailable
              </div>
            )
          })}
        </SortableContext>
        {sectionSlots.length === 0 && canEdit && (
          <p className="px-2 py-1 text-xs italic text-muted-foreground">No paints in this group</p>
        )}
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragOver={canEdit ? handleDragOver : undefined}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col gap-3 select-none">
        {/* Group headers share the outer SortableContext for group reorder */}
        <SortableContext
          items={draggableGroups.map((dg) => dg.dndId)}
          strategy={verticalListSortingStrategy}
        >
          {draggableGroups.map((dg) => {
            const groupSlots = slots.filter((s) => s.groupId === dg.group.id)
            return (
              <div key={dg.dndId} className="flex flex-col gap-1">
                <PaletteGroupHeader
                  paletteId={paletteId}
                  group={dg.group}
                  canEdit={canEdit}
                  dndId={canEdit ? dg.dndId : undefined}
                />
                {renderSection(groupSlots, dg.group.id)}
              </div>
            )
          })}
        </SortableContext>

        {/* Ungrouped section — not indented, no group-reorder drag handle */}
        {(() => {
          const ungrouped = slots.filter((s) => s.groupId === null)
          if (ungrouped.length === 0 && !canEdit) return null
          return (
            <div className="flex flex-col gap-1">
              {draggableGroups.length > 0 && (
                <PaletteGroupHeader
                  paletteId={paletteId}
                  group={{ id: '', paletteId, name: 'Ungrouped', position: -1, createdAt: '' }}
                  canEdit={false}
                />
              )}
              {renderSection(ungrouped, null)}
            </div>
          )
        })()}

        {canEdit && <PaletteGroupForm paletteId={paletteId} />}
      </div>
    </DndContext>
  )
}
