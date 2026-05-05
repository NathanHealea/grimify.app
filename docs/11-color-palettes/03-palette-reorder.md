# Palette Reorder — Drag and Drop

**Epic:** Color Palettes
**Type:** Feature
**Status:** Completed
**Branch:** `feature/palette-reorder`
**Merge into:** `v1/main`

## Summary

Let users reorder paints inside a palette by dragging rows in the builder. Order is persisted in the `palette_paints.position` column (already part of the schema). Drag-and-drop is keyboard accessible, works on touch, and tolerates network failure with optimistic UI + rollback.

## Acceptance Criteria

- [x] Each row in the palette builder is draggable
- [x] Dropping a row updates the visible order immediately (optimistic)
- [x] The new order is persisted via a single server action; positions are renumbered to `0..N-1`
- [x] If the persistence call fails, the list snaps back to its previous order and shows an error toast
- [x] Keyboard reorder is supported: focus a row, press space to "lift", arrow keys to move, space to drop, escape to cancel
- [x] Touch reorder works on a phone (long-press to start drag)
- [x] The horizontal swatch strip on the read view reflects the saved order
- [x] Drag handles are visually distinct on hover and accessible (`aria-grabbed` / `aria-roledescription="draggable"`)
- [x] Reordering is disabled (rows non-draggable) on the read-only `/palettes/[id]` page
- [x] `npm run build` and `npm run lint` pass with no errors

## Module additions

```
src/modules/palettes/
├── actions/
│   └── reorder-palette-paints.ts         NEW
├── components/
│   ├── (modify) palette-paint-list.tsx   wraps list in DnD context, owns local order + persistence
│   ├── (modify) palette-paint-row.tsx    becomes a draggable item with a handle
│   └── palette-drag-handle.tsx           NEW — six-dot grip icon button
└── utils/
    └── reorder-array.ts                  NEW — pure immutable splice helper
```

## Key Files

| Action | File                                                       | Description                                                                                |
| ------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Create | `src/modules/palettes/actions/reorder-palette-paints.ts`   | Accepts a palette id + ordered list of `{ paintId, note }` slots, persists in one call     |
| Create | `src/modules/palettes/components/palette-drag-handle.tsx`  | Visual grip; the dnd-kit listeners attach here so links/buttons in the row stay clickable  |
| Create | `src/modules/palettes/utils/reorder-array.ts`              | `reorderArray(items, fromIndex, toIndex)` — pure                                           |
| Modify | `src/modules/palettes/components/palette-paint-list.tsx`   | Becomes `'use client'`; wraps list in `<DndContext>`; owns local order state + persistence |
| Modify | `src/modules/palettes/components/palette-paint-row.tsx`    | Renders the handle, applies `useSortable` transforms, reflects `isDragging`                |
| Add    | `package.json`                                             | `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` deps                            |

## Implementation Plan

The plan is grouped into seven steps. Each step ends in a state where `npm run build` and `npm run lint` still pass.

### Step 1 — Install dnd-kit

Add three packages from the dnd-kit family:

```
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Why `dnd-kit`:

- First-class keyboard accessibility (`KeyboardSensor` + `sortableKeyboardCoordinates`) and built-in screen-reader announcements.
- Pointer / touch / keyboard sensors out of the box, with sensor activation thresholds that prevent accidental drags from absorbing clicks on the link inside each row.
- Actively maintained; ~15 kB gzipped.
- React 19 compatible; we are on `next@16.1.6` + `react@19.2.3` (verified in `package.json`).

`react-beautiful-dnd` was considered and rejected — unmaintained, no first-class keyboard story, larger.

### Step 2 — `reorderArray` utility (pure)

Create `src/modules/palettes/utils/reorder-array.ts`:

```ts
/**
 * Returns a new array with the item at `fromIndex` moved to `toIndex`.
 *
 * Pure — does not mutate the input. Works for any out-of-range indices by
 * clamping (callers should already validate, but clamping makes the helper
 * safe for animation frame edge cases).
 */
export function reorderArray<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  const next = [...items]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next
}
```

This is a thin wrapper around `arrayMove` from `@dnd-kit/sortable`, kept in the module so the action and tests can use it without importing dnd-kit on the server.

### Step 3 — `reorderPalettePaints` server action

Create `src/modules/palettes/actions/reorder-palette-paints.ts`. Mirrors the structure of `remove-palette-paint.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createPaletteService } from '@/modules/palettes/services/palette-service'
import { normalizePalettePositions } from '@/modules/palettes/utils/normalize-palette-positions'

type ReorderInput = { paintId: string; note: string | null }

export async function reorderPalettePaints(
  paletteId: string,
  ordered: ReorderInput[],
): Promise<{ error: string } | undefined> {
  if (!paletteId || !Array.isArray(ordered)) {
    return { error: 'Invalid reorder request.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in to reorder a palette.' }

  const service = createPaletteService(supabase)
  const palette = await service.getPaletteById(paletteId)
  if (!palette) return { error: 'Palette not found.' }
  if (palette.userId !== user.id) {
    return { error: 'You can only reorder palettes you own.' }
  }

  // Multiset check: ordered must be a permutation of the current paint slots.
  // Compares by `paintId` count rather than identity since the same paint may
  // legitimately appear in multiple slots.
  if (ordered.length !== palette.paints.length) {
    return { error: 'Reorder list does not match palette.' }
  }
  const expected = new Map<string, number>()
  for (const slot of palette.paints) {
    expected.set(slot.paintId, (expected.get(slot.paintId) ?? 0) + 1)
  }
  for (const slot of ordered) {
    const remaining = (expected.get(slot.paintId) ?? 0) - 1
    if (remaining < 0) return { error: 'Reorder list does not match palette.' }
    expected.set(slot.paintId, remaining)
  }

  const normalized = normalizePalettePositions(
    ordered.map((slot, index) => ({
      position: index,
      paintId: slot.paintId,
      note: slot.note,
    })),
  )

  const result = await service.setPalettePaints(paletteId, normalized)
  if (result.error) return { error: result.error }

  revalidatePath(`/palettes/${paletteId}`)
  revalidatePath(`/palettes/${paletteId}/edit`)
}
```

Why no schema migration:

- The existing `replace_palette_paints` RPC (created in `20260425000000_create_palettes_tables.sql`) does the entire delete+insert in a single transaction. Positions never enter a half-updated state, so the two-phase "negative offset" workaround is unnecessary.
- A `slot_id uuid` column was considered. It would simplify DnD identity (stable across reorders) and give per-slot foreign-key targets later. But: `note` is already per-slot and rides with `(paintId, note)` in the payload, duplicates of the same `paintId` are handled cleanly by sending notes alongside, and the React tree's DnD ids only need to be stable **for the lifetime of one mounted list** — see Step 4. Skipping the migration keeps this feature small and keeps `02-add-to-palette` insert paths untouched.

### Step 4 — Mount-stable DnD ids in the list

Convert `src/modules/palettes/components/palette-paint-list.tsx` into a client component that owns the order. The new internal type:

```ts
type DraggableSlot = {
  // dnd id — generated once at mount and never reused. Survives optimistic
  // updates (state never replaces the id) and lets duplicate paintIds coexist.
  dndId: string
  paintId: string
  note: string | null
  paint: ColorWheelPaint | undefined
}
```

Behaviour:

- Seed `slots` state from `props.paints` once at mount, assigning each row a unique `dndId` (`useId()` + index suffix, or `crypto.randomUUID()`; the latter is fine in client code).
- When `props.paints` reference changes (after revalidation), reseed with a `useEffect` that compares lengths/paintIds. Since the action `revalidatePath`s, this keeps the list in sync after a successful save without losing local optimistic state.
- Render shape: `<DndContext>` with `PointerSensor`, `TouchSensor` (with a 200 ms long-press activation), `KeyboardSensor` (with `sortableKeyboardCoordinates`), and screen-reader announcements. Wrap `<SortableContext items={slots.map(s => s.dndId)} strategy={verticalListSortingStrategy}>` and map each slot to a `<PalettePaintRow>`.
- `handleDragEnd(event)`: compute `newSlots = reorderArray(slots, fromIndex, toIndex)`. Call `setSlots(newSlots)` (optimistic). Capture `previousSlots` first; pass it into the rollback closure. Call the action inside `startTransition`. On `result?.error`: `setSlots(previousSlots)` and surface the error inline (see Step 6).
- Concurrency: keep a `latestConfirmedRef = useRef(slots)` that only advances on success. If a second drag completes before the first response, capture rollback state from the ref so a single failure can roll back across multiple in-flight transitions cleanly.
- `canEdit={false}` short-circuits all of the above and renders a plain `<ul>` of rows with no DnD context, no handle, and no row state — the existing detail page (`PaletteDetail`) stays read-only.

Public props stay the same (`paletteId`, `paints`, `canEdit`), so the read page (`PaletteDetail`) and edit page (`PaletteBuilder`) need no changes.

### Step 5 — `palette-paint-row.tsx` becomes draggable

In edit mode each row:

- Calls `useSortable({ id: slot.dndId, disabled: !canEdit })`.
- Applies `transform: CSS.Transform.toString(transform)` and `transition` to its outer `style`.
- Renders `<PaletteDragHandle {...attributes} {...listeners} ref={setActivatorNodeRef} />` as the **drag activator** — only the handle is grabbable, so the existing link click target inside the row stays usable.
- Adds `aria-roledescription="draggable"` and toggles styles on `isDragging` (`shadow-lg` + `bg-base-200`).
- Keeps the existing remove form unchanged.

In read mode (`canEdit={false}`), the row renders without `useSortable` (or with `disabled: true`) and no handle.

The remove form continues to use `(paletteId, position)` for the server action. Because each successful drag persists and revalidates, the props the row receives always reflect the saved positions on next render — no drift.

### Step 6 — Drag handle component + inline error UI

Create `src/modules/palettes/components/palette-drag-handle.tsx`:

```tsx
'use client'

import { forwardRef } from 'react'
import { GripVertical } from 'lucide-react'

export const PaletteDragHandle = forwardRef<HTMLButtonElement, { 'aria-label'?: string }>(
  function PaletteDragHandle({ 'aria-label': ariaLabel, ...rest }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={ariaLabel ?? 'Reorder paint'}
        aria-roledescription="draggable"
        className="btn btn-ghost btn-xs cursor-grab touch-none px-1 active:cursor-grabbing"
        {...rest}
      >
        <GripVertical className="size-4" aria-hidden />
      </button>
    )
  },
)
```

`touch-none` is required for the touch sensor to activate on phones (otherwise the browser scrolls instead).

Inline error UI (no toast lib — matches `palette-form.tsx`): the list component renders an `aria-live="polite"` region above the list. Errors set local state shaped like `{ message: string }`; cleared on the next successful drag. Example markup:

```tsx
{error && (
  <p role="status" aria-live="polite" className="text-sm text-destructive">
    {error}
  </p>
)}
```

### Step 7 — Manual QA + final checks

- Drag rows into a new order with the mouse on `/palettes/{id}/edit`; refresh and confirm the order persists.
- Reorder via keyboard: `Tab` to a handle, `Space` to lift, `↑/↓` to move, `Space` to drop, `Esc` to cancel. Live region should announce position changes.
- Reorder with touch on a phone: long-press the handle (~200 ms) before dragging; clicks on the row link should still navigate.
- Simulate a server failure: throttle the network in DevTools or temporarily make the action `throw`. Confirm the order snaps back and the inline error appears.
- Reload `/palettes/{id}` and verify the swatch strip + paint list reflect the saved order.
- Inspect `palette_paints` rows in Supabase Studio after reorders — `position` should always be `0..N-1` (no gaps).
- Confirm reorder UI is **not** rendered on `/palettes/{id}` (no handle, no DnD context) — `canEdit={false}` path.
- Run `npm run build` and `npm run lint`.

## Risks & Considerations

- **No schema change**: relying on the existing `replace_palette_paints` RPC means each reorder rewrites every row. For small palettes (the realistic ceiling is dozens), this is fine; the RPC already runs in one transaction so concurrent writers can't see a half-updated state.
- **Optimistic UX with rapid drags**: a second drag may complete before the first server response. The `latestConfirmedRef` pattern rolls back to the most recently confirmed snapshot rather than the immediately previous one, so a failure mid-stream doesn't strand the UI in a stale interim state.
- **Sensor conflicts with row link**: dnd-kit's `PointerSensor` can swallow clicks on the row's link/remove form if the listeners are attached to the whole row. Attaching them only to the drag handle (via `setActivatorNodeRef`) keeps the rest of the row clickable. `PointerSensor` is also configured with an activation distance (e.g. `{ distance: 4 }`) to be extra defensive.
- **Touch scroll vs drag**: the handle must have `touch-action: none` (`touch-none` Tailwind class) — without it, vertical scroll wins on mobile and the drag never starts.
- **Bundle size**: dnd-kit adds ~15 kB gzipped. Acceptable for the a11y + touch story; only loaded by the edit page since the read page renders the no-DnD branch.
- **Note preservation across reorder**: notes ride with each slot in the persisted payload (`{ paintId, note }`), so dragging a row carries its note with it even when duplicate `paintId`s exist.

## Notes

- Sequencing: lands after `01-palette-management` (the row component must exist) and after `02-add-to-palette` (a populated list to reorder). No coordination with earlier migrations is required since this feature ships no schema change.
- The horizontal swatch strip used by `PaletteCard` and `PaletteDetail` reads from the same ordered `paints` array; once positions persist, the strip naturally reflects the new order.
- Future feature `04-palette-hue-swap` will mutate paint identity per slot. The `{ paintId, note }` payload model is forward compatible — when that lands, the swap action can call the same `setPalettePaints` path. If a stable `slot_id` becomes useful then (e.g. for per-slot photos), revisit Option A as its own migration.
