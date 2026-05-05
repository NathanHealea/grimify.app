# Add Paints to a Palette — From Anywhere

**Epic:** Color Palettes
**Type:** Feature
**Status:** Done
**Branch:** `feature/add-to-palette`
**Merge into:** `v1/main`

## Summary

Let users build palettes from anywhere in the app. Three entry points:

1. **Per-paint add**: A new "Add to palette" affordance on `CollectionPaintCard` and the paint detail page.
2. **Bulk-from-scheme**: A "Save scheme as palette" action in the Color Scheme Explorer that creates a palette pre-populated with each scheme color's top paint match.
3. **Bulk-from-search**: A "Add selected to palette" action when multi-selecting paints in any paint grid that supports selection.

Paints can be added whether or not the user owns them (no collection check). Each add appends to the end of the palette and respects the user's most-recently-edited palette as the default target.

## Acceptance Criteria

- [x] Every `CollectionPaintCard` shows an "Add to palette" action (icon + label or menu item)
- [x] The paint detail page (`/paints/[id]`) shows the same action
- [x] The action opens a popover/menu listing the user's existing palettes plus a "Create new palette" option
- [x] Selecting an existing palette appends the paint at the next position
- [x] "Create new palette" opens an inline name input, then creates the palette and adds the paint
- [x] Adding shows a toast with "Added to {palette name}" and a link to view the palette
- [x] Adding a paint already in the target palette is allowed (the schema permits duplicates)
- [x] The Color Scheme Explorer adds a "Save as palette" button that, given the active filter state, creates a new palette containing each scheme color's nearest paint match (skipping empty match slots)
- [x] "Save as palette" prompts for a palette name (defaulting to "{schemeType} from {baseLabel}")
- [x] Unauthenticated users clicking any add action are redirected to `/sign-in?next={current-path}`
- [x] All adds preserve order; positions remain `0..N-1` after every mutation
- [x] `npm run build` and `npm run lint` pass with no errors

## Routes

No new pages. This feature wires entry points into existing routes:

| Route                      | Change                                                  |
| -------------------------- | ------------------------------------------------------- |
| `/paints/[id]`             | Adds `<AddToPaletteButton paintId={id} />`              |
| `/schemes`                 | Adds `<SaveSchemeAsPaletteButton />` to the explorer   |
| `/collection`, `/wheel`, … | `CollectionPaintCard` gains the popover menu item       |

## Module additions

### `src/modules/palettes/`

```
actions/
├── add-paint-to-palette.ts          NEW — append a paint to an existing palette
├── add-paints-to-palette.ts         NEW — append many paints in one transaction
└── create-palette-with-paints.ts    NEW — create + populate in a single action
components/
├── add-to-palette-button.tsx        NEW — popover trigger; shows "+ Add to palette"
├── add-to-palette-menu.tsx          NEW — menu body: list + "Create new palette" footer
└── new-palette-inline-form.tsx      NEW — minimal inline name field
```

### `src/modules/color-schemes/`

```
components/
├── save-scheme-as-palette-button.tsx NEW — opens dialog with name input + confirm
└── (modify) scheme-explorer.tsx      pass the current matches/filters to the button
utils/
└── build-palette-from-scheme.ts      NEW — pure: SchemeColor[] -> { name, paintIds[] }
```

## Key Files

| Action  | File                                                                       | Description                                                          |
| ------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Create  | `src/modules/palettes/actions/add-paint-to-palette.ts`                     | Appends a single `paint_id` to a palette                             |
| Create  | `src/modules/palettes/actions/add-paints-to-palette.ts`                    | Appends an ordered list of `paint_id`s in one transaction            |
| Create  | `src/modules/palettes/actions/create-palette-with-paints.ts`               | Creates a palette and populates it atomically                        |
| Create  | `src/modules/palettes/components/add-to-palette-button.tsx`                | Trigger button + popover wrapper                                     |
| Create  | `src/modules/palettes/components/add-to-palette-menu.tsx`                  | Menu UI: existing palettes + "Create new"                            |
| Create  | `src/modules/palettes/components/new-palette-inline-form.tsx`              | Inline name field used inside the menu                               |
| Modify  | `src/modules/collection/components/collection-paint-card.tsx`              | Mounts `<AddToPaletteButton>` (icon-only on grid, full on detail)    |
| Modify  | `src/app/paints/[id]/page.tsx`                                             | Renders full-width "Add to palette" button next to existing actions  |
| Create  | `src/modules/color-schemes/components/save-scheme-as-palette-button.tsx`   | Composes existing scheme state into a palette                        |
| Modify  | `src/modules/color-schemes/components/scheme-explorer.tsx`                 | Wires `SaveSchemeAsPaletteButton` and forwards `schemeColors`        |
| Create  | `src/modules/color-schemes/utils/build-palette-from-scheme.ts`             | Pure helper that turns `SchemeColor[]` into `{ name, paintIds[] }`   |

## Implementation

Builds on the existing palette infrastructure (`createPaletteService`, `setPalettePaints` RPC wrapper, `normalizePalettePositions`, `validatePaletteName`, `palette-service.client.ts`, `CollectionToggle`). No new database migrations or RPCs are required — the existing `replace_palette_paints` RPC handles atomic writes and ownership checks.

### 1. Service additions

Edit `src/modules/palettes/services/palette-service.ts` and add two read-modify-write methods that compose on top of the existing `setPalettePaints` (which delegates to the `replace_palette_paints` RPC). Reusing the RPC keeps positions contiguous and ownership-checked in a single transaction — the same pattern `removePalettePaint` already uses.

```ts
async appendPaintToPalette(
  paletteId: string,
  paintId: string,
  note?: string | null,
): Promise<{ error?: string }>

async appendPaintsToPalette(
  paletteId: string,
  paintIds: string[],
): Promise<{ error?: string }>
```

Implementation sketch (mirrors `removePalettePaint`):

1. Call `getPaletteById(paletteId)` to load the existing slots (RLS still enforces visibility).
2. Build `next = [...palette.paints, { position: palette.paints.length, paintId, note: note ?? null }]` (or append all `paintIds` for the bulk variant).
3. Pass through `normalizePalettePositions` for safety, then call `setPalettePaints(paletteId, …)`.

The actions (Step 6) own the auth/ownership preflight; the service stays thin.

### 2. Per-paint add — `<AddToPaletteButton>` and `<AddToPaletteMenu>`

Trigger button (`'use client'`) with two `variant` modes:

| variant | Used in                                  | Styles                                                |
| ------- | ---------------------------------------- | ----------------------------------------------------- |
| `icon`  | `CollectionPaintCard` action overlay     | `btn btn-ghost btn-square btn-sm`, `Plus` lucide icon |
| `full`  | `/paints/[id]` page next to the toggle   | `btn btn-soft btn-primary btn-md`, label "Add to palette" |

The button uses `Radix DropdownMenu` from `src/components/ui/dropdown-menu.tsx` (no Popover primitive exists yet; dropdown is the closest match and already styles a portaled, focus-trapped surface). The menu body is `<AddToPaletteMenu>`.

`<AddToPaletteMenu>` responsibilities:

- On open, fetch the viewer's palettes with `getPaletteService()` from `palette-service.client.ts` (`listPalettesForUser(viewerId)`), keyed by viewer id. Re-fetch on every open so newly created palettes from another tab show up.
- Render four states: loading skeleton, error (with a retry button), empty (single "Create new palette" CTA), and populated (scrollable list of `DropdownMenuItem` rows showing `name + paintCount`, then a separator + "Create new palette" footer).
- Sort matches the dashboard (`updated_at desc`) — `listPalettesForUser` already returns that order, so the most-recently-edited palette ends up first / highlighted (Step 7).
- Selecting an existing palette calls `addPaintToPalette` (Step 6); on success collapse the menu and show a brief inline `aria-live="polite"` "Added to {name}" message anchored to the trigger (the project has no toast library — `palette-form.tsx` documents the inline-message convention in its JSDoc).
- Selecting "Create new palette" swaps the menu body for `<NewPaletteInlineForm>` (a single-row name input + "Create" / "Cancel"). On submit it calls `createPaletteWithPaints` (Step 6).

Unauthenticated users: the trigger does not open the menu — a click calls `router.push('/sign-in?next=' + encodeURIComponent(pathname))`. Reuse the exact redirect pattern from `CollectionToggle` (`usePathname()` + `useRouter()`).

`<NewPaletteInlineForm>` validates the name with the existing `validatePaletteName` from `src/modules/palettes/validation.ts` before submission so users see the same constraint message as the dashboard (1–80 chars, required).

### 3. Wiring into `CollectionPaintCard`

Edit `src/modules/collection/components/collection-paint-card.tsx` — it already wraps `PaintCard` in a `relative` container with `CollectionToggle` overlaid at `top-1 right-1`. Stack the new button under the toggle:

```tsx
<AddToPaletteButton
  paintId={id}
  variant="icon"
  isAuthenticated={isAuthenticated}
  className="absolute right-1 top-9"
/>
```

Mirror `CollectionToggle`'s click handling — the button must call `e.stopPropagation()` and `e.preventDefault()` on the trigger so the underlying `PaintCard` `<Link>` does not navigate.

The card is already a client component (`'use client'`), so no boundary changes are needed. Verify visual density at the smallest card size used by the wheel/explorer.

### 4. Wiring into the paint detail page

Edit `src/modules/paints/components/paint-detail.tsx` (not the route page — the toggle currently lives in the component, so the new button belongs there too). Place `<AddToPaletteButton variant="full" paintId={paint.id} isAuthenticated={isAuthenticated} revalidatePath={'/paints/' + paint.id} />` directly after the `CollectionToggle` inside the heading row.

### 5. Save scheme as palette

`SaveSchemeAsPaletteButton` mounts inside `scheme-explorer.tsx`, after `<SchemeTypeSelector>` and before `<SchemeSwatchGrid>`, so it has access to the derived `schemeColors`, `baseColor`, and `activeScheme`.

Update `scheme-explorer.tsx` to pass these three props to the new button. The button itself is a small client component:

1. Disabled when `schemeColors.length === 0` or every entry has an empty `nearestPaints`.
2. On click, opens a native `<dialog>` (matches the `delete-palette-button.tsx` pattern — no extra UI deps) containing a name input and Confirm/Cancel actions.
3. Default name is computed by `buildPaletteFromScheme(schemeColors, baseColor, activeScheme)`.
4. Confirm calls the `createPaletteWithPaints` server action; on success Next.js redirects to `/palettes/{id}/edit`.
5. Disabled state is also surfaced via `aria-disabled` and a tooltip-friendly `title` ("Pick a base color first" / "No matching paints").

`build-palette-from-scheme.ts` lives in `src/modules/color-schemes/utils/`:

```ts
import type { BaseColor } from '@/modules/color-schemes/types/base-color'
import type { SchemeColor } from '@/modules/color-schemes/types/scheme-color'
import type { ColorScheme } from '@/modules/color-wheel/types/color-scheme'

export function buildPaletteFromScheme(
  scheme: SchemeColor[],
  base: BaseColor,
  schemeType: ColorScheme,
): { name: string; paintIds: string[] }
```

- `name` formats `<Title-cased schemeType> from <baseLabel>`, where `baseLabel = base.name ?? base.hex` (the base picker stores `name` for paint-mode and leaves it absent for hex-mode — see `BaseColorPicker.selectPaint` and `handleHexChange`).
- `paintIds` collects each color's `nearestPaints[0].id`, skipping any entry where `nearestPaints` is empty.

The helper is pure — unit-test-friendly and free of React imports.

### 6. Action implementation notes

All three actions live in `src/modules/palettes/actions/` (one file per action, matching the module convention). They mirror the patterns established in `create-palette.ts` and `remove-palette-paint.ts`.

`add-paint-to-palette.ts` — `addPaintToPalette(paletteId, paintId)`:

1. Read the user from `createClient()` (server). Return `{ error: 'You must be signed in to add paints to a palette.' }` if absent (the trigger already redirects pre-flight, but the action stays defensive).
2. Service call: load palette, verify `palette.userId === user.id`, then `appendPaintToPalette`.
3. `revalidatePath('/palettes')`, `revalidatePath('/palettes/' + paletteId)`, `revalidatePath('/palettes/' + paletteId + '/edit')`.
4. Returns `{ ok: true, paletteName: string } | { error: string }` so the menu can render the inline "Added to …" confirmation.

`add-paints-to-palette.ts` — `addPaintsToPalette(paletteId, paintIds)`:

- Same shape as above but accepts an array. Used by the bulk-from-scheme path indirectly (via `createPaletteWithPaints`) and reserved for the deferred multi-select grid.

`create-palette-with-paints.ts` — `createPaletteWithPaints({ name, description?, paintIds })`:

1. Validate name with `validatePaletteForm`. Return validation errors as a structured response (the dialog can surface them inline).
2. Create the palette via `service.createPalette`.
3. Call `service.appendPaintsToPalette(palette.id, paintIds)`. If it fails, the palette still exists but is empty — return `{ ok: true, paletteId, warning: 'Created, but failed to add paints.' }` so the user lands in the editor and can retry.
4. `revalidatePath('/palettes')` then `redirect('/palettes/' + palette.id + '/edit')`.

All three return plain serializable objects; none rely on `useActionState` since the call sites are imperative (button onClick / dialog confirm), not form-driven.

### 7. Default-target heuristic

`listPalettesForUser` already returns palettes ordered by `updated_at desc` (see `palette-service.ts` line 120). The first row is therefore the implicit "most recently edited" target. No persistence of a "last used" preference — the menu simply highlights the first row by giving it `data-default="true"` and styling, and pressing Enter when the menu opens commits to it.

### 8. Manual QA checklist

- Add a paint from a paint card → inline "Added to {name}" message; dashboard shows the paint count incremented after the next page revalidate.
- Add the same paint twice → both rows persist (composite PK is `(palette_id, position)`, not `(palette_id, paint_id)`); palette swatches show duplicates.
- "Create new palette" inline → palette is created and the paint added; menu collapses and dashboard shows the new row.
- From a paint card with no palettes → menu shows the empty state with a single "Create new" CTA.
- Generate a triadic scheme from "Cobalt Blue", click "Save as palette" → name pre-fills as "Triadic from Cobalt Blue"; confirm lands on the edit page with each scheme color's top match in scheme order.
- Apply a hex base color, click "Save as palette" → name pre-fills as e.g. "Triadic from #2a52be".
- Apply a base color whose paints all share the same hue but `nearestPaints` is empty for some scheme positions → "Save as palette" still works, only populated slots contribute paints.
- Pick a base color where every scheme entry has an empty `nearestPaints` → "Save as palette" is disabled with the explanatory `title`.
- Sign out, click any "Add to palette" → redirects to `/sign-in?next={current-path}`.
- `npm run build` + `npm run lint`.

## Risks & Considerations

- **Card density**: Two compact action buttons on the paint card (collection toggle + add-to-palette) start to crowd small cards. The icon-only variant + a tooltip keeps it manageable; if it gets worse, collapse both into a single overflow menu.
- **Race on append**: Appending uses `max(position) + 1` per call. Two simultaneous appends could collide at the same position; the composite PK will reject the second one. The action should retry once on `unique_violation` before surfacing the error. Keep this transparent to callers.
- **Stale palette list in popover**: After a "Create new" the popover should optimistically include the new palette. Easiest approach: re-fetch on success.
- **Scheme save default name**: "Triadic from Cobalt Blue" requires the explorer to expose `baseLabel` (paint name when chosen from a paint, hex string otherwise). The base color picker already tracks this.
- **Multi-add from grid (out of scope for v1)**: The acceptance criteria mentions a bulk-add from selection grids, but no current grid supports multi-select. Defer until a "Compare/select" mode lands; the action `addPaintsToPalette` is built so that future mode can plug in without new server work. Note this as deferred in the PR description.

## Notes

- Reordering inside the popover (or after add) is **not** part of this feature — see `03-palette-reorder.md`.
- Editing the per-slot `note` is **not** part of this feature; v1 leaves notes blank on add. A follow-up can add an inline note editor on the palette builder list rows.
- "Save as palette" replaces the deferred acceptance item in `docs/05-color-scheme-explorer/02-scheme-to-paints.md`. Once this lands, mark that checkbox `[x]`.
