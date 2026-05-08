# Color Palette Paint Sorting

**Epic:** Color Palettes
**Type:** Feature
**Status:** Todo
**Branch:** `feature/color-palette-sorting`
**Merge into:** `v1/main`

## Summary

Add sort controls to the palette builder so owners can order their paints by name, type, hue, saturation, or lightness in ascending or descending order. Sorting is a one-time reorder operation — it updates the underlying paint positions (via the existing `reorderPalettePaints` path) and then the user retains full drag-and-drop control over the resulting order. A confirmation dialog is shown before applying the sort to prevent accidental reordering. When palette groups are present (see `09-color-palette-groups.md`), sorting applies within each group independently rather than across the whole palette.

## Acceptance Criteria

- [ ] The palette builder shows a sort toolbar in edit mode with a sort-field dropdown and an ascending/descending direction toggle
- [ ] Sort fields: Name (alphabetical), Type (paint_type alphabetical), Hue (numeric), Saturation (numeric), Lightness (numeric)
- [ ] Clicking "Apply Sort" shows a confirmation dialog warning the user that their current paint order will be replaced
- [ ] On confirmation, paints are reordered by the chosen field and direction, positions are persisted, and the list re-renders in the new order
- [ ] On cancel, no changes are made
- [ ] After applying a sort, drag-and-drop reorder continues to work normally on the sorted list
- [ ] When palette groups are present, sorting applies within each group independently (ungrouped paints are sorted among themselves)
- [ ] The sort toolbar is only shown in edit mode — it does not appear on the read-only palette detail view
- [ ] `npm run build` and `npm run lint` pass with no errors

## Implementation Plan

### Step 1 — Sort utility

Create `src/modules/palettes/utils/sort-palette-paints.ts`.

This is a pure function that takes an array of paint slots and returns a new sorted array. It has no side effects.

```ts
export type PaletteSortField = 'name' | 'paint_type' | 'hue' | 'saturation' | 'lightness'
export type PaletteSortDirection = 'asc' | 'desc'
```

Sort logic per field:
- `name` — case-insensitive string compare on `paint.name`
- `paint_type` — case-insensitive string compare on `paint.paint_type` (nulls sort last)
- `hue` — numeric compare on `paint.hue`
- `saturation` — numeric compare on `paint.saturation`
- `lightness` — numeric compare on `paint.lightness`

**Group-aware behaviour** (forward-compatible with `09-color-palette-groups`): if any slot in the array has a `groupId` property, partition slots by `groupId`, sort each partition independently, then concatenate (preserving group order). Ungrouped slots (`groupId === null` or absent) are sorted among themselves as a final group.

The function signature must stay generic enough to accept `DraggableSlot` from `palette-paint-list.tsx` (or any future equivalent in `palette-grouped-paint-list.tsx`). Keep the slot type parameter as a generic constrained to `{ paint?: { name: string; paint_type: string | null; hue: number; saturation: number; lightness: number }; groupId?: string | null }`.

### Step 2 — `PaletteSortBar` component

Create `src/modules/palettes/components/palette-sort-bar.tsx` — a client component (no server state needed).

Props:
- `onApply: (field: PaletteSortField, direction: PaletteSortDirection) => void`

Renders:
1. A `<select>` (or daisyUI `select` class) for the sort field with labels:
   - `name` → "Name"
   - `paint_type` → "Type"
   - `hue` → "Hue"
   - `saturation` → "Saturation"
   - `lightness` → "Lightness"
2. A direction toggle button (↑ Asc / ↓ Desc) that flips between `'asc'` and `'desc'`
3. An "Apply Sort" button that calls `onApply(field, direction)`

Local state: `field` (default `'name'`) and `direction` (default `'asc'`).

### Step 3 — `PaletteSortConfirmDialog` component

Create `src/modules/palettes/components/palette-sort-confirm-dialog.tsx`.

Uses the existing `Dialog` / `DialogContent` / `DialogHeader` / `DialogFooter` primitives from `@/components/ui/dialog`.

Props:
- `open: boolean`
- `onConfirm: () => void`
- `onCancel: () => void`

Renders a dialog with:
- Title: "Reorder paints?"
- Body: "Applying this sort will replace your current paint order. You can still drag and drop paints after sorting."
- Cancel button (calls `onCancel`)
- Confirm button (calls `onConfirm`)

### Step 4 — Integrate into `PalettePaintList`

`src/modules/palettes/components/palette-paint-list.tsx` changes:

1. Import `PaletteSortBar`, `PaletteSortConfirmDialog`, and `sortPaletteSlots` + types.
2. Add local state: `pendingSort: { field: PaletteSortField; direction: PaletteSortDirection } | null` (controls dialog visibility).
3. When `PaletteSortBar.onApply` fires: set `pendingSort` to open the dialog.
4. On dialog confirm:
   - Compute `sortedSlots = sortPaletteSlots(slots, pendingSort.field, pendingSort.direction)`
   - Update `slots` state with the new order
   - Update `latestConfirmedRef`
   - Call `reorderPalettePaints` via `startTransition` with the new positions (same path as drag-and-drop)
   - Clear `pendingSort`
5. On dialog cancel: clear `pendingSort`.
6. Render `<PaletteSortBar>` above the DnD list (inside the edit-mode branch only).
7. Render `<PaletteSortConfirmDialog>` controlled by `pendingSort !== null`.

The optimistic update + rollback pattern already in `handleDragEnd` applies here too — if `reorderPalettePaints` errors, roll back slots to `latestConfirmedRef.current` and show a toast.

### Step 5 — Group-aware follow-up (deferred to groups feature)

When `09-color-palette-groups` is implemented and `PaletteGroupedPaintList` is introduced, that component's sort integration can reuse `PaletteSortBar`, `PaletteSortConfirmDialog`, and `sortPaletteSlots` unchanged. The `groupId` property on `DraggableSlot` will activate the group-partitioned sort path in `sortPaletteSlots` automatically.

No changes are needed to `palette-paint-list.tsx` at that point — it remains the flat-list path (used in the read view and any non-grouped palette).

### Affected Files

| File | Changes |
|------|---------|
| `src/modules/palettes/utils/sort-palette-paints.ts` | New — sort utility |
| `src/modules/palettes/components/palette-sort-bar.tsx` | New — sort field + direction controls |
| `src/modules/palettes/components/palette-sort-confirm-dialog.tsx` | New — confirmation dialog |
| `src/modules/palettes/components/palette-paint-list.tsx` | Add sort bar + dialog + sort-on-confirm logic |

### Risks & Considerations

- No schema migration required — sort is a client-side reorder using the existing `reorderPalettePaints` action.
- The `paint_type` field is nullable (`string | null`). Nulls must sort consistently (last in both `asc` and `desc`) to avoid unexpected ordering.
- Paints with `paint?.paint` undefined (the "Paint unavailable" rows) must be handled gracefully — sort them last or maintain their relative position.
- The `reorderPalettePaints` action currently accepts `Array<{ paintId: string; note: string | null }>`. The sort simply re-orders the same set, so this is a safe call.
- When the groups feature ships, `PaletteGroupedPaintList` will need its own sort integration using the same utilities. Document this dependency in the groups feature doc so it doesn't get missed.
