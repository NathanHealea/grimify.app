# Palette Edit UX Improvements

**Epic:** Color Palettes
**Type:** Enhancement
**Status:** Completed
**Branch:** `epic/palette-edit-ux`
**Merge into:** `main`

## Summary

The palette edit page is used for rapid, iterative palette building. Three UX issues disrupt that flow:

1. **Group toggle page refresh** — `PalettePaintGroupsToggle` calls `router.refresh()` after each membership change, causing a visible page jump that interrupts editing.
2. **Group drag visual** — When dragging a group, all its member paint rows are rendered in the drag ghost, making it hard to see where to drop. The placeholder left behind also shows full content.
3. **No cross-zone drag** — Users cannot drag a master-list paint directly into a group. They must use the Groups dropdown toggle instead, which is slower.

## Acceptance Criteria

- [x] Toggling a paint's group membership (via the Groups dropdown) causes no page jump or full refresh — the UI updates in place.
- [x] When dragging a group header, the dragged ghost shows only the group name and a paint-count badge.
- [x] The group's placeholder in the list (the "hole" left behind) shows only an outlined group header shell — no paint rows.
- [x] A master-list paint can be dragged and dropped onto a group header or into a group's paint list, adding it to that group optimistically.
- [x] All existing drag-to-reorder behaviour (master list, within-group, group order) continues to work correctly.
- [x] No `router.refresh()` calls remain in the paint-group membership components.

## Implementation Steps

### Group 1: Lift group membership state — eliminate router.refresh()

1. In `PaletteGroupedPaintList`, derive `activeGroupIds` from the existing `groupRefs` state map (already maintained locally) and pass it as a prop-equivalent down to `PalettePaintRow` and `PalettePaintGroupsToggle` — replacing the current approach of computing it from `groupRefs` via `getActiveGroupIds()`. No structural change needed; `getActiveGroupIds` already reads from `groupRefs`.
2. In `PalettePaintGroupsToggle`, remove `useRouter` and the `router.refresh()` call. Instead, accept an `onToggle` callback prop `(groupId: string, active: boolean) => void` that the parent calls to update its local `groupRefs` state after a successful server action.
3. In `PaletteGroupedPaintList`, implement the `handleGroupToggle` function: optimistically update `groupRefs` (add or remove the `GroupRefDraggable` entry), call `addPaintToGroup` or `removePaintFromGroup`, and roll back on error via toast.
4. Wire `onToggle={handleGroupToggle}` into every `PalettePaintGroupsToggle` rendered inside `PalettePaintRow` — thread it through `PalettePaintRow` as a new optional prop.

### Group 2: Group drag visual — DragOverlay + outline placeholder

5. Add `onDragStart` to the `DndContext` in `PaletteGroupedPaintList`. Track `activeDndId` in state. On `onDragEnd`, clear it.
6. Import `DragOverlay` from `@dnd-kit/core`. Inside `DndContext`, render a `DragOverlay` that checks whether `activeDndId` matches a `draggableGroup`. If so, render a lightweight drag ghost: the group name + a `(N paints)` badge. Otherwise render nothing (paint-row drags keep their default dnd-kit ghost).
7. In `PaletteGroupHeader`, when `isDragging` is true, render only the outlined shell (border-dashed container with the group name as muted text and paint count badge) — hide the rename input and delete button. The paint count should be passed as a new prop `paintCount: number`.
8. In `PaletteGroupedPaintList`, pass `paintCount={refs.length}` to each `PaletteGroupHeader`.

### Group 3: Cross-zone drag — master paint into a group

9. Add `onDragOver` to `DndContext`. When the active item is a master-list paint (`activeMasterIdx !== -1`) and the `over` id matches a group header `dndId` or a group-ref `dndId`, highlight the target group (track `overGroupId` in state and apply a highlight class to that group's container).
10. In `handleDragEnd`, after the existing group-reorder and master-list-reorder checks, add a cross-zone case: if the active item is a master paint and `over.id` is a group header or group-ref dnd id, resolve the target `groupId`, optimistically push a new `GroupRefDraggable` into `groupRefs` for that group, call `addPaintToGroup`, and roll back on error.
11. Update the `DragOverlay` to also render a paint swatch ghost (color square + paint name) when the active item is a master paint being dragged over a group — giving visual confirmation that a cross-zone drop is in progress.

## Key Files

- `src/modules/palettes/components/palette-grouped-paint-list.tsx` — main DnD context; owns master, groupRefs, and draggableGroups state
- `src/modules/palettes/components/palette-paint-groups-toggle.tsx` — dropdown toggle; remove router.refresh(), add onToggle callback
- `src/modules/palettes/components/palette-paint-row.tsx` — thread onToggle prop through to the toggle component
- `src/modules/palettes/components/palette-group-header.tsx` — isDragging outline + paintCount prop
