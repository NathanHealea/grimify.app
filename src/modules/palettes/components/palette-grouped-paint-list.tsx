'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { toast } from 'sonner'

import type { PaletteGroup } from '@/modules/palettes/types/palette-group'
import type { PalettePaint } from '@/modules/palettes/types/palette-paint'
import type { MasterDraggable } from '@/modules/palettes/types/master-draggable'
import type { GroupRefDraggable } from '@/modules/palettes/types/group-ref-draggable'
import type { DraggableGroup } from '@/modules/palettes/types/draggable-group'
import type { GroupDropState } from '@/modules/palettes/types/group-drop-state'
import { addPaintToGroup } from '@/modules/palettes/actions/add-paint-to-group'
import { removePaintFromGroup } from '@/modules/palettes/actions/remove-paint-from-group'
import { reorderPalettePaints } from '@/modules/palettes/actions/reorder-palette-paints'
import { reorderGroupPaints } from '@/modules/palettes/actions/reorder-group-paints'
import { reorderPaletteGroups } from '@/modules/palettes/actions/reorder-palette-groups'
import { seedMaster, seedGroupRefs, seedGroups } from '@/modules/palettes/utils/seed-dnd-items'
import { resolveTargetGroupId } from '@/modules/palettes/utils/resolve-group-target'
import { getActiveGroupIds } from '@/modules/palettes/utils/get-active-group-ids'
import { getGroupRingClass } from '@/modules/palettes/utils/group-ring-class'
import { reorderArray } from '@/modules/palettes/utils/reorder-array'
import { PaletteGroupHeader } from '@/modules/palettes/components/palette-group-header'
import { PaletteGroupForm } from '@/modules/palettes/components/palette-group-form'
import { PalettePaintRow } from '@/modules/palettes/components/palette-paint-row'

/**
 * Two-layer grouped paint list with separate DnD zones for the master list and
 * per-group membership rows.
 *
 * Master-list slots (top section) are sortable within the master zone and persist
 * order via {@link reorderPalettePaints}. Each named group renders its membership
 * refs below the master list; refs within a group are independently sortable via
 * {@link reorderGroupPaints}. Groups themselves are reorderable via
 * {@link reorderPaletteGroups}. Cross-zone drag moves are rejected; membership
 * changes are managed by the group-toggle chips on each master-list row.
 *
 * In read mode (`canEdit={false}`) drag handles and edit controls are hidden.
 *
 * @param props.paletteId - UUID of the owning palette.
 * @param props.paints - Ordered master-list slots from the server.
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
  const [master, setMaster] = useState<MasterDraggable[]>(() => seedMaster(paints))
  const [groupRefs, setGroupRefs] = useState<Map<string, GroupRefDraggable[]>>(() =>
    seedGroupRefs(groups),
  )
  const [draggableGroups, setDraggableGroups] = useState<DraggableGroup[]>(() => seedGroups(groups))
  const [activeDndId, setActiveDndId] = useState<string | null>(null)
  const [groupDropState, setGroupDropState] = useState<GroupDropState>(null)
  const [, startTransition] = useTransition()

  const dropFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const latestConfirmedMasterRef = useRef<MasterDraggable[]>(master)
  const latestConfirmedGroupRefsRef = useRef<Map<string, GroupRefDraggable[]>>(groupRefs)
  const latestConfirmedGroupsRef = useRef<DraggableGroup[]>(draggableGroups)

  useEffect(() => {
    const newMaster = seedMaster(paints)
    latestConfirmedMasterRef.current = newMaster
    startTransition(() => setMaster(newMaster))
  }, [paints])

  useEffect(() => {
    const newRefs = seedGroupRefs(groups)
    const newDraggableGroups = seedGroups(groups)
    latestConfirmedGroupRefsRef.current = newRefs
    latestConfirmedGroupsRef.current = newDraggableGroups
    startTransition(() => {
      setGroupRefs(newRefs)
      setDraggableGroups(newDraggableGroups)
    })
  }, [groups])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  /** Sets drop feedback state, scheduling auto-clear for success/error kinds. */
  function setGroupDropFeedback(state: GroupDropState, duration = 800) {
    if (dropFeedbackTimeoutRef.current !== null) {
      clearTimeout(dropFeedbackTimeoutRef.current)
      dropFeedbackTimeoutRef.current = null
    }
    setGroupDropState(state)
    if (state !== null && state.kind !== 'hover') {
      dropFeedbackTimeoutRef.current = setTimeout(() => {
        setGroupDropState(null)
        dropFeedbackTimeoutRef.current = null
      }, duration)
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveDndId(event.active.id as string)
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) {
      setGroupDropFeedback(null)
      return
    }

    // Only highlight when a master paint is being dragged over a group
    const activeMasterIdx = master.findIndex((m) => m.dndId === active.id)
    if (activeMasterIdx === -1) {
      setGroupDropFeedback(null)
      return
    }

    const targetGroupId = resolveTargetGroupId(over.id as string, draggableGroups, groupRefs)
    setGroupDropState(targetGroupId ? { groupId: targetGroupId, kind: 'hover' } : null)
  }

  function handleGroupReorder(activeId: string, overId: string): boolean {
    const activeGroupIdx = draggableGroups.findIndex((dg) => dg.dndId === activeId)
    if (activeGroupIdx === -1) return false
    const toIdx = draggableGroups.findIndex((dg) => dg.dndId === overId)
    if (toIdx === -1) return true
    const prevGroups = latestConfirmedGroupsRef.current
    const newGroups = reorderArray(draggableGroups, activeGroupIdx, toIdx)
    setDraggableGroups(newGroups)
    startTransition(async () => {
      const result = await reorderPaletteGroups(
        paletteId,
        newGroups.map((dg, i) => ({ id: dg.group.id, position: i })),
      )
      if (!result.ok) {
        setDraggableGroups(prevGroups)
        toast.error(result.error)
      } else {
        latestConfirmedGroupsRef.current = newGroups
      }
    })
    return true
  }

  function handleCrossZoneAdd(activeId: string, overId: string): boolean {
    const activeMasterIdx = master.findIndex((m) => m.dndId === activeId)
    if (activeMasterIdx === -1) return false
    const targetGroupId = resolveTargetGroupId(overId, draggableGroups, groupRefs)
    if (!targetGroupId) return false

    const slot = master[activeMasterIdx]
    const prevGroupRefs = latestConfirmedGroupRefsRef.current
    const existingRefs = groupRefs.get(targetGroupId) ?? []

    if (existingRefs.some((r) => r.palettePaintId === slot.palettePaintId)) {
      setGroupDropFeedback({ groupId: targetGroupId, kind: 'error' })
      return true
    }

    const newRef: GroupRefDraggable = {
      dndId: crypto.randomUUID(),
      groupMembershipId: crypto.randomUUID(),
      palettePaintId: slot.palettePaintId,
      paint: slot.paint,
    }
    const newGroupRefs = new Map(groupRefs)
    newGroupRefs.set(targetGroupId, [...existingRefs, newRef])
    setGroupRefs(newGroupRefs)
    setGroupDropFeedback({ groupId: targetGroupId, kind: 'success' })

    void addPaintToGroup(paletteId, targetGroupId, slot.palettePaintId).then((result) => {
      if (!result.ok) {
        setGroupRefs(prevGroupRefs)
        setGroupDropFeedback({ groupId: targetGroupId, kind: 'error' })
        toast.error(result.error)
      } else {
        latestConfirmedGroupRefsRef.current = newGroupRefs
      }
    })
    return true
  }

  function handleMasterReorder(activeId: string, overId: string): boolean {
    const activeMasterIdx = master.findIndex((m) => m.dndId === activeId)
    if (activeMasterIdx === -1) return false
    const toIdx = master.findIndex((m) => m.dndId === overId)
    if (toIdx === -1) return false
    const prevMaster = latestConfirmedMasterRef.current
    const newMaster = reorderArray(master, activeMasterIdx, toIdx)
    setMaster(newMaster)
    startTransition(async () => {
      const result = await reorderPalettePaints(
        paletteId,
        newMaster.map((m) => m.palettePaintId),
      )
      if (!result.ok) {
        setMaster(prevMaster)
        toast.error(result.error)
      } else {
        latestConfirmedMasterRef.current = newMaster
      }
    })
    return true
  }

  function handleGroupRefReorder(activeId: string, overId: string) {
    for (const [groupId, refs] of groupRefs) {
      const activeRefIdx = refs.findIndex((r) => r.dndId === activeId)
      if (activeRefIdx === -1) continue
      const toIdx = refs.findIndex((r) => r.dndId === overId)
      if (toIdx === -1) return // cross-zone drop — rejected
      const prevGroupRefs = latestConfirmedGroupRefsRef.current
      const newRefs = reorderArray(refs, activeRefIdx, toIdx)
      const newGroupRefs = new Map(groupRefs)
      newGroupRefs.set(groupId, newRefs)
      setGroupRefs(newGroupRefs)
      startTransition(async () => {
        const result = await reorderGroupPaints(
          paletteId,
          groupId,
          newRefs.map((r) => r.palettePaintId),
        )
        if (!result.ok) {
          setGroupRefs(prevGroupRefs)
          toast.error(result.error)
        } else {
          latestConfirmedGroupRefsRef.current = newGroupRefs
        }
      })
      return
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDndId(null)
    setGroupDropFeedback(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeId = active.id as string
    const overId = over.id as string

    // ── Group reorder ──────────────────────────────────────────────────────────
    if (handleGroupReorder(activeId, overId)) return

    // ── Master paint: cross-zone add or within-zone reorder ───────────────────
    const activeMasterIdx = master.findIndex((m) => m.dndId === activeId)
    if (activeMasterIdx !== -1) {
      const toIdx = master.findIndex((m) => m.dndId === overId)
      if (toIdx === -1) {
        handleCrossZoneAdd(activeId, overId)
      } else {
        handleMasterReorder(activeId, overId)
      }
      return
    }

    // ── Group-ref reorder (within a single group) ──────────────────────────────
    handleGroupRefReorder(activeId, overId)
  }

  function handleGroupToggle(palettePaintId: string, groupId: string, active: boolean) {
    const prevGroupRefs = latestConfirmedGroupRefsRef.current
    const newGroupRefs = new Map(groupRefs)

    if (active) {
      const masterSlot = master.find((m) => m.palettePaintId === palettePaintId)
      const existing = newGroupRefs.get(groupId) ?? []
      if (!existing.some((r) => r.palettePaintId === palettePaintId)) {
        const newRef: GroupRefDraggable = {
          dndId: crypto.randomUUID(),
          groupMembershipId: crypto.randomUUID(),
          palettePaintId,
          paint: masterSlot?.paint,
        }
        newGroupRefs.set(groupId, [...existing, newRef])
      }
    } else {
      const existing = newGroupRefs.get(groupId) ?? []
      newGroupRefs.set(groupId, existing.filter((r) => r.palettePaintId !== palettePaintId))
    }

    setGroupRefs(newGroupRefs)

    startTransition(async () => {
      const result = active
        ? await addPaintToGroup(paletteId, groupId, palettePaintId)
        : await removePaintFromGroup(paletteId, groupId, palettePaintId)
      if (!result.ok) {
        setGroupRefs(prevGroupRefs)
        toast.error(result.error)
      } else {
        latestConfirmedGroupRefsRef.current = newGroupRefs
      }
    })
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-3 select-none">
        {/* ── Master list ─────────────────────────────────────────────────────── */}
        <SortableContext
          items={master.map((m) => m.dndId)}
          strategy={verticalListSortingStrategy}
        >
          {master.map((slot) =>
            slot.paint ? (
              <PalettePaintRow
                key={slot.dndId}
                dndId={canEdit ? slot.dndId : undefined}
                paletteId={paletteId}
                palettePaintId={slot.palettePaintId}
                paint={slot.paint}
                note={slot.note}
                canEdit={canEdit}
                variant="master"
                groups={canEdit ? groups : undefined}
                activeGroupIds={canEdit ? getActiveGroupIds(slot.palettePaintId, groupRefs) : undefined}
                onGroupToggle={canEdit ? (groupId, active) => handleGroupToggle(slot.palettePaintId, groupId, active) : undefined}
              />
            ) : (
              <div
                key={slot.dndId}
                className="flex items-center rounded-lg border border-border p-3 text-sm text-muted-foreground"
              >
                Paint unavailable
              </div>
            ),
          )}
        </SortableContext>

        {/* ── Groups ──────────────────────────────────────────────────────────── */}
        <SortableContext
          items={draggableGroups.map((dg) => dg.dndId)}
          strategy={verticalListSortingStrategy}
        >
          {draggableGroups.map((dg) => {
            const refs = groupRefs.get(dg.group.id) ?? []
            const isAnyGroupDragging = activeDndId !== null && draggableGroups.some((g) => g.dndId === activeDndId)
            return (
              <div key={dg.dndId} className={['flex flex-col gap-1 rounded-md transition-shadow', getGroupRingClass(dg.group.id, groupDropState)].filter(Boolean).join(' ')}>
                <PaletteGroupHeader
                  paletteId={paletteId}
                  group={dg.group}
                  canEdit={canEdit}
                  dndId={canEdit ? dg.dndId : undefined}
                  paintCount={refs.length}
                />
                <div className={['flex flex-col gap-1', refs.length > 0 ? 'pl-6' : '', isAnyGroupDragging ? 'hidden' : ''].filter(Boolean).join(' ')}>
                  <SortableContext
                    items={refs.map((r) => r.dndId)}
                    strategy={verticalListSortingStrategy}
                  >
                    {refs.map((ref) =>
                      ref.paint ? (
                        <PalettePaintRow
                          key={ref.dndId}
                          dndId={canEdit ? ref.dndId : undefined}
                          paletteId={paletteId}
                          palettePaintId={ref.palettePaintId}
                          groupId={dg.group.id}
                          paint={ref.paint}
                          note={null}
                          canEdit={canEdit}
                          variant="group"
                          onRemovedFromGroup={() => {
                            const newGroupRefs = new Map(groupRefs)
                            const existing = newGroupRefs.get(dg.group.id) ?? []
                            newGroupRefs.set(dg.group.id, existing.filter((r) => r.palettePaintId !== ref.palettePaintId))
                            setGroupRefs(newGroupRefs)
                            latestConfirmedGroupRefsRef.current = newGroupRefs
                          }}
                        />
                      ) : (
                        <div
                          key={ref.dndId}
                          className="flex items-center rounded-lg border border-border p-3 text-sm text-muted-foreground"
                        >
                          Paint unavailable
                        </div>
                      ),
                    )}
                  </SortableContext>
                  {refs.length === 0 && canEdit && (
                    <p className="px-2 py-1 text-xs italic text-muted-foreground">
                      No paints in this group
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </SortableContext>

        {canEdit && <PaletteGroupForm paletteId={paletteId} />}
      </div>

      {/* ── Drag overlay for group header and cross-zone paint ghosts ────────── */}
      <DragOverlay dropAnimation={null}>
        {(() => {
          if (!activeDndId) return null

          // Group header ghost
          const dg = draggableGroups.find((g) => g.dndId === activeDndId)
          if (dg) {
            const count = groupRefs.get(dg.group.id)?.length ?? 0
            return (
              <div className="flex items-center gap-2 rounded-md border border-dashed border-border bg-background px-2 py-1 shadow-xl">
                <span className="flex-1 text-sm font-semibold">{dg.group.name}</span>
                <span className="rounded px-1.5 py-0.5 text-xs text-muted-foreground bg-muted">
                  {count} {count === 1 ? 'paint' : 'paints'}
                </span>
              </div>
            )
          }

          // Paint swatch ghost — shown when a master paint is dragged over a group
          const masterSlot = master.find((m) => m.dndId === activeDndId)
          if (masterSlot && groupDropState?.kind === 'hover' && masterSlot.paint) {
            return (
              <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-background px-3 py-2 shadow-xl">
                <div
                  className="size-6 shrink-0 rounded-sm"
                  style={{ backgroundColor: masterSlot.paint.hex }}
                />
                <span className="text-sm font-medium">{masterSlot.paint.name}</span>
              </div>
            )
          }

          return null
        })()}
      </DragOverlay>
    </DndContext>
  )
}
