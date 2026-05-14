# Palette Sort Bar Missing from Edit Page

**Epic:** Color Palettes
**Type:** Bug
**Status:** Todo
**Branch:** `bug/palette-sort-bar-missing`
**Merge into:** `main`

## Summary

The "Color Palette Paint Sorting" feature ([`10-color-palette-sorting.md`](./10-color-palette-sorting.md)) shipped with status `Done`, including a `PaintSortBar`, a `PaletteSortConfirmDialog`, and a group-aware `sortPaletteSlots` utility. None of it shows up in the palette edit page today — owners cannot sort their paints.

The wiring is in the wrong component. The sort UI was embedded inside [`palette-paint-list.tsx`](../../src/modules/palettes/components/palette-paint-list.tsx) (the flat-list view), but [`PaletteBuilder`](../../src/modules/palettes/components/palette-builder.tsx) renders [`PaletteGroupedPaintList`](../../src/modules/palettes/components/palette-grouped-paint-list.tsx) (the grouped view). The grouped list never received the sort bar — and the flat list is no longer reached from the editor at all. The two list components diverged when [`09-color-palette-groups.md`](./09-color-palette-groups.md) introduced the grouped list, and the sort work in #10 didn't migrate with it.

This bug fixes the regression by **lifting the sort controls up to `PaletteBuilder`** and dispatching directly to `reorderPalettePaints` with group-aware sorting. The flat `PalettePaintList` becomes unreferenced and is deleted; [`PaletteDetail`](../../src/modules/palettes/components/palette-detail.tsx) is updated to always render `PaletteGroupedPaintList` (which already handles the zero-groups case).

## Expected Behavior

1. On `/user/palettes/[id]/edit`, owners see a `PaintSortBar` and an "Apply sort" button above the paint list, just like the acceptance criteria in [`10-color-palette-sorting.md`](./10-color-palette-sorting.md) describe.
2. Clicking "Apply sort" opens the existing `PaletteSortConfirmDialog`; on confirm, the paints are reordered by the chosen field/direction and the new order is persisted via `reorderPalettePaints`.
3. When the palette has groups, sorting applies **within each group independently** (and within the ungrouped section). The existing `sortPaletteSlots` utility already handles this.
4. Drag-and-drop reorder continues to work normally after a sort.
5. The read-only `/palettes/[id]` page renders no sort UI — it only ever did in edit mode.

## Actual Behavior

1. The edit page renders `PaletteGroupedPaintList` directly, with no sort bar above it. Owners have no way to sort.
2. `PalettePaintList` still contains the sort bar wiring, but the editor never mounts it — it's only reachable from `PaletteDetail` when the palette has zero groups (read-only, `canEdit={false}`), and the read-only branch early-returns before the sort UI renders.
3. The `sortPaletteSlots` utility's group-aware code path has therefore never been exercised in production.

## Root Cause

**Component drift.** Two list components exist:

- [`palette-paint-list.tsx`](../../src/modules/palettes/components/palette-paint-list.tsx) — flat list; contains the sort bar + confirm dialog at lines 184–208 and the `handleConfirmSort` logic at lines 131–152.
- [`palette-grouped-paint-list.tsx`](../../src/modules/palettes/components/palette-grouped-paint-list.tsx) — grouped list; **no sort UI at all**.

[`PaletteBuilder`](../../src/modules/palettes/components/palette-builder.tsx) renders `PaletteGroupedPaintList` unconditionally:

```tsx
<PaletteGroupedPaintList
  paletteId={palette.id}
  paints={palette.paints}
  groups={palette.groups}
  canEdit
/>
```

So the sort UI sitting inside `PalettePaintList` is effectively dead code for editor users.

The two lists also share the same persistence call (`reorderPalettePaints` accepts `{ paintId, note, groupId? }[]`), and the group-aware `sortPaletteSlots` is already written for the grouped case. Nothing about the action or utility needs to change — only the UI wiring.

## Acceptance Criteria

- [ ] On `/user/palettes/[id]/edit`, the `PaintSortBar` and "Apply sort" button are visible above the paint list for the owner.
- [ ] Clicking "Apply sort" opens `PaletteSortConfirmDialog`; confirm persists the new order; cancel does nothing.
- [ ] Sorting a palette with groups sorts each group's paints independently; ungrouped paints sort among themselves; group order is preserved.
- [ ] Sorting a palette with **no** groups sorts the flat list of paints end-to-end.
- [ ] Drag-and-drop reorder keeps working after a sort.
- [ ] On `/palettes/[id]` (read-only), no sort UI is shown — `canEdit={false}` is honored.
- [ ] `PalettePaintList` is deleted; `PaletteDetail` renders `PaletteGroupedPaintList` for both the grouped and ungrouped cases.
- [ ] `npm run build` and `npm run lint` pass with no errors.

## Out of Scope

- Changing the sort field set, direction toggle behavior, or the confirm-dialog copy. The reusable surface from #10 stays as-is.
- Adding a per-group "Sort this group" affordance. The bar sorts every group at once (matching #10 acceptance).
- Persisting the user's last-used sort field/direction across sessions. Sort state remains local to the editor instance.
- Adding `UNIQUE (palette_id, paint_id)` enforcement or any schema change. The fix is UI-only.

## Key Files

| Action | File | Description |
|--------|------|-------------|
| Modify | `src/modules/palettes/components/palette-builder.tsx` | Lift the sort state + sort bar + confirm dialog here, above `<PaletteGroupedPaintList>`. Build the sort handler that calls `sortPaletteSlots(palette.paints, ...)` and dispatches `reorderPalettePaints`. |
| Modify | `src/modules/palettes/components/palette-grouped-paint-list.tsx` | Accept the sort UI as a sibling, not a child. No internal changes required — the existing `useEffect` on `paints` already re-seeds the optimistic state when the server returns the new order. |
| Modify | `src/modules/palettes/components/palette-detail.tsx` | Replace the `palette.groups.length > 0 ? <Grouped /> : <Flat />` ternary with a single `<PaletteGroupedPaintList canEdit={false} />`. The grouped list already handles the empty-groups case (the ungrouped section becomes the only section, no group header is rendered). |
| Delete | `src/modules/palettes/components/palette-paint-list.tsx` | No remaining references after `PaletteDetail` is updated. Its sort logic is replaced by the lifted handler in `PaletteBuilder`. |
| Modify | `docs/11-color-palettes/10-color-palette-sorting.md` | Add a note in _Risks & Considerations_ or _Notes_ pointing to this bug doc: "The sort UI was originally embedded in `palette-paint-list.tsx`; bug 14 lifts it into `PaletteBuilder` after #09 made the grouped list the editor's default." |

## Implementation

### Step 1 — Lift sort state and handler into `PaletteBuilder`

`palette-builder.tsx` becomes a client component (`'use client'`) and owns the sort state. It computes the sorted order on confirm, dispatches `reorderPalettePaints`, and lets the grouped list's existing `useEffect([paints])` re-seed from the revalidated server state on success.

```tsx
'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import type { Palette } from '@/modules/palettes/types/palette'
import type { PaintSortDirection, PaintSortField } from '@/modules/paints/utils/sort-paints'
import { PaintSortBar } from '@/modules/paints/components/paint-sort-bar'
import { reorderPalettePaints } from '@/modules/palettes/actions/reorder-palette-paints'
import { sortPaletteSlots } from '@/modules/palettes/utils/sort-palette-slots'
import { PaletteForm } from '@/modules/palettes/components/palette-form'
import { PaletteGroupedPaintList } from '@/modules/palettes/components/palette-grouped-paint-list'
import { PaletteSortConfirmDialog } from '@/modules/palettes/components/palette-sort-confirm-dialog'
import { PaletteEmptyState } from '@/modules/palettes/components/palette-empty-state'
import { DeletePaletteButton } from '@/modules/palettes/components/delete-palette-button'

export function PaletteBuilder({ palette }: { palette: Palette }) {
  const [sortField, setSortField] = useState<PaintSortField>('name')
  const [sortDirection, setSortDirection] = useState<PaintSortDirection>('asc')
  const [pendingSort, setPendingSort] = useState<{
    field: PaintSortField
    direction: PaintSortDirection
  } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleConfirmSort() {
    if (!pendingSort) return
    const sorted = sortPaletteSlots(palette.paints, pendingSort.field, pendingSort.direction)
    setPendingSort(null)
    startTransition(async () => {
      const result = await reorderPalettePaints(
        palette.id,
        sorted.map((s) => ({ paintId: s.paintId, note: s.note, groupId: s.groupId })),
      )
      if (result?.error) toast.error(result.error)
    })
  }

  return (
    <div className="card card-body flex flex-col gap-6">
      <div>
        <h2 className="mb-4 text-lg font-semibold">Details</h2>
        <PaletteForm palette={palette} />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Paints</h2>

        {palette.paints.length > 0 && (
          <div className="mb-3 flex items-center gap-2">
            <PaintSortBar
              field={sortField}
              direction={sortDirection}
              onChange={(f, d) => {
                setSortField(f)
                setSortDirection(d)
              }}
              disabled={isPending}
            />
            <button
              type="button"
              onClick={() => setPendingSort({ field: sortField, direction: sortDirection })}
              className="btn btn-sm btn-outline"
              disabled={isPending}
            >
              Apply sort
            </button>
          </div>
        )}

        {palette.paints.length === 0 && <PaletteEmptyState variant="owner" />}

        <PaletteGroupedPaintList
          paletteId={palette.id}
          paints={palette.paints}
          groups={palette.groups}
          canEdit
        />

        <PaletteSortConfirmDialog
          open={pendingSort !== null}
          onConfirm={handleConfirmSort}
          onCancel={() => setPendingSort(null)}
          isPending={isPending}
        />
      </div>

      <div className="flex justify-end border-t border-border pt-4">
        <DeletePaletteButton palette={palette} />
      </div>
    </div>
  )
}
```

**Why not duplicate the optimistic-rollback machinery from `palette-paint-list.tsx`?** The grouped list already owns its own optimistic state (`slots` + `latestConfirmedSlotsRef` + `useEffect([paints])` re-seed at lines 90–107 of `palette-grouped-paint-list.tsx`). When the server action returns and `revalidatePath('/user/palettes/${id}/edit')` fires, the `Palette` prop updates and the grouped list re-seeds from the new server order. On error, the list rolls back via the existing drag-end pattern is not invoked — but since we never wrote optimistic state at the builder level, there is nothing to roll back. A failed sort surfaces a toast and leaves the list as-is (pre-sort). This is intentionally simpler than the per-drag rollback, because sort is a one-shot user action with a confirm dialog in front of it — the user is not mid-interaction, so a refresh-on-error UX is acceptable.

If a future iteration wants instant optimistic feedback before the action returns, the cleanest path is to add an optional `optimisticOrder?: PalettePaint[]` prop on `PaletteGroupedPaintList` that overrides its `useState` seed. Out of scope for this bug.

### Step 2 — Update `PaletteDetail` to use the grouped list for both cases

`palette-detail.tsx` currently branches on `palette.groups.length > 0`. The grouped list already handles `groups.length === 0` correctly: it renders the ungrouped section as the only section and omits the "Ungrouped" header (`draggableGroups.length > 0 &&` at line 347). Collapse the branch:

```tsx
{palette.paints.length > 0 ? (
  <PaletteGroupedPaintList
    paletteId={palette.id}
    paints={palette.paints}
    groups={palette.groups}
    canEdit={false}
  />
) : (
  <PaletteEmptyState variant="guest" />
)}
```

Remove the `import { PalettePaintList } from '@/modules/palettes/components/palette-paint-list'` line.

### Step 3 — Delete `PalettePaintList`

After Step 2, search for remaining imports of `palette-paint-list`:

```bash
rg "palette-paint-list" src/
```

There should be none. Delete the file. The sort UI and `handleConfirmSort` logic that used to live there are now lifted into `PaletteBuilder` (Step 1).

### Step 4 — Cross-reference the original sorting doc

Append a one-line note to `docs/11-color-palettes/10-color-palette-sorting.md` under _Notes_ or at the end of _Risks & Considerations_:

> The sort UI originally lived inside `palette-paint-list.tsx` (the flat list). After [`09-color-palette-groups.md`](./09-color-palette-groups.md) made `PaletteGroupedPaintList` the editor's default list component, the sort UI was no longer reachable from the editor; [`14-palette-sort-bar-missing.md`](./14-palette-sort-bar-missing.md) lifts it into `PaletteBuilder` and retires `palette-paint-list.tsx`.

This makes the regression discoverable from the original feature doc so future readers don't repeat the mistake.

### Step 5 — Manual QA checklist

- Open `/user/palettes/[id]/edit` for a palette with **no groups** and 3+ paints with diverse names/hues → sort bar visible; pick "Hue" + "↓ Desc"; click "Apply sort"; confirm dialog opens; confirm → paints reorder by hue descending. Refresh: order persists.
- Open `/user/palettes/[id]/edit` for a palette with **2+ groups, each with 2+ paints** → sort by "Name" + "↑ Asc"; confirm → each group's paints sort alphabetically *within the group*; group order itself is unchanged; ungrouped section also sorts internally.
- After applying a sort, drag a paint to a new position within the same group → reorder persists (no regression of the drag flow).
- After applying a sort, drag a paint to a different group → cross-group move works (no regression).
- Open `/palettes/[id]` (read-only) for any palette → no sort bar visible.
- Open `/palettes/[id]` for a palette with no groups → still renders correctly (grouped list with the lone ungrouped section).
- Trigger a sort while the action is in flight (rapid double click on "Apply sort") → the `disabled={isPending}` flag on both controls prevents stacking.
- Force a server failure (e.g., temporarily revoke ownership in dev tools, retry sort) → red toast appears, list stays in its pre-sort order.
- `npm run build` + `npm run lint`.

## Risks & Considerations

- **No optimistic feedback on the sort itself**: with the lifted handler, the UI does not visibly reorder until the server action returns and `revalidatePath` flushes new props down into `PaletteGroupedPaintList`. On a healthy local network this is ~100–300ms — fine for a confirm-then-apply flow with a dialog in front of it. If this feels sluggish in practice, follow up by exposing an `optimisticOrder` prop on `PaletteGroupedPaintList` as noted in Step 1.
- **Deleting `PalettePaintList` is a one-way door for any external consumer**: grep confirms it is only consumed by `PaletteDetail`. The deletion is safe so long as Step 2 is committed in the same change.
- **Read-only grouped rendering for a palette with no groups**: `PaletteGroupedPaintList` was already used by `PaletteDetail` in the `groups.length > 0` branch — but the `groups.length === 0` branch on read-only has not previously been exercised through this component. The component already early-returns null on empty ungrouped sections when `!canEdit` (line 273); for a non-empty ungrouped section the read-only render path is straightforward. Verify with a palette that has paints but zero groups.
- **`reorderPalettePaints` accepts `groupId`**: the action's `ReorderInput` type already includes optional `groupId`, and the multiset-permutation validation accepts any ordering of existing `(paintId, groupId)` pairs. No server-side changes needed.
- **`PaletteGroupedPaintList` doesn't expose its current optimistic state**: that's intentional. The lifted sort handler operates on `palette.paints` (the server snapshot), not on the list's local `slots` state. If a user has an in-flight drag and clicks "Apply sort" before the drag's revalidate lands, the sort will operate on stale server data. This is an extremely narrow race; the confirm dialog and 100–300ms revalidate roundtrip make it nearly unreachable. Documented as a known minor risk — not worth solving with cross-component state plumbing.

## Notes

- The `sortPaletteSlots` utility, `PaintSortBar`, and `PaletteSortConfirmDialog` are unchanged. The fix is purely re-wiring + deletion.
- This bug is a good reminder to update _existing_ feature surfaces when introducing a new component that supersedes them. The grouped-list PR could have either ported the sort UI in the same change or scheduled this follow-up. Recording it here so the lesson is captured alongside the fix.
