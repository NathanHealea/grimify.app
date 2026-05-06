# Palette Hue-Locked HSL Swap

**Epic:** Color Palettes
**Type:** Feature
**Status:** Completed
**Branch:** `feature/palette-hue-swap`
**Merge into:** `v1/main`

## Summary

Inside the palette builder, let users replace any paint in a slot with a different paint that shares the same hue but has different saturation or lightness. The picker presents same-hue paints sorted by perceptual distance from the current slot color, with optional saturation and lightness range filters. Clicking a candidate swaps the slot's `paint_id` and re-renders the strip.

This delivers the user's "change colors based on saturation and lightness, keeping the same hue" requirement without needing custom hex inputs — every candidate is still a real paint in the database, so the palette remains a list of paints (not a list of mixed colors).

## Acceptance Criteria

- [x] Each row in the palette builder has a "Swap by hue" affordance (icon + label or menu item)
- [x] Clicking it opens a modal/popover showing same-hue candidate paints
- [x] Candidates are filtered to paints in the **same Munsell hue group** as the current slot's paint
- [x] Candidates are ranked by perceptual distance (CIE76 ΔE) to the current slot's hex
- [x] Saturation and lightness sliders narrow the candidate set (S range, L range, both default to full)
- [x] An "Owned only" toggle filters to the user's collection (visible because the user is signed in)
- [x] A live legend shows the current slot's hue/sat/lightness; the candidate list updates as sliders move
- [x] Selecting a candidate replaces the slot's `paint_id` (not the position); the swatch strip and row update immediately
- [x] If the current slot's paint has no hue group (edge case), the swap is disabled with an explanatory tooltip
- [x] `npm run build` and `npm run lint` pass with no errors

## Module additions

```
src/modules/color-wheel/
└── utils/
    ├── hex-to-lab.ts                     NEW — sRGB→XYZ→CIE Lab (D65)
    └── delta-e76.ts                      NEW — CIE76 ΔE between two Lab triples

src/modules/paints/
└── services/
    └── paint-service.ts                  MODIFY — add listColorWheelPaintsByHueGroup(parentHueId)

src/modules/palettes/
├── actions/
│   ├── get-hue-swap-candidates.ts        NEW — server action: same-hue candidates + ownedIds
│   └── swap-palette-paint.ts             NEW — replaces a slot's paint_id by position
├── components/
│   ├── palette-paint-row.tsx             MODIFY — mount <PaletteSwapButton> next to remove
│   ├── palette-swap-button.tsx           NEW — trigger that opens the dialog
│   ├── palette-swap-dialog.tsx           NEW — native <dialog> with sliders + candidate grid
│   ├── palette-swap-candidate-card.tsx   NEW — candidate tile (swatch, name, brand, ΔE badge)
│   └── palette-swap-sliders.tsx          NEW — dual-thumb S range + L range
└── utils/
    ├── resolve-principal-hue-id.ts       NEW — given a hue_id, returns the principal hue id
    ├── filter-paints-by-hsl-range.ts     NEW — keeps paints whose S/L falls in [min,max]
    └── rank-paints-by-delta-e.ts         NEW — Lab-cached ΔE76 ranker against a target hex
```

## Key Files

| Action | File                                                                | Description                                                              |
| ------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Create | `src/modules/color-wheel/utils/hex-to-lab.ts`                       | Pure function `hexToLab(hex)`; sRGB→XYZ→Lab (D65 white point)            |
| Create | `src/modules/color-wheel/utils/delta-e76.ts`                        | Pure function `deltaE76(a, b)`; Euclidean distance in Lab                |
| Modify | `src/modules/paints/services/paint-service.ts`                      | Add `listColorWheelPaintsByHueGroup(parentHueId)` returning `ColorWheelPaint[]` |
| Create | `src/modules/palettes/actions/get-hue-swap-candidates.ts`           | Server action; resolves principal hue, returns candidates + owned ids    |
| Create | `src/modules/palettes/actions/swap-palette-paint.ts`                | Server action; read-modify-write via `setPalettePaints` to replace one position's `paintId` |
| Create | `src/modules/palettes/components/palette-swap-button.tsx`           | Icon-only button on each row; disabled when `paint.hue_id` is null       |
| Create | `src/modules/palettes/components/palette-swap-dialog.tsx`           | Native `<dialog>` with sliders, owned toggle, candidate grid             |
| Create | `src/modules/palettes/components/palette-swap-candidate-card.tsx`   | Single candidate tile with swatch, name, brand, and ΔE badge             |
| Create | `src/modules/palettes/components/palette-swap-sliders.tsx`          | Two `<input type="range">` overlays for S and L ranges                   |
| Create | `src/modules/palettes/utils/resolve-principal-hue-id.ts`            | Returns `parent_id ?? id` for a given hue id                             |
| Create | `src/modules/palettes/utils/filter-paints-by-hsl-range.ts`          | Filters by S range and L range                                           |
| Create | `src/modules/palettes/utils/rank-paints-by-delta-e.ts`              | Caches `hexToLab` per paint id; returns ordered `{ paint, deltaE }` list |
| Modify | `src/modules/palettes/components/palette-paint-row.tsx`             | Mounts `<PaletteSwapButton>` next to the existing remove + drag handle   |

## Implementation

The work groups into four ordered phases: **(A) primitives**, **(B) data layer**, **(C) UI**, **(D) wire-up**. Phases A–B are pure / server-side and have no UI dependencies, so they can land first as a foundation. Phase C builds the dialog against mock data; Phase D mounts the trigger on the row.

### Phase A — Color math primitives

The codebase has `hexToHsl` / `hslToHex` but **no Lab or ΔE helpers** yet. Add them to `color-wheel/utils/` so this feature and any future near-match work share one source.

#### A1. `hex-to-lab.ts`

Export `hexToLab(hex: string): { L: number; a: number; b: number }`. Standard sRGB → linear → XYZ (D65) → CIE Lab pipeline. Pure function, no React, no side effects.

#### A2. `delta-e76.ts`

Export `deltaE76(a: Lab, b: Lab): number`. Euclidean distance in Lab — `sqrt(ΔL² + Δa² + Δb²)`. Two-line function. CIE76 is intentionally chosen over CIEDE2000: cheap, monotone enough for ranking, and matches what the doc commits to.

### Phase B — Data layer

#### B1. Hue group resolution — `src/modules/palettes/utils/resolve-principal-hue-id.ts`

`paints.hue_id` may reference either a top-level Munsell principal (`parent_id IS NULL`) or an ISCC-NBS sub-hue (`parent_id` set). The "hue group" is **the principal plus all its sub-hues**. Helper signature:

```ts
resolvePrincipalHueId(hueService, hueId: string): Promise<string | null>
```

Loads the hue via `hueService.getHueById`; returns `parent_id ?? id`. Returns `null` if the hue is missing.

#### B2. Paint service method — `listColorWheelPaintsByHueGroup`

Add a method on `paint-service.ts`:

```ts
listColorWheelPaintsByHueGroup(parentHueId: string): Promise<ColorWheelPaint[]>
```

Implementation:

1. Query `hues` for `id` where `parent_id = parentHueId` to get child sub-hue ids; include `parentHueId` itself in the set so paints whose `hue_id` points directly at the principal are also returned.
2. Query `paints` joined to `product_lines(brands)` filtered by `hue_id IN (ids)`.
3. Map rows to `ColorWheelPaint` shape (same mapping used in `palette-service.getPaletteById`). Returning the wheel-paint shape — not `PaintWithBrand` — keeps the dialog and row using identical types.

#### B3. Pure filters / ranker — `src/modules/palettes/utils/`

- `filter-paints-by-hsl-range.ts` — `filterPaintsByHslRange(paints, { sMin, sMax, lMin, lMax }): ColorWheelPaint[]`. Reads `paint.saturation` and `paint.lightness` directly (already on `ColorWheelPaint` in 0–100). No hex-to-HSL conversion needed.
- `rank-paints-by-delta-e.ts` — `rankPaintsByDeltaE(targetHex, paints, limit = 40): { paint: ColorWheelPaint; deltaE: number }[]`. Internal `Map<paintId, Lab>` cache so re-ranks during slider movement don't re-run `hexToLab` per paint.

### Phase C — UI components

#### C1. `palette-swap-sliders.tsx`

Two side-by-side controls, each a dual-thumb range over 0–100. v1 implementation: two overlapping `<input type="range">`s with custom track CSS (per the existing risk note — avoids a dependency). Each control renders the current slot's value as a static tick mark on the track for orientation. Emits `{ sRange: [number, number]; lRange: [number, number] }`.

#### C2. `palette-swap-candidate-card.tsx`

Compact tile, not full `CollectionPaintCard` (which is built around the catalogue grid layout). Shape:

- 40×40 swatch
- Paint name (truncated)
- Brand : product line line (xs muted)
- ΔE badge top-right (`ΔE 3.2`)
- "Owned" pill if `ownedIds.has(paint.id)` and the user is signed in

Click handler: `onSelect(paint.id)`. Visual hover state.

#### C3. `palette-swap-dialog.tsx`

Native `<dialog>` element using the pattern in `src/modules/user/components/delete-user-dialog.tsx` (`ref.showModal()` / `ref.close()`, `backdrop:bg-black/40`). Props:

```ts
type Props = {
  paletteId: string
  position: number
  paint: ColorWheelPaint        // current slot paint (must have non-null hue_id)
  open: boolean
  onClose: () => void
  onSwapped: () => void          // parent re-renders / shows confirmation
}
```

Internal state: `{ sRange, lRange, ownedOnly }`. On mount (or when `open` flips true), call `getHueSwapCandidates({ paletteId, position })` once and stash `{ candidates, ownedIds, hueGroupName }` in `useState`. Re-rank/filter pure-locally as state changes:

```ts
const visible = pipe(
  candidates,
  (xs) => filterPaintsByHslRange(xs, { sMin: sRange[0], sMax: sRange[1], lMin: lRange[0], lMax: lRange[1] }),
  (xs) => (ownedOnly ? xs.filter((p) => ownedIds.has(p.id)) : xs),
  (xs) => rankPaintsByDeltaE(paint.hex, xs, 40),
)
```

Header: 32×32 swatch + paint name + `Hue group: {hueGroupName}`. Sliders region. "Owned only" toggle (only rendered if user is signed in — gate via the `ownedIds` payload presence). Body: scrollable `grid grid-cols-2 sm:grid-cols-3` of candidate cards.

Empty states:
- While the candidate fetch is pending: skeleton grid.
- Filters narrow to zero: muted line `"No same-hue paints match these ranges. Try widening saturation or lightness."` — or `"No paints in your collection match these ranges."` if `ownedOnly` is on.

On candidate select: call `swapPalettePaint(paletteId, position, newPaintId)`; on `{ error }` show inline `aria-live="polite"` error and stay open; on success call `onSwapped()` then `onClose()`.

#### C4. `palette-swap-button.tsx`

Icon-only `btn btn-ghost btn-xs btn-square`. Lucide `Replace` icon. Default `aria-label="Swap by hue"`. Props:

```ts
type Props = {
  paletteId: string
  position: number
  paint: ColorWheelPaint
}
```

If `paint.hue_id == null`, render the button with `disabled` and a `title` tooltip: `"This paint has no hue assigned and can't be swapped by hue."` Otherwise click flips `open` for a `<PaletteSwapDialog>` it owns.

### Phase D — Server actions

#### D1. `get-hue-swap-candidates.ts`

```ts
async function getHueSwapCandidates(input: {
  paletteId: string
  position: number
}): Promise<
  | { error: string }
  | {
      candidates: ColorWheelPaint[]
      ownedIds: string[]              // marshaled to client; client wraps in Set
      hueGroupName: string
    }
>
```

1. Auth: `supabase.auth.getUser()` — return error if signed out.
2. Load palette via `paletteService.getPaletteById(paletteId)`. Verify `palette.userId === user.id`.
3. Read `palette.paints[position]` to get the source paint. Return error if out of range or `paint.hue_id` is null.
4. `principalHueId = await resolvePrincipalHueId(hueService, paint.hue_id)`. Return error if null.
5. Load `principalHue.name` for the dialog header (`hueService.getHueById(principalHueId).name`).
6. `candidates = await paintService.listColorWheelPaintsByHueGroup(principalHueId)`.
7. `ownedIds = Array.from(await collectionService.getUserPaintIds(user.id))`.
8. Return `{ candidates, ownedIds, hueGroupName: principalHue.name }`.

#### D2. `swap-palette-paint.ts`

Mirrors `appendPaintToPalette` (read-modify-write via `setPalettePaints`):

```ts
async function swapPalettePaint(
  paletteId: string,
  position: number,
  newPaintId: string,
): Promise<{ error: string } | undefined>
```

1. Validate inputs (non-empty strings, integer `position >= 0`).
2. Auth: signed in.
3. Load palette; verify ownership.
4. Validate `position` in range (`0 <= position < paints.length`).
5. If `paints[position].paintId === newPaintId`, return `undefined` (no-op success — see Risks: "Saving same paint is a no-op").
6. *(Optional v1 hardening — defer if pure UI gating is judged sufficient)*: load the new paint via paint-service, resolve its principal hue, compare against the source paint's principal hue, return error on mismatch. The UI never offers a cross-group candidate, so this is defense-in-depth for direct API calls; consider implementing only if RLS/policy doesn't already block out-of-set writes.
7. Build the next slot list: clone `palette.paints`, replace `[position].paintId = newPaintId`, preserve `note`. Pass through `normalizePalettePositions`.
8. `await service.setPalettePaints(paletteId, normalized)`. Return `{ error }` if it fails.
9. `revalidatePath('/palettes/{paletteId}')` and `revalidatePath('/palettes/{paletteId}/edit')`.

### Phase E — Wire-up

#### E1. Mount the button on `palette-paint-row.tsx`

Render `<PaletteSwapButton paletteId={paletteId} position={position} paint={paint} />` immediately before the existing `<form>` that mounts the remove button (so visual order is: drag handle → swatch → name/brand/note → swap → remove). The button manages its own dialog state, so the row stays simple. No prop signature change needed for `PalettePaintList` — `position` and `paint` are already in scope.

#### E2. Optimistic UX (defer to v1.1 if scope creeps)

Server-action revalidation will refresh the row after a few hundred ms. v1 ships without optimistic update — the dialog closes, the page revalidates. If feedback requests a smoother feel, lift `paints` state into `palette-paint-list.tsx` and apply the swap optimistically before the action resolves, mirroring the rollback pattern already used for reorder.

### Manual QA

- Open the swap dialog on a blue paint — only blue-group paints render in the grid; header reads `Hue group: Blue` (or whichever principal name applies).
- Move sat slider to `[0, 30]` — only desaturated blues remain; ΔE values rise as candidates drift further from the source.
- Move lightness slider to `[60, 100]` — only light blues remain.
- Toggle "Owned only" — narrows further; "Owned" pills are visible on remaining cards.
- Select a candidate — dialog closes, row re-renders with the new paint, position and note preserved.
- Try the swap on a paint with `hue_id = null` — button is disabled with tooltip, dialog never opens.
- Click swap, change nothing, close — state unchanged; no errors.
- Direct call with the same paintId already in the slot — returns success no-op.
- `npm run build` + `npm run lint`.

## Risks & Considerations

- **Munsell hue model confirmed, but `hue_id` may be null**: `paints.hue_id` references the self-referencing `hues` table; principals have `parent_id IS NULL`, sub-hues have it set. The "hue group" is the principal plus all its sub-hues. Some paints — especially low-saturation/neutral entries — may have `hue_id = null`; the swap button is disabled with a tooltip in that case.
- **Lab + ΔE primitives don't exist yet**: contrary to the original draft, `color-wheel/utils/` ships `hex-to-hsl.ts` and `hsl-to-hex.ts` but no Lab or ΔE helpers. Phase A adds them. Keep them under `color-wheel/utils/` so `04-cross-brand-comparison` can reuse them later instead of duplicating.
- **Dual-thumb sliders without a library**: Tailwind doesn't ship a native two-thumb range. The simplest approach is two overlapping `<input type="range">` with custom track CSS. If that gets fiddly, drop in a single tiny dependency (e.g., `react-range`) — keep the swap behind that import boundary so it can be removed later.
- **Performance**: HSL filtering + Lab ranking run client-side over the candidate set on every slider tick. The candidate set is hue-group-scoped (typically <100 paints), not the full database, so the cost is bounded. The ranker still caches `hexToLab(paint.hex)` in a `Map` keyed by paint id to avoid recomputing Lab between renders.
- **"Same hue" ambiguity**: a user might expect "same hue" to mean "exact ISCC-NBS sub-hue" (e.g., 7.5R). v1 uses the broader principal hue **group** because the wheel UI already talks in those groups. If feedback says it's too loose, add a "Strict hue" toggle in v2 that narrows to `paint.hue_id == source.hue_id`.
- **No persistent slot identity**: the `palette_paints` schema is `(palette_id, position)` composite — there is no `slot_id` column. Swap is implemented as read-modify-write via `setPalettePaints` / `replace_palette_paints` RPC, the same pattern used by `appendPaintToPalette`. Position and note are preserved across the swap. **Implication for Epic 12**: `recipe_step_paints` will need either to reference paints directly or a future migration that introduces a stable slot id; revisit when that epic lands.
- **Off-database custom colors (deferred)**: true painter intent is sometimes "I want this exact custom mix." That requires a `custom_hex` column and is explicitly out of scope here — see the `00-palette-schema` "Future custom hex slots" note.

## Notes

- This feature depends only on the existing `palette_paints` schema and the Munsell hue refactor (already shipped in `02-paint-data-search/04-munsell-hue-refactor.md`). No DB migration needed for this feature.
- Sequence within Epic 11: 00 → 01 → 02 → 03 → 04.
- The `listColorWheelPaintsByHueGroup` query lives in `paint-service.ts` (paints module) so it sits next to existing same-shape queries; the palette-side utilities (`resolvePrincipalHueId`, `filterPaintsByHslRange`, `rankPaintsByDeltaE`) stay in `palettes/utils/` until a second consumer needs them.
- Color-math primitives (`hexToLab`, `deltaE76`) are introduced by this feature and live in `color-wheel/utils/` — `04-cross-brand-comparison` should depend on these rather than re-implementing.
