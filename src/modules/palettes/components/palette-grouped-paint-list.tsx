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
import { addPaintToGroup } from '@/modules/palettes/actions/add-paint-to-group'
import { removePaintFromGroup } from '@/modules/palettes/actions/remove-paint-from-group'
import { reorderPalettePaints } from '@/modules/palettes/actions/reorder-palette-paints'
import { reorderGroupPaints } from '@/modules/palettes/actions/reorder-group-paints'
import { reorderPaletteGroups } from '@/modules/palettes/actions/reorder-palette-groups'
import { PaletteGroupHeader } from '@/modules/palettes/components/palette-group-header'
import { PaletteGroupForm } from '@/modules/palettes/components/palette-group-form'
import { PalettePaintRow } from '@/modules/palettes/components/palette-paint-row'
import { reorderArray } from '@/modules/palettes/utils/reorder-array'

type MasterDraggable = {
  dndId: string
  palettePaintId: string
  paintId: string
  note: string | null
  addedAt: string
  paint: ColorWheelPaint | undefined
}

type GroupRefDraggable = {
  dndId: string
  groupMembershipId: string
  palettePaintId: string
  paint: ColorWheelPaint | undefined
}

/** A group augmented with a mount-stable DnD id. */
type DraggableGroup = {
  dndId: string
  group: PaletteGroup
}

function seedMaster(paints: PalettePaint[]): MasterDraggable[] {
  return paints.map((p) => ({
    dndId: crypto.randomUUID(),
    palettePaintId: p.id,
    paintId: p.paintId,
    note: p.note,
    addedAt: p.addedAt,
    paint: p.paint,
  }))
}

function seedGroupRefs(groups: PaletteGroup[]): Map<string, GroupRefDraggable[]> {
  const map = new Map<string, GroupRefDraggable[]>()
  for (const g of groups) {
    map.set(
      g.id,
      g.paints.map((gp) => ({
        dndId: crypto.randomUUID(),
        groupMembershipId: gp.id,
        palettePaintId: gp.palettePaintId,
        paint: gp.palettePaint?.paint,
      })),
    )
  }
  return map
}

function seedGroups(groups: PaletteGroup[]): DraggableGroup[] {
  return groups.map((g) => ({ dndId: crypto.randomUUID(), group: g }))
}

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
  const [, startTransition] = useTransition()

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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    // ── Group reorder ──────────────────────────────────────────────────────────
    const activeGroupIdx = draggableGroups.findIndex((dg) => dg.dndId === active.id)
    if (activeGroupIdx !== -1) {
      const toIdx = draggableGroups.findIndex((dg) => dg.dndId === over.id)
      if (toIdx === -1) return
      const prevGroups = latestConfirmedGroupsRef.current
      const newGroups = reorderArray(draggableGroups, activeGroupIdx, toIdx)
      setDraggableGroups(newGroups)
      startTransition(async () => {
        const result = await reorderPaletteGroups(
          paletteId,
          newGroups.map((dg, i) => ({ id: dg.group.id, position: i })),
        )
        if (result?.error) {
          setDraggableGroups(prevGroups)
          toast.error(result.error)
        } else {
          latestConfirmedGroupsRef.current = newGroups
        }
      })
      return
    }

    // ── Master-list reorder ────────────────────────────────────────────────────
    const activeMasterIdx = master.findIndex((m) => m.dndId === active.id)
    if (activeMasterIdx !== -1) {
      const toIdx = master.findIndex((m) => m.dndId === over.id)
      if (toIdx === -1) return // cross-zone drop — rejected
      const prevMaster = latestConfirmedMasterRef.current
      const newMaster = reorderArray(master, activeMasterIdx, toIdx)
      setMaster(newMaster)
      startTransition(async () => {
        const result = await reorderPalettePaints(
          paletteId,
          newMaster.map((m) => m.palettePaintId),
        )
        if (result?.error) {
          setMaster(prevMaster)
          toast.error(result.error)
        } else {
          latestConfirmedMasterRef.current = newMaster
        }
      })
      return
    }

    // ── Group-ref reorder (within a single group) ──────────────────────────────
    for (const [groupId, refs] of groupRefs) {
      const activeRefIdx = refs.findIndex((r) => r.dndId === active.id)
      if (activeRefIdx === -1) continue
      const toIdx = refs.findIndex((r) => r.dndId === over.id)
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
        if (result?.error) {
          setGroupRefs(prevGroupRefs)
          toast.error(result.error)
        } else {
          latestConfirmedGroupRefsRef.current = newGroupRefs
        }
      })
      return
    }
  }

  function getActiveGroupIds(palettePaintId: string): string[] {
    const active: string[] = []
    for (const [groupId, refs] of groupRefs) {
      if (refs.some((r) => r.palettePaintId === palettePaintId)) active.push(groupId)
    }
    return active
  }

  function handleGroupToggle(palettePaintId: string, groupId: string, active: boolean) {
    const prevGroupRefs = latestConfirmedGroupRefsRef.current
    const newGroupRefs = new Map(groupRefs)

    if (active) {
      // Optimistically add the paint to the group ref list
      const masterSlot = master.find((m) => m.palettePaintId === palettePaintId)
      const existing = newGroupRefs.get(groupId) ?? []
      // Avoid duplicate
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
      // Optimistically remove the paint from the group ref list
      const existing = newGroupRefs.get(groupId) ?? []
      newGroupRefs.set(groupId, existing.filter((r) => r.palettePaintId !== palettePaintId))
    }

    setGroupRefs(newGroupRefs)

    startTransition(async () => {
      const result = active
        ? await addPaintToGroup(paletteId, groupId, palettePaintId)
        : await removePaintFromGroup(paletteId, groupId, palettePaintId)
      if (result?.error) {
        setGroupRefs(prevGroupRefs)
        toast.error(result.error)
      } else {
        latestConfirmedGroupRefsRef.current = newGroupRefs
      }
    })
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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
                activeGroupIds={canEdit ? getActiveGroupIds(slot.palettePaintId) : undefined}
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
            return (
              <div key={dg.dndId} className="flex flex-col gap-1">
                <PaletteGroupHeader
                  paletteId={paletteId}
                  group={dg.group}
                  canEdit={canEdit}
                  dndId={canEdit ? dg.dndId : undefined}
                />
                <div className={['flex flex-col gap-1', refs.length > 0 ? 'pl-6' : ''].filter(Boolean).join(' ')}>
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
    </DndContext>
  )
}
