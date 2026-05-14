# Edit Palette — Paint Combobox

**Epic:** Color Palettes
**Type:** Enhancement
**Status:** Todo
**Branch:** `enhancement/edit-palette-paint-combo-box`
**Merge into:** `main`

## Summary

When editing a palette, surface a paint combobox at the top of the **Paints** section that lets the owner search the full paint catalog, add the chosen paint directly into the palette they're editing, and optionally save that paint to their personal collection in the same action.

Today the only ways to grow a palette during edit are to (a) navigate elsewhere and use the existing per-paint `<AddToPaletteButton>` or (b) leave the editor entirely to find paints. This enhancement keeps the user in the editor, reusing the same `PaintCombobox` primitive that already powers paint comparison and recipe step pickers, and reusing the existing `addPaintToPalette` and `addToCollection` server actions.

## Acceptance Criteria

- [ ] The palette edit page (`/user/palettes/[id]/edit`) renders a paint combobox above the grouped paint list, inside the "Paints" section of `<PaletteBuilder>`.
- [ ] Typing in the combobox live-filters against the full paint catalog (`getColorWheelPaints`), matching against paint name (case-insensitive), capped at 8 results.
- [ ] Paints already in the palette are excluded from the dropdown results so the user cannot pick a duplicate.
- [ ] Each result row shows the paint swatch, name, and brand label — identical to the comparison picker's row layout.
- [ ] A "Also save to my collection" checkbox sits next to the combobox; when checked, every successful palette add also calls `addToCollection` for that paint.
- [ ] The checkbox is hidden (or disabled with explanatory text) when the user already owns the paint about to be added — i.e. the row shows a small "In collection" badge instead of duplicating the toggle.
- [ ] Selecting a paint clears the combobox query and shows a toast `Added '{paint}' to '{palette}'` (success) or the action's error message (failure), reusing the existing toast conventions established by [06-prevent-duplicate-paint-add.md](./06-prevent-duplicate-paint-add.md).
- [ ] When the collection toggle is on and the parallel collection add succeeds, an additional toast `Added '{paint}' to your collection` is shown (matching `CollectionToggle`'s existing success copy).
- [ ] When the palette add succeeds but the collection add fails, the palette add toast still shows; a second error toast surfaces the collection failure independently (the two writes are independent — failing one does not roll back the other).
- [ ] The component remains usable on a mobile viewport — the combobox + checkbox stack vertically below ~`sm` breakpoint.
- [ ] The combobox is only rendered in edit mode; the public palette detail page is unaffected.
- [ ] `npm run build` and `npm run lint` pass with no errors.

## Out of Scope

- Bulk add (selecting multiple paints before committing). The combobox commits one paint per pick; this matches `PaintComparisonPicker` and avoids designing a new selection-staging UI for this enhancement.
- Adding the same combobox to the **create palette** flow (`/user/palettes/new`). The new-palette landing already redirects to the edit page after creation, so the combobox is reachable; revisit if `/new` ever renders an inline editor.
- Re-fetching the catalog when paints change server-side mid-session. The catalog is fetched once per page render and re-fetched on the next navigation/revalidation, which is consistent with `paint-comparison-explorer.tsx`.
- Search across hex / brand fields. The underlying `PaintCombobox` already filters by name only; broadening it is a separate change that should land in the primitive, not this consumer.

## Routes

No new routes. The change is wired into the existing edit page:

| Route                              | Change                                                            |
| ---------------------------------- | ----------------------------------------------------------------- |
| `/user/palettes/[id]/edit`         | Fetches paint catalog + viewer's collection IDs; passes both into `<PaletteBuilder>` |

## Module additions

### `src/modules/palettes/`

```
components/
├── palette-paint-picker.tsx     NEW — combobox + "save to collection" toggle wrapper
└── (modify) palette-builder.tsx accept `catalog` + `collectionPaintIds`, mount the new picker
```

No new actions, services, types, or validation files. The picker composes:

- `PaintCombobox` (existing, in `paints/components/paint-combobox.tsx`)
- `addPaintToPalette` server action (existing, returns `AddPaintToPaletteResult`)
- `addToCollection` server action (existing, idempotent)

## Key Files

| Action | File                                                              | Description                                                                                       |
| ------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Create | `src/modules/palettes/components/palette-paint-picker.tsx`        | Client component — combobox + collection-save checkbox; orchestrates the two server actions       |
| Modify | `src/modules/palettes/components/palette-builder.tsx`             | Accept `catalog` and `collectionPaintIds` props; render `<PalettePaintPicker>` above the paint list |
| Modify | `src/app/user/palettes/[id]/edit/page.tsx`                        | Server-side fetch the paint catalog and the viewer's collection paint IDs; pass to `<PaletteBuilder>` |

## Implementation

The work is intentionally thin — all of the heavy lifting (auth, dedupe, RPC, revalidation, toasts) is already in place from the [02-add-to-palette](./02-add-to-palette.md), [06-prevent-duplicate-paint-add](./06-prevent-duplicate-paint-add.md), and [03-collection-toast](../06-collection-tracking/03-collection-toast.md) work. This enhancement wires the existing pieces together inside the editor.

### Step 1 — Server-side data fetch in the edit route

Edit `src/app/user/palettes/[id]/edit/page.tsx`. After the existing palette/auth checks, fetch the catalog and the viewer's collection IDs in parallel and pass them to `<PaletteBuilder>`:

```ts
import { createPaintService } from '@/modules/paints/services/paint-service'
import { createCollectionService } from '@/modules/collection/services/collection-service'

// ...inside the page after `service.getPaletteById` and the ownership check:

const paintService = createPaintService(supabase)
const collectionService = createCollectionService(supabase)

const [catalog, collectionIds] = await Promise.all([
  paintService.getColorWheelPaints(),
  collectionService.getUserPaintIds(user.id),
])

return (
  // ...existing Main / PageHeader wrapper
  <PaletteBuilder
    palette={palette}
    catalog={catalog}
    collectionPaintIds={Array.from(collectionIds)}
  />
)
```

`getColorWheelPaints` is the same source the comparison picker uses, so we are not paying a new query cost beyond what other pages already pay. `getUserPaintIds` returns a `Set<string>`; convert it to an array at the boundary so the prop is JSON-serializable for the client component.

### Step 2 — `<PaletteBuilder>` passes data through

Edit `src/modules/palettes/components/palette-builder.tsx`. Extend the props to accept the catalog and collection IDs and mount the new picker above the grouped list:

```tsx
import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'
import { PalettePaintPicker } from '@/modules/palettes/components/palette-paint-picker'

export function PaletteBuilder({
  palette,
  catalog,
  collectionPaintIds,
}: {
  palette: Palette
  catalog: ColorWheelPaint[]
  collectionPaintIds: string[]
}) {
  return (
    <div className="card card-body flex flex-col gap-6">
      {/* ...existing Details section unchanged */}

      <div>
        <h2 className="mb-4 text-lg font-semibold">Paints</h2>
        <PalettePaintPicker
          paletteId={palette.id}
          paletteName={palette.name}
          catalog={catalog}
          excludedPaintIds={palette.paints.map((slot) => slot.paintId)}
          collectionPaintIds={collectionPaintIds}
        />
        {palette.paints.length === 0 && <PaletteEmptyState variant="owner" />}
        <PaletteGroupedPaintList
          paletteId={palette.id}
          paints={palette.paints}
          groups={palette.groups}
          canEdit
        />
      </div>

      {/* ...existing footer unchanged */}
    </div>
  )
}
```

`excludedPaintIds` is derived from the live `palette.paints` list so the dropdown stays in sync after every successful add (the server action revalidates the edit page, which re-renders this list).

### Step 3 — `<PalettePaintPicker>` component

Create `src/modules/palettes/components/palette-paint-picker.tsx`. The component is intentionally small — it wraps `PaintCombobox`, exposes a single checkbox, and dispatches the two server actions on selection.

```tsx
'use client'

import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { PaintCombobox } from '@/modules/paints/components/paint-combobox'
import { addPaintToPalette } from '@/modules/palettes/actions/add-paint-to-palette'
import { addToCollection } from '@/modules/collection/actions/add-to-collection'
import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'

export function PalettePaintPicker({
  paletteId,
  paletteName,
  catalog,
  excludedPaintIds,
  collectionPaintIds,
}: {
  paletteId: string
  paletteName: string
  catalog: ColorWheelPaint[]
  excludedPaintIds: string[]
  collectionPaintIds: string[]
}) {
  const [alsoSaveToCollection, setAlsoSaveToCollection] = useState(false)
  const [isPending, startTransition] = useTransition()

  const candidates = useMemo(() => {
    const excluded = new Set(excludedPaintIds)
    return catalog.filter((p) => !excluded.has(p.id))
  }, [catalog, excludedPaintIds])

  const ownedSet = useMemo(() => new Set(collectionPaintIds), [collectionPaintIds])

  function handleSelect(paint: ColorWheelPaint) {
    startTransition(async () => {
      const paletteResult = await addPaintToPalette(paletteId, paint.id)
      if ('error' in paletteResult) {
        if (paletteResult.code === 'duplicate') {
          toast.error(`'${paint.name}' is already in '${paletteName}'`)
        } else {
          toast.error(paletteResult.error)
        }
        return
      }
      toast.success(`Added '${paint.name}' to '${paletteResult.paletteName}'`)

      if (alsoSaveToCollection && !ownedSet.has(paint.id)) {
        const collectionResult = await addToCollection(
          paint.id,
          `/user/palettes/${paletteId}/edit`,
        )
        if (collectionResult.error) {
          toast.error(collectionResult.error)
        } else {
          toast.success(`Added '${paint.name}' to your collection`)
        }
      }
    })
  }

  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="flex-1">
        <PaintCombobox
          paints={candidates}
          onSelect={handleSelect}
          placeholder="Search paints to add to this palette…"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground sm:whitespace-nowrap">
        <input
          type="checkbox"
          className="checkbox checkbox-sm"
          checked={alsoSaveToCollection}
          onChange={(e) => setAlsoSaveToCollection(e.target.checked)}
          disabled={isPending}
        />
        Also save to my collection
      </label>
    </div>
  )
}
```

Notes on the implementation:

- The two server actions are **sequential, not parallel**: the palette add is the primary intent and should succeed before we attempt the collection add. If the palette add fails (auth, duplicate, ownership), we never touch the collection. This matches the user's mental model ("add this paint to my palette; also, if I checked the box, file it in my collection").
- The collection add is **skipped** when `ownedSet.has(paint.id)` — re-adding is a no-op (`addToCollection` is idempotent), but skipping it avoids the redundant toast and round-trip.
- The collection toast intentionally fires **after** the palette toast. Sonner stacks these naturally; the order reflects the order of effects.
- The "Also save to my collection" preference is **session-state** only; we deliberately do not persist it across navigations to avoid surprising the user with a still-checked box on a future visit. Reset is automatic on next page mount.

### Step 4 — Visual badge for already-owned paints in the dropdown (optional polish)

`PaintCombobox` currently shows `name + brand` per row. The acceptance criteria call for an "In collection" badge so the user can see at a glance which paints they already own — useful when deciding whether to flip the collection toggle.

Two options:

1. **Decorate inside `PaintCombobox`**: add an optional `ownedIds: Set<string>` prop and a small `<span className="badge badge-soft badge-xs">In collection</span>` after the brand label. This benefits other consumers (`PaintComparisonPicker`, `SchemePaintCombobox`) but widens the primitive's surface area.
2. **Wrap a custom row renderer in `<PalettePaintPicker>`**: this requires `PaintCombobox` to accept a `renderRow` slot, which it does not today.

Recommendation: **option 1**. Add an optional `ownedIds?: Set<string>` prop to `PaintCombobox`. When absent, behavior is unchanged. When present and a paint's id is in the set, render the badge after the brand name. Other consumers can opt in later. This is a minimal, additive change to the primitive.

If the optional polish slips out of scope, the feature still lands without the badge — the combobox simply doesn't show owned-status hints.

### Step 5 — Manual QA checklist

- Search by name → results populate; capped at 8.
- Pick a paint not in the palette and **not** in my collection (toggle off) → success toast for palette add; combobox clears; the paint appears in the grouped list after revalidate.
- Same scenario with toggle **on** → both toasts fire; the paint is added to both surfaces; the collection-stats card (if visible elsewhere) reflects the new count on the next navigation.
- Pick a paint that is already in the palette → it does not appear in the dropdown (pre-filtered). Confirm this stays true after the previous adds (revalidation refreshes `excludedPaintIds`).
- Pick a paint already in my collection with the toggle **on** → only the palette toast fires; no redundant "added to collection" toast.
- Toggle **on**, pick a paint, simulate `addToCollection` failure (e.g. network drop) → palette add toast fires; a second error toast surfaces the collection error; the palette write is **not** rolled back.
- Sign-out path is N/A — the edit route already redirects unauthenticated users to `/sign-in` (see line 31 of the page); the picker is never reachable while signed out.
- Mobile (<= `sm`): combobox occupies full width; checkbox stacks below.
- `npm run build` and `npm run lint`.

## Risks & Considerations

- **Catalog payload size**: `getColorWheelPaints` returns the full paint catalog. The comparison explorer and color wheel already ship this to the client, so the marginal cost on the edit page is negligible — but if the catalog grows substantially, the edit route's TTFB will be the first place that's noticed. If/when this becomes a concern, swap the in-memory filter for a server-side search action (the recipe step paint picker already paginates a similar use case).
- **Stale `excludedPaintIds` between adds**: `addPaintToPalette` calls `revalidatePath` on the edit route, so the next render reflects the new paint and removes it from `candidates`. There is a brief window after `startTransition` resolves but before React re-renders where the user could pick the same paint twice; the service-layer duplicate guard from [06-prevent-duplicate-paint-add](./06-prevent-duplicate-paint-add.md) catches this and surfaces the duplicate toast.
- **Two independent writes**: The palette and collection writes are independent — there is no transactional coupling. Documented in the acceptance criteria and surfaced through separate toasts. A future enhancement could wrap both in a single combined action if the failure mode proves confusing.
- **Checkbox session state**: Resetting the toggle on every mount is a deliberate choice. If user feedback says they want it sticky, persist to `localStorage` later; do not store it server-side.
- **Combobox primitive coupling**: Adding the optional `ownedIds` prop (Step 4) to `PaintCombobox` is intentionally non-breaking. Other consumers continue to work unchanged because the prop is optional.

## Notes

- The picker reuses `PaintCombobox` rather than the `<AddToPaletteButton>` dropdown. That existing button is the right tool when the user is on a paint and wants to choose a palette; this combobox is the inverse — the user is on a palette and wants to choose a paint.
- Follow-ups worth tracking: a "Saved to collection" inline indicator on rows that flip during the session, and a sticky checkbox preference. Both are deferred.
