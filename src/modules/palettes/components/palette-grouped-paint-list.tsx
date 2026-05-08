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
 * Grouped vertical paint list with separate DnD contexts for groups and paints.
 *
 * Renders named group sections (each with its own `DndContext`) plus an
 * "Ungrouped" section below. Group headers are draggable via a top-level
 * `DndContext` separate from the per-group paint DnD.
 *
 * In edit mode (`canEdit={true}`) both group reorder and per-group paint reorder
 * are enabled, and a {@link PaletteGroupForm} is rendered at the bottom. In read
 * mode only the structural layout is shown.
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

  /** Builds the full ordered slot list from current group + slot state. */
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

  function handleGroupDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const fromIndex = draggableGroups.findIndex((dg) => dg.dndId === active.id)
    const toIndex = draggableGroups.findIndex((dg) => dg.dndId === over.id)
    if (fromIndex === -1 || toIndex === -1) return

    const previousGroups = latestConfirmedGroupsRef.current
    const newGroups = reorderArray(draggableGroups, fromIndex, toIndex)
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
  }

  function handlePaintDragEnd(groupId: string | null, event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const groupSlots = slots.filter((s) => s.groupId === groupId)
    const fromIndex = groupSlots.findIndex((s) => s.dndId === active.id)
    const toIndex = groupSlots.findIndex((s) => s.dndId === over.id)
    if (fromIndex === -1 || toIndex === -1) return

    const reorderedGroup = reorderArray(groupSlots, fromIndex, toIndex)
    const newSlots = slots.map((s) => {
      const idx = reorderedGroup.findIndex((rs) => rs.dndId === s.dndId)
      return idx !== -1 ? reorderedGroup[idx] : s
    })

    const previousSlots = latestConfirmedSlotsRef.current
    setSlots(newSlots)

    const fullList = buildFullSlotList(newSlots, draggableGroups)

    startTransition(async () => {
      const result = await reorderPalettePaints(
        paletteId,
        fullList.map((s) => ({ paintId: s.paintId, note: s.note, groupId: s.groupId })),
      )
      if (result?.error) {
        setSlots(previousSlots)
        toast.error(result.error)
      } else {
        latestConfirmedSlotsRef.current = newSlots
      }
    })
  }

  function renderSection(
    sectionSlots: DraggableSlot[],
    groupId: string | null,
  ) {
    if (sectionSlots.length === 0 && !canEdit) return null

    return (
      <div key={groupId ?? 'ungrouped'} className="flex flex-col gap-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(e) => handlePaintDragEnd(groupId, e)}
        >
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
        </DndContext>
        {sectionSlots.length === 0 && canEdit && (
          <p className="text-xs text-muted-foreground px-2 py-1 italic">No paints in this group</p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Group headers in their own DndContext */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleGroupDragEnd}
      >
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
      </DndContext>

      {/* Ungrouped section */}
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
  )
}
