# Palette Module Refactor

**Epic:** Application Improvements
**Type:** Refactor
**Status:** Todo
**Branch:** `refactor/palette-module`
**Merge into:** `main`

## Summary

The palette module (~4,700 lines across 55 files) has accumulated several patterns that complicate maintenance and readability — particularly around the edit palette page. Three root causes were identified:

1. **Component logic that belongs in utilities** — data transforms, string formatters, derived values, and DnD seeding functions are embedded inside components where they cannot be tested or reused.
2. **Repeated boilerplate across 17 server actions** — auth guard, ownership check, and revalidation paths are copy-pasted in each file.
3. **Inconsistent action result shapes** — a mix of `{ error } | undefined`, `{ ok, ... }`, and `{ error, code }` return types makes callsite handling fragile.

The refactor is split into six independent groups ordered by risk and impact. Groups 1–3 target edit palette page complexity directly. Groups 4–6 are module-wide but can be done incrementally.

## Acceptance Criteria

- [ ] `PaletteGroupedPaintList` is reduced by at least 80 lines; no utility logic remains inline in the component.
- [ ] `seedMaster`, `seedGroupRefs`, `seedGroups`, `resolveTargetGroupId`, `getActiveGroupIds`, and `getGroupRingClass` live in dedicated utility files with JSDoc.
- [ ] `formatBrandLine` utility exists and is used in both `PalettePaintRow` and `PaletteSwapCandidateCard`.
- [ ] `add-to-palette-menu.tsx` uses `useReducer` with a typed `MenuState` discriminated union; the `lastOpen` ref is removed.
- [ ] `requirePaletteOwnership` and `requireAuth` utilities exist; all 14 ownership-checking actions use them.
- [ ] `revalidatePaletteList`, `revalidatePaletteDetail`, and `revalidatePalette` utilities exist; all write actions use them.
- [ ] `ActionResult<T>` / `VoidResult` types exist; all 17 actions return typed results (no `| undefined`).
- [ ] Build and lint pass with no new errors.

## Scope

### Module audit summary

| Layer | Files | Lines |
|---|---|---|
| `components/` | 24 | ~2,565 |
| `actions/` | 17 | ~963 |
| `services/` | 1 | 735 |
| `types/` | 6 | 236 |
| `utils/` | 6 | 184 |
| `validation.ts` | 1 | 63 |

The edit palette page composes: `PaletteBuilder` → `PaletteGroupedPaintList` + `PalettePaintPicker` + sort controls.

---

## Implementation Steps

### Group 1: Extract DnD utilities from `palette-grouped-paint-list.tsx`

`src/modules/palettes/components/palette-grouped-paint-list.tsx` is 325 lines and embeds six distinct non-UI concerns.

#### Inline logic to extract

| Logic | Current lines | Reason for extraction |
|---|---|---|
| `seedMaster()` | ~10 | Pure transform: `PalettePaint[]` → `MasterDraggable[]`. No React deps. |
| `seedGroupRefs()` | ~15 | Pure transform: `PaletteGroup[]` → `Map<string, GroupRefDraggable[]>`. No React deps. |
| `seedGroups()` | ~5 | Pure transform: `PaletteGroup[]` → `DraggableGroup[]`. No React deps. |
| `resolveTargetGroupId()` | ~10 | Pure lookup on two collections. Could be used by any DnD list. |
| `getActiveGroupIds()` | ~8 | Pure Map traversal; derives which groups contain a given paint. |
| `getGroupRingClass()` | ~8 | Pure CSS class derivation from `GroupDropState` union value. |

The three branches inside `handleDragEnd` (group reorder, master reorder, cross-zone add) each become a named private function within the component file. They stay in component scope because they close over `startTransition` and state setters, but the dispatcher becomes a ~10-line function instead of a 73-line monolith.

#### Files to create

1. `src/modules/palettes/utils/seed-dnd-items.ts`
   - Exports `seedMaster(paints)`, `seedGroupRefs(groups)`, `seedGroups(groups)`
   - Also exports the `MasterDraggable`, `GroupRefDraggable`, `DraggableGroup` types (move from component)

2. `src/modules/palettes/utils/resolve-group-target.ts`
   - Exports `resolveTargetGroupId(dndId, draggableGroups, groupRefs): string | null`

3. `src/modules/palettes/utils/get-active-group-ids.ts`
   - Exports `getActiveGroupIds(palettePaintId, groupRefs): string[]`

4. `src/modules/palettes/utils/group-ring-class.ts`
   - Exports `getGroupRingClass(groupId, groupDropState): string`
   - The `GroupDropState` type moves here (or to `types/group-drop-state.ts`)

#### Files to modify

- `src/modules/palettes/components/palette-grouped-paint-list.tsx` — import from new utils; split `handleDragEnd` into three inner functions; remove extracted type definitions

---

### Group 2: Extract `formatBrandLine` utility

Two components contain the same inline expression:
```ts
[paint.brand_name, paint.product_line_name].filter(Boolean).join(': ')
```

#### Files to create

1. `src/modules/palettes/utils/format-brand-line.ts`
   - Exports `formatBrandLine(brandName: string | null, productLineName: string | null): string`

#### Files to modify

- `src/modules/palettes/components/palette-paint-row.tsx` — replace inline expression
- `src/modules/palettes/components/palette-swap-candidate-card.tsx` — replace inline expression

---

### Group 3: Refactor `add-to-palette-menu.tsx` to `useReducer`

The component manages a 4-state machine using a `useState` string plus a `lastOpen` ref to trigger fetches on open. The `if (open && !lastOpen)` guard is a subtle timing hack that obscures intent.

#### Current state shape (to replace)
```ts
const [menuState, setMenuState] = useState<'loading' | 'error' | 'list' | 'create'>('loading')
const lastOpen = useRef(false)
```

#### Target state shape
```ts
type MenuState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'list'; palettes: PaletteSummary[] }
  | { status: 'create' }

type MenuAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; palettes: PaletteSummary[] }
  | { type: 'FETCH_ERROR'; message: string }
  | { type: 'SHOW_CREATE' }
  | { type: 'SHOW_LIST' }
  | { type: 'RESET' }
```

Replace the `lastOpen` ref + conditional fetch with a `useEffect` on `open`:
```ts
useEffect(() => {
  if (!open) { dispatch({ type: 'RESET' }); return }
  dispatch({ type: 'FETCH_START' })
  // ... fetch ...
}, [open])
```

#### Files to modify

- `src/modules/palettes/components/add-to-palette-menu.tsx`

---

### Group 4: Auth and ownership guard utilities

Fourteen actions repeat this ~15-line block:
```ts
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return { error: 'You must be signed in.' }
const service = createPaletteService(supabase)
const palette = await service.getPaletteById(paletteId)
if (!palette) return { error: 'Palette not found.' }
if (palette.userId !== user.id) return { error: 'Not authorized.' }
```

#### Files to create

1. `src/modules/palettes/utils/require-auth.ts`
   ```ts
   // Returns the authenticated user + supabase client, or an error result.
   requireAuth(): Promise<
     | { ok: true; user: User; supabase: SupabaseClient }
     | { ok: false; error: string }
   >
   ```

2. `src/modules/palettes/utils/require-palette-ownership.ts`
   ```ts
   // Returns user, supabase client, palette, and service if the caller owns the palette.
   requirePaletteOwnership(paletteId: string): Promise<
     | { ok: true; user: User; supabase: SupabaseClient; palette: Palette; service: PaletteService }
     | { ok: false; error: string }
   >
   ```

#### Files to modify

All 14 ownership-checking actions — replace the boilerplate block with a `requirePaletteOwnership` call and early return on `!result.ok`.

---

### Group 5: Centralize revalidation paths

Write actions revalidate different combinations of paths with no central record. Some revalidate 4 paths, some 2; one uses a slightly different variant.

#### Files to create

1. `src/modules/palettes/utils/revalidate-palette.ts`
   ```ts
   revalidatePaletteList(): void
   // Revalidates: /user/palettes, /palettes

   revalidatePaletteDetail(paletteId: string): void
   // Revalidates: /palettes/:id, /user/palettes/:id/edit

   revalidatePalette(paletteId: string): void
   // Calls both of the above
   ```

#### Files to modify

All 17 write actions — replace inline `revalidatePath` calls with the appropriate utility call.

---

### Group 6: Standardize action result types

Currently actions return a mix of:
- `{ error: string } | undefined` (most common — `undefined` return forces `?.error` checks)
- `{ ok: true } | { ok: false; error: string }` (a few)
- `AddPaintToPaletteResult` (custom discriminated union with `code` field)

The `| undefined` pattern is the largest footgun — TypeScript allows `result.error` without the null check and won't warn on the omission.

#### Files to create

1. `src/modules/palettes/types/action-result.ts`
   ```ts
   /** Standard result type for palette server actions. */
   type ActionResult<T = void> =
     | { ok: true; data: T }
     | { ok: false; error: string }

   /** Shorthand for actions with no return data. */
   type VoidResult = ActionResult<void>
   ```

#### Files to modify

- All 17 action files — change return type from `Promise<{ error: string } | undefined>` to `Promise<VoidResult>` (or `Promise<ActionResult<T>>` for data-returning actions)
- All component callsites that check `result?.error` — update to `!result.ok` guard

---

## Key Files

### Components
- `src/modules/palettes/components/palette-grouped-paint-list.tsx` — primary target; DnD logic extraction
- `src/modules/palettes/components/add-to-palette-menu.tsx` — state machine refactor
- `src/modules/palettes/components/palette-paint-row.tsx` — brand line extraction
- `src/modules/palettes/components/palette-swap-candidate-card.tsx` — brand line extraction

### New utilities
- `src/modules/palettes/utils/seed-dnd-items.ts`
- `src/modules/palettes/utils/resolve-group-target.ts`
- `src/modules/palettes/utils/get-active-group-ids.ts`
- `src/modules/palettes/utils/group-ring-class.ts`
- `src/modules/palettes/utils/format-brand-line.ts`
- `src/modules/palettes/utils/require-auth.ts`
- `src/modules/palettes/utils/require-palette-ownership.ts`
- `src/modules/palettes/utils/revalidate-palette.ts`

### New types
- `src/modules/palettes/types/action-result.ts`
- `src/modules/palettes/types/group-drop-state.ts` (moved from component)

### Actions (all 17)
- `src/modules/palettes/actions/*.ts`
