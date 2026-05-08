# Color Palette Paint Sorting

**Epic:** Color Palettes
**Type:** Feature
**Status:** Done
**Branch:** `feature/color-palette-sorting`
**Merge into:** `v1/main`

## Summary

Add sort controls to the palette builder so owners can order their paints by name, type, hue, saturation, or lightness in ascending or descending order. The sort logic is built as a **generic, reusable paint sorter** in the `paints` module so the same utility and UI can be dropped into any page that lists paints (color wheel, `/paints` index, user collection, future surfaces). The palette builder consumes the generic pieces and adds palette-specific glue: a confirmation dialog (so a click does not silently overwrite hand-tuned ordering), the `reorderPalettePaints` persistence call, and group-aware partitioning when palette groups (`09-color-palette-groups.md`) are present.

## Acceptance Criteria

### Reusable sort module

- [x] `sortPaints` utility accepts any array of paint-shaped objects and returns a new sorted array — the function is pure and decoupled from palettes
- [x] `sortPaints` supports five fields: `name`, `paint_type`, `hue`, `saturation`, `lightness`
- [x] `sortPaints` supports `asc` and `desc` direction
- [x] Sort is **stable** — equal keys keep their original relative order
- [x] Nulls/undefined paint metadata sort last in both directions
- [x] `PaintSortBar` UI component is reusable and emits a single `onChange(field, direction)` event — it does not own persistence

### Palette integration

- [x] The palette builder shows the `PaintSortBar` in edit mode, plus an "Apply sort" button
- [x] Clicking "Apply sort" opens a confirmation dialog warning the user that the current paint order will be replaced
- [x] On confirmation, paints are reordered by the chosen field and direction, positions are persisted via `reorderPalettePaints`, and the list re-renders in the new order
- [x] On cancel, no changes are made and the dialog closes
- [x] After applying a sort, drag-and-drop reorder continues to work normally on the sorted list
- [x] When palette groups are present, sorting applies within each group independently (ungrouped paints are sorted among themselves)
- [x] The sort toolbar is only shown in edit mode — it does not appear on the read-only palette detail view
- [x] `npm run build` and `npm run lint` pass with no errors

## Implementation Plan

The work splits across two domain modules:

- **`src/modules/paints/`** — generic, reusable: the sort utility and the sort-bar UI. Zero coupling to palettes. Other surfaces (color wheel filtering, paint index sort, user collection sort) can import and use these without any palette types.
- **`src/modules/palettes/`** — palette-specific glue: the confirm dialog, the integration into `palette-paint-list.tsx`, and the group-aware partition helper.

No migrations, no new server actions, no new service methods. Persistence reuses the existing `reorderPalettePaints` action exactly as drag-and-drop does today (`src/modules/palettes/components/palette-paint-list.tsx:106–118`).

### Step 1 — Generic sort utility (paints module)

Create `src/modules/paints/utils/sort-paints.ts`. Pure function, no side effects, no palette references.

```ts
export type PaintSortField =
  | 'name'
  | 'paint_type'
  | 'hue'
  | 'saturation'
  | 'lightness'

export type PaintSortDirection = 'asc' | 'desc'

/**
 * Minimal shape required to sort a paint-like object.
 *
 * `ColorWheelPaint` (and any future paint projection) satisfies this
 * structurally — callers do not need to convert their data.
 */
export type SortablePaint = {
  name: string
  paint_type: string | null
  hue: number
  saturation: number
  lightness: number
}

export function sortPaints<T extends SortablePaint>(
  paints: T[],
  field: PaintSortField,
  direction: PaintSortDirection,
): T[]
```

Sort rules per field:

- `name` — case-insensitive `localeCompare` on `name`
- `paint_type` — case-insensitive `localeCompare`; `null` sorts **last** in both directions
- `hue`, `saturation`, `lightness` — numeric subtraction

Stable-sort guarantee: include an explicit tiebreaker on original index (`[index, paint]` zip pattern) so the contract holds regardless of engine.

**Adapter for nested shapes**: callers whose items wrap a paint (e.g., a palette slot with `{ paint, paintId, note, ... }`) pass through a small inline mapping or a `getPaint` selector. Two ergonomic forms supported:

```ts
// Direct: array of SortablePaint-shaped objects
sortPaints(colorWheelPaints, 'hue', 'asc')

// Indirect: array of wrappers — sort the wrappers by reading paint via selector
sortPaintsBy(slots, (slot) => slot.paint, 'hue', 'asc')
```

Export a second helper `sortPaintsBy<T>(items: T[], getPaint: (item: T) => SortablePaint | undefined, field, direction)` that handles the wrapper case. Items whose `getPaint(item)` returns `undefined` (e.g., a palette slot whose paint row was deleted from the catalog) sort **last** in both directions.

`sortPaints` itself is implemented as `sortPaintsBy(paints, (p) => p, field, direction)` — single source of truth for the comparator.

### Step 2 — Reusable sort bar (paints module)

Create `src/modules/paints/components/paint-sort-bar.tsx` — client component, controlled OR uncontrolled.

Props:

```ts
{
  field?: PaintSortField                  // controlled value (optional)
  direction?: PaintSortDirection          // controlled value (optional)
  defaultField?: PaintSortField           // initial value when uncontrolled (default 'name')
  defaultDirection?: PaintSortDirection   // initial value when uncontrolled (default 'asc')
  onChange: (field: PaintSortField, direction: PaintSortDirection) => void
  disabled?: boolean
  className?: string
}
```

Rendering:
1. A `<select className="select select-sm">` for the sort field with options (`name → "Name"`, `paint_type → "Type"`, `hue → "Hue"`, `saturation → "Saturation"`, `lightness → "Lightness"`).
2. A direction toggle `<button className="btn btn-sm btn-outline">` showing `↑ Asc` or `↓ Desc`; clicking flips between `'asc'` and `'desc'`.

The bar fires `onChange(field, direction)` whenever either changes. It does **not** own persistence and does **not** render an "Apply" button — different consumers handle the result differently (palette wants confirm-then-persist, color wheel wants live re-sort, paint index wants a URL param update). That decision belongs to the consumer.

A small named helper `<PaintSortBarApply onApply={(f, d) => ...} />` that wraps `<PaintSortBar>` plus an "Apply" button can be added if multiple consumers need the apply-button variant. For now, the palette builder owns the Apply button locally so we keep the reusable surface minimal.

### Step 3 — Palette confirm dialog (palettes module)

Create `src/modules/palettes/components/palette-sort-confirm-dialog.tsx`. Pattern mirrors `delete-palette-button.tsx`:

- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter` from `@/components/ui/dialog`
- State-controlled `open` from parent (`PalettePaintList`)
- No type-to-confirm — sort is reversible (user can drag rows back)

Props:

```ts
{
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  isPending?: boolean
}
```

Body:
- Title: "Reorder paints?"
- Description: "Applying this sort will replace your current paint order. You can still drag and drop paints after sorting."
- Cancel (`btn btn-sm btn-ghost`, disabled when `isPending`)
- Confirm (`btn btn-sm btn-primary`, label "Apply sort" / "Sorting…" while pending)

This dialog is palette-specific because the "current order will be replaced" warning only makes sense when the consumer is persisting an order. Other consumers (color wheel, paint index) do not need it.

### Step 4 — Group-aware partition helper (palettes module)

Create `src/modules/palettes/utils/sort-palette-slots.ts` — palette-specific wrapper that composes the generic `sortPaintsBy` with palette group partitioning.

```ts
import { sortPaintsBy } from '@/modules/paints/utils/sort-paints'
import type {
  PaintSortField,
  PaintSortDirection,
} from '@/modules/paints/utils/sort-paints'

type SlotWithGroup = {
  paint?: { name: string; paint_type: string | null; hue: number; saturation: number; lightness: number }
  groupId?: string | null
}

export function sortPaletteSlots<T extends SlotWithGroup>(
  slots: T[],
  field: PaintSortField,
  direction: PaintSortDirection,
): T[]
```

Behavior:

- If **no slot** has a `groupId` field defined (all `undefined`, i.e., the flat path used by `palette-paint-list.tsx` today), call `sortPaintsBy(slots, (s) => s.paint, field, direction)` and return.
- If any slot has `groupId` defined: partition by `groupId` (preserve first-seen group order), sort each partition with `sortPaintsBy`, concatenate. The `groupId === null` ("ungrouped") slice is sorted as its own partition.

This keeps the generic `sortPaints`/`sortPaintsBy` surface palette-agnostic while still giving the palette builder the per-group sort behavior it needs.

### Step 5 — Integrate into `PalettePaintList`

`src/modules/palettes/components/palette-paint-list.tsx`. Edit-mode-only changes — read-mode rendering stays untouched.

1. **Imports:** `PaintSortBar` and types from `@/modules/paints/...`; `sortPaletteSlots` and `palette-sort-confirm-dialog`.
2. **State:**
   - `sortField: PaintSortField` (default `'name'`)
   - `sortDirection: PaintSortDirection` (default `'asc'`)
   - `pendingSort: { field: PaintSortField; direction: PaintSortDirection } | null` (controls dialog open)
3. **Sort bar wiring:** `<PaintSortBar field={sortField} direction={sortDirection} onChange={(f, d) => { setSortField(f); setSortDirection(d) }} />` plus a local `<button>Apply sort</button>` that sets `pendingSort = { field: sortField, direction: sortDirection }`.
4. **`handleConfirmSort`:**
   - `const sortedSlots = sortPaletteSlots(slots, pendingSort.field, pendingSort.direction)`
   - `const previousSlots = latestConfirmedRef.current` (existing rollback ref at line 81)
   - `setSlots(sortedSlots)`
   - Inside `startTransition`: call `reorderPalettePaints(paletteId, sortedSlots.map((s) => ({ paintId: s.paintId, note: s.note })))`. On error: `setSlots(previousSlots)` + `toast.error(result.error)`. On success: `latestConfirmedRef.current = sortedSlots`.
   - Set `pendingSort` to `null`.
5. **`handleCancelSort`:** set `pendingSort` to `null`.
6. **Render:** in the edit branch (after the `if (!canEdit)` early return), render `<PaintSortBar>` + Apply button above the existing `<DndContext>`, and render `<PaletteSortConfirmDialog open={pendingSort !== null} ... />` alongside.

The optimistic-update + rollback pattern is identical to `handleDragEnd` (lines 94–119). `latestConfirmedRef` is reused as-is.

The `reorderPalettePaints` action's existing **multiset validation** (`actions/reorder-palette-paints.ts:49–60`) accepts any permutation of the current slot list. Since `sortPaletteSlots` only reorders existing entries (never adds or removes), the action accepts the sort result without any server-side changes.

### Step 6 — Group-aware integration (deferred to groups feature)

When `09-color-palette-groups` ships and `PaletteGroupedPaintList` is introduced:

- `PaletteGroupedPaintList` reuses `PaintSortBar`, `PaletteSortConfirmDialog`, and `sortPaletteSlots` unchanged.
- The slot type used by `PaletteGroupedPaintList` includes `groupId`; `sortPaletteSlots` automatically activates the group-partitioned path.
- `palette-paint-list.tsx` remains the flat-list path (read view, plus any palette with no groups). Its slots have no `groupId`, so `sortPaletteSlots` falls through to the flat `sortPaintsBy` call. No coupling between the two features beyond the shared utilities.

### Step 7 — Future consumers (out of scope for this branch)

Documented here so the boundary is clear and the reusable surface is intentional. None of the following are built on this branch — they are illustrative of why the split exists.

- **Color wheel** (`src/modules/color-wheel/`): drop `<PaintSortBar>` into the filter sidebar; on `onChange`, call `sortPaints(filteredPaints, field, direction)` and re-render — no confirm dialog (live re-sort, no persistence).
- **`/paints` index page**: `<PaintSortBar>` controlled by URL search params (`?sort=hue&dir=desc`); `onChange` updates the URL via `router.replace`; the server component reads the params and sorts before rendering.
- **User paint collection**: identical to the paint index pattern, scoped to the user's owned paints.

Each consumer reuses `sortPaints` + `<PaintSortBar>` as-is. None of them need `palette-sort-confirm-dialog` or `sort-palette-slots`.

### Affected Files

| File | Module | Changes |
|------|--------|---------|
| `src/modules/paints/utils/sort-paints.ts` | paints | New — generic `sortPaints` + `sortPaintsBy` + `SortablePaint`, `PaintSortField`, `PaintSortDirection` types |
| `src/modules/paints/components/paint-sort-bar.tsx` | paints | New — controlled/uncontrolled sort field + direction UI; emits `onChange` only |
| `src/modules/palettes/utils/sort-palette-slots.ts` | palettes | New — palette wrapper that composes `sortPaintsBy` with group partitioning |
| `src/modules/palettes/components/palette-sort-confirm-dialog.tsx` | palettes | New — confirm dialog (mirrors `delete-palette-button.tsx` dialog usage) |
| `src/modules/palettes/components/palette-paint-list.tsx` | palettes | Add sort bar + Apply button + confirm dialog + sort-on-confirm logic; reuse `latestConfirmedRef` rollback |

### Risks & Considerations

- **No schema migration** — the entire feature is a different way to compute the input to `reorderPalettePaints`. Zero DB impact.
- **Module boundary discipline** — `src/modules/paints/utils/sort-paints.ts` MUST NOT import from `@/modules/palettes/...`. The reusability promise depends on this. If a palette concept leaks into `sort-paints.ts`, the lift to `paints/` was wasted.
- **`SortablePaint` is a structural type, not a class** — `ColorWheelPaint`, `Paint` (from `paints/types`), and any other paint-shaped object satisfy it automatically without conversion. New paint shapes added later only need the five fields to participate.
- **Nullable `paint_type`** — must sort consistently last in both directions to avoid jarring placement.
- **Stable sort guarantee** — modern V8 `Array.prototype.sort` is stable, but the explicit tiebreaker on original index makes the contract obvious to future readers and bulletproof against engine differences.
- **`<PaintSortBar>` is intentionally apply-less** — different consumers want different commit semantics (live re-sort vs. confirm-then-persist vs. URL update). Bundling an Apply button inside the bar would force a one-size-fits-all flow. The palette builder owns its own Apply button locally; if a second consumer needs the apply-button variant, extract a `<PaintSortBarWithApply>` wrapper at that point — not preemptively.
- **Forward compatibility with groups** — the `SlotWithGroup` constraint with optional `groupId` is the only integration surface. When the groups feature lands, `PaletteGroupedPaintList` calls the same `sortPaletteSlots` and gets per-group sorting for free.
- **`reorderPalettePaints` already handles** auth, ownership, multiset validation, position normalization, atomic replace via `replace_palette_paints` RPC, and 4-path revalidation. The sort path adds zero new server-side surface.
