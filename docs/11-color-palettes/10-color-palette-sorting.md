# Color Palette Paint Sorting

**Epic:** Color Palettes
**Type:** Feature
**Status:** Todo
**Branch:** `feature/color-palette-sorting`
**Merge into:** `v1/main`

## Summary

Add sort controls to the palette builder so owners can order their paints by name, type, hue, saturation, or lightness in ascending or descending order. Sorting is a one-time reorder operation — it builds the desired order client-side, then persists via the existing `reorderPalettePaints` action (same path as drag-and-drop). After applying a sort the user retains full drag-and-drop control. A confirmation dialog is shown before applying so a click does not silently overwrite hand-tuned ordering. When palette groups are present (see `09-color-palette-groups.md`), sorting applies within each group independently rather than across the whole palette.

## Acceptance Criteria

- [ ] The palette builder shows a sort toolbar in edit mode with a sort-field dropdown and an ascending/descending direction toggle
- [ ] Sort fields: Name (alphabetical), Type (paint_type alphabetical), Hue (numeric), Saturation (numeric), Lightness (numeric)
- [ ] Clicking "Apply sort" opens a confirmation dialog warning the user that the current paint order will be replaced
- [ ] On confirmation, paints are reordered by the chosen field and direction, positions are persisted via `reorderPalettePaints`, and the list re-renders in the new order
- [ ] On cancel, no changes are made and the dialog closes
- [ ] After applying a sort, drag-and-drop reorder continues to work normally on the sorted list
- [ ] When palette groups are present, sorting applies within each group independently (ungrouped paints are sorted among themselves)
- [ ] The sort toolbar is only shown in edit mode — it does not appear on the read-only palette detail view
- [ ] `npm run build` and `npm run lint` pass with no errors

## Implementation Plan

This feature is **client-only** — no migrations, no new server actions, no new service methods. The whole feature lives in `src/modules/palettes/` (utils + components) and reuses the existing `reorderPalettePaints` action exactly as drag-and-drop does today (`src/modules/palettes/components/palette-paint-list.tsx:106–118`).

### Step 1 — Sort utility

Create `src/modules/palettes/utils/sort-palette-paints.ts`. Pure function, no side effects.

```ts
export type PaletteSortField =
  | 'name'
  | 'paint_type'
  | 'hue'
  | 'saturation'
  | 'lightness'

export type PaletteSortDirection = 'asc' | 'desc'
```

The function signature is generic so it works against `DraggableSlot` from `palette-paint-list.tsx` (which is the structure the sort actually operates on at the UI layer):

```ts
type SortableSlot = {
  paint?: {
    name: string
    paint_type: string | null
    hue: number
    saturation: number
    lightness: number
  }
  groupId?: string | null
}

export function sortPaletteSlots<T extends SortableSlot>(
  slots: T[],
  field: PaletteSortField,
  direction: PaletteSortDirection,
): T[]
```

Sort rules per field:

- `name` — case-insensitive `localeCompare` on `paint.name`
- `paint_type` — case-insensitive `localeCompare` on `paint.paint_type` (nullable)
- `hue`, `saturation`, `lightness` — numeric subtraction on the field

Edge cases (must be deterministic):

- **Slots with `paint` undefined** ("Paint unavailable" rows) sort **last** in both directions; relative order preserved.
- **`paint_type` is `null`** sorts **last** in both directions.
- **Stable sort** — equal keys keep their original index order. Use `Array.prototype.sort` with explicit tiebreaker on original index, or use a `[index, slot]` zip pattern.

**Group-aware behavior** (forward-compatible with `09-color-palette-groups.md`): if any slot in the input has a `groupId` property defined (not `undefined`), partition slots into groups keyed by `groupId` (preserving first-seen group order). Sort each group's slice independently. Concatenate in the original group order. The `groupId === null` ("ungrouped") slice is sorted as its own partition. If no slot has a `groupId` field, fall back to flat sort.

### Step 2 — `PaletteSortBar` component

Create `src/modules/palettes/components/palette-sort-bar.tsx` — client component, local state only.

Props:

```ts
{
  onApply: (field: PaletteSortField, direction: PaletteSortDirection) => void
  disabled?: boolean
}
```

Local state: `field` (default `'name'`), `direction` (default `'asc'`).

Rendering:
1. A `<select className="select select-sm">` for the sort field with options:
   - `name` → "Name"
   - `paint_type` → "Type"
   - `hue` → "Hue"
   - `saturation` → "Saturation"
   - `lightness` → "Lightness"
2. A direction toggle `<button className="btn btn-sm btn-outline">` showing `↑ Asc` or `↓ Desc`; clicking flips between `'asc'` and `'desc'`.
3. An "Apply sort" `<button className="btn btn-sm btn-primary">` that calls `onApply(field, direction)`.

The whole bar is wrapped in a row with daisyUI-style classes consistent with the rest of the palette builder.

### Step 3 — `PaletteSortConfirmDialog` component

Create `src/modules/palettes/components/palette-sort-confirm-dialog.tsx`. Pattern mirrors `delete-palette-button.tsx`:

- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter` from `@/components/ui/dialog`
- State-controlled `open` from parent (`PalettePaintList`)
- No type-to-confirm — sort is reversible (the user can drag rows back), so a single confirm click is enough
- Uses `useTransition` (the parent owns the action call, so `isPending` here is the parent's transition state passed in as a prop — or a small internal `useTransition` if we move the action call inside the dialog)

Props:

```ts
{
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  isPending?: boolean
}
```

Body content:
- Title: "Reorder paints?"
- Description: "Applying this sort will replace your current paint order. You can still drag and drop paints after sorting."
- Cancel button (`btn btn-sm btn-ghost`, disabled when `isPending`)
- Confirm button (`btn btn-sm btn-primary`, label "Apply sort" / "Sorting…" while pending)

### Step 4 — Integrate into `PalettePaintList`

`src/modules/palettes/components/palette-paint-list.tsx`. Edit-mode-only changes — read-mode rendering stays untouched.

1. **Imports:** add `PaletteSortBar`, `PaletteSortConfirmDialog`, `sortPaletteSlots`, and the two type aliases.
2. **State:** add `pendingSort: { field: PaletteSortField; direction: PaletteSortDirection } | null` (controls dialog open).
3. **`handleApplySort(field, direction)`:** sets `pendingSort` to open the dialog. Wired to `<PaletteSortBar onApply={handleApplySort} />`.
4. **`handleConfirmSort`:**
   - `const sortedSlots = sortPaletteSlots(slots, pendingSort.field, pendingSort.direction)`
   - `const previousSlots = latestConfirmedRef.current` (existing rollback ref at line 81)
   - `setSlots(sortedSlots)`
   - Inside `startTransition`: call `reorderPalettePaints(paletteId, sortedSlots.map((s) => ({ paintId: s.paintId, note: s.note })))`. On error: `setSlots(previousSlots)` + `toast.error(result.error)`. On success: `latestConfirmedRef.current = sortedSlots`.
   - Set `pendingSort` to `null`.
5. **`handleCancelSort`:** set `pendingSort` to `null`.
6. **Render:** in the edit branch (after the `if (!canEdit)` early return), render `<PaletteSortBar>` above the existing `<DndContext>`, and render `<PaletteSortConfirmDialog open={pendingSort !== null} ... />` alongside.

The optimistic-update + rollback pattern is identical to `handleDragEnd` (lines 94–119) — sort is just a different way to compute `newSlots`. Reuse `latestConfirmedRef` as-is.

The `reorderPalettePaints` action's existing **multiset validation** (`actions/reorder-palette-paints.ts:49–60`) accepts any permutation of the current slot list. Since `sortPaletteSlots` only reorders existing entries (never adds or removes), the action will accept the sort result without any server-side changes.

### Step 5 — Group-aware integration (deferred to groups feature)

When `09-color-palette-groups` ships and `PaletteGroupedPaintList` is introduced:

- `PaletteGroupedPaintList` reuses `PaletteSortBar`, `PaletteSortConfirmDialog`, and `sortPaletteSlots` unchanged.
- The slot type used by `PaletteGroupedPaintList` will include `groupId`; `sortPaletteSlots` automatically activates the group-partitioned path.
- `palette-paint-list.tsx` remains the flat-list path (read view, plus any palette with no groups). Its slots have no `groupId`, so the same utility falls back to flat sort. No coupling between the two features beyond the shared utility.

### Affected Files

| File | Changes |
|------|---------|
| `src/modules/palettes/utils/sort-palette-paints.ts` | New — pure sort utility with group-aware partitioning |
| `src/modules/palettes/components/palette-sort-bar.tsx` | New — sort field + direction controls |
| `src/modules/palettes/components/palette-sort-confirm-dialog.tsx` | New — confirmation dialog (mirrors `delete-palette-button.tsx` dialog usage) |
| `src/modules/palettes/components/palette-paint-list.tsx` | Add sort bar + confirm dialog + sort-on-confirm logic; reuse existing `latestConfirmedRef` rollback |

### Risks & Considerations

- **No schema migration** — the entire feature is a different way to compute the input to `reorderPalettePaints`. Zero DB impact.
- **Nullable `paint_type`** — must sort consistently last in both directions to avoid jarring placement.
- **`paint` undefined ("Paint unavailable") rows** — must also sort last; do not crash on missing fields.
- **Stable sort guarantee** — modern V8 `Array.prototype.sort` is stable, but the explicit tiebreaker on original index makes the contract obvious to future readers and bulletproof against engine differences (matters for tests if we ever add them).
- **Confirm dialog reversibility** — sort is destructive to manual ordering but recoverable (the user can drag back). A single confirm click is appropriate; no type-to-confirm needed.
- **Forward compatibility with groups** — the `SortableSlot` generic constraint with optional `groupId` is the entire integration surface. When the groups feature lands, `PaletteGroupedPaintList` calls the same `sortPaletteSlots` and gets per-group sorting for free.
- **`reorderPalettePaints` already handles** auth, ownership, multiset validation, position normalization, atomic replace via `replace_palette_paints` RPC, and 4-path revalidation. The sort path adds zero new server-side surface.
