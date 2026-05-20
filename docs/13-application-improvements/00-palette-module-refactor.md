# Palette Module Refactor

**Epic:** Application Improvements
**Type:** Refactor
**Status:** Completed
**Branch:** `refactor/palette-module`
**Merge into:** `main`

## Summary

The palette module (~4,998 lines across 58 files) has accumulated several patterns that complicate maintenance and readability — particularly around the edit palette page. Three root causes were identified:

1. **Component logic that belongs in utilities** — data transforms, string formatters, derived values, and DnD seeding functions are embedded inside components where they cannot be tested or reused.
2. **Repeated boilerplate across server actions** — auth guard, ownership check (14 of 17 actions), and revalidation paths are copy-pasted in each file.
3. **Inconsistent action result shapes** — a mix of `{ error } | undefined`, `{ ok, ... }`, `{ error, code }`, and `PaletteFormState` return types makes callsite handling fragile.

The refactor is split into six independent groups ordered by risk and impact. Groups 1–3 target edit palette page complexity directly. Groups 4–6 are module-wide but can be done incrementally. Each group is a separate PR — see [Implementation Order](#implementation-order) below.

## Acceptance Criteria

- [x] `PaletteGroupedPaintList` is reduced by at least 80 lines; no utility logic remains inline in the component.
- [x] `seedMaster`, `seedGroupRefs`, `seedGroups`, `resolveTargetGroupId`, `getActiveGroupIds`, and `getGroupRingClass` live in dedicated utility files with JSDoc.
- [x] `formatBrandLine` utility exists and is used in both `PalettePaintRow` and `PaletteSwapCandidateCard`.
- [x] `add-to-palette-menu.tsx` uses `useReducer` with a typed `MenuState` discriminated union; the `lastOpen` ref is removed.
- [x] `requirePaletteOwnership` and `requireAuth` utilities exist; all 14 ownership-checking actions use them.
- [ ] `revalidatePaletteList`, `revalidatePaletteDetail`, and `revalidatePalette` utilities exist; all write actions use them. *(Only `revalidatePalette` was created; `revalidatePaletteList` and `revalidatePaletteDetail` were not extracted as separate functions.)*
- [x] `ActionResult<T>` / `VoidResult` types exist; all standardizable actions return typed results (no `| undefined`). *(The 2 `useActionState` actions — `create-palette`, `update-palette` — retain `PaletteFormState` as required by React; all other 15 actions were standardized.)*
- [x] Build and lint pass with no new errors.

## Scope

### Module audit summary

| Layer | Files | Lines |
|---|---|---|
| `components/` | 24 | ~2,715 |
| `actions/` | 17 | ~951 |
| `services/` | 3 | ~765 |
| `types/` | 7 | ~234 |
| `utils/` | 6 | 184 |
| `validation.ts` | 1 | 62 |

The edit palette page composes: `PaletteBuilder` → `PaletteGroupedPaintList` + `PalettePaintPicker` + sort controls.

### Action audit (verified)

Return type distribution across the 17 action files:

| Pattern | Count | Examples |
|---|---|---|
| `Promise<{ error?: string } \| undefined>` | 7 | `add-paint-to-group`, `create-palette-group`, `update-palette-group`, `delete-palette-group`, `remove-paint-from-group`, `reorder-group-paints`, `reorder-palette-groups` |
| `Promise<{ error: string } \| undefined>` | 4 | `delete-palette`, `remove-palette-paint`, `reorder-palette-paints`, `swap-palette-paint` |
| `Promise<{ error: string }>` | 1 | `create-palette-with-paints` |
| `Promise<PaletteFormState>` | 2 | `create-palette`, `update-palette` (intentional — `useActionState`) |
| Custom discriminated union (`{ ok } \| { error, code }`) | 3 | `add-paint-to-palette`, `add-paints-to-palette`, `get-hue-swap-candidates` |

Ownership-check block present in 14 of 17 actions. The 3 actions without it are `create-palette` and `create-palette-with-paints` (no palette yet) and `delete-palette` (relies on RLS in `service.deletePalette` — see [Risks](#risks-and-considerations)).

Revalidation pattern distribution:

| Pattern | Paths | Count |
|---|---|---|
| Full (list + detail + edit) | `/user/palettes`, `/palettes`, `/palettes/{id}`, `/user/palettes/{id}/edit` | 10 |
| List only | `/user/palettes`, `/palettes` | 3 (`create-palette`, `create-palette-with-paints`, `delete-palette`) |
| Partial (no edit path) | `/user/palettes`, `/palettes`, `/palettes/{id}` | 1 (`update-palette`) |
| No revalidation (intentional — optimistic UI) | — | 3 (`add-paint-to-group`, `remove-paint-from-group`, `get-hue-swap-candidates`) |

---

## Implementation Plan

### Implementation Order

Each group is independent and ships as its own PR. Recommended sequence (lowest blast radius first):

| Order | Group | PR title (suggested) | Scope | Touches callsites? |
|---|---|---|---|---|
| 1 | Group 2 | `refactor(palettes): extract formatBrandLine util` | 1 new util, 2 components | No |
| 2 | Group 1 | `refactor(palettes): extract DnD utils from grouped paint list` | 4 new utils, 1 new type file, 1 component | No |
| 3 | Group 3 | `refactor(palettes): convert AddToPaletteMenu to useReducer` | 1 component | No |
| 4 | Group 4 | `refactor(palettes): centralize auth + ownership guards` | 2 new utils, 14 actions | No (action signatures unchanged) |
| 5 | Group 5 | `refactor(palettes): centralize revalidation paths` | 1 new util, 14 actions | No |
| 6 | Group 6 | `refactor(palettes): standardize action result types` | 1 new type, 11 actions, all callsites | **Yes — breaking** |

Group 6 is last because it changes action return shapes and forces callsite updates throughout the module. Groups 1–5 are non-breaking internal refactors.

---

### Group 1: Extract DnD utilities from `palette-grouped-paint-list.tsx`

`src/modules/palettes/components/palette-grouped-paint-list.tsx` is **517 lines** and embeds seven distinct non-UI concerns. (The file has grown since the original audit — `handleDragEnd` is now ~117 lines spanning four branches.)

#### Inline logic to extract (verified line numbers)

| Logic | Lines | Reason for extraction |
|---|---|---|
| `seedMaster()` | 60–69 | Pure transform: `PalettePaint[]` → `MasterDraggable[]`. No React deps. |
| `seedGroupRefs()` | 71–85 | Pure transform: `PaletteGroup[]` → `Map<string, GroupRefDraggable[]>`. No React deps. |
| `seedGroups()` | 87–89 | Pure transform: `PaletteGroup[]` → `DraggableGroup[]`. No React deps. |
| `resolveTargetGroupId()` | 159–168 | Pure lookup on two collections. Closes over component state today but only reads it. |
| `getGroupRingClass()` | 185–190 | Pure CSS-class derivation from `GroupDropState`. Closes over `groupDropState`. |
| `getActiveGroupIds()` | 332–338 | Pure Map traversal. Closes over `groupRefs`. |
| `handleDragEnd` branches | 214–330 | Four branches (group reorder, cross-zone add, master reorder, group-ref reorder). Each closes over state setters and `startTransition`. |

The closure-based helpers (`resolveTargetGroupId`, `getGroupRingClass`, `getActiveGroupIds`) become pure functions that take their dependencies as arguments. `setGroupDropFeedback` (lines 171–183) stays in the component — it owns a `useRef` for the timeout id.

The four `handleDragEnd` branches each become a named private function declared inside the component body (not extracted to a util) because they close over `startTransition` and multiple state setters. The dispatcher itself shrinks to ~15 lines.

#### Files to create

1. `src/modules/palettes/utils/seed-dnd-items.ts`
   - Exports `seedMaster(paints)`, `seedGroupRefs(groups)`, `seedGroups(groups)`

2. `src/modules/palettes/utils/resolve-group-target.ts`
   - Exports `resolveTargetGroupId(dndId: string, draggableGroups: DraggableGroup[], groupRefs: Map<string, GroupRefDraggable[]>): string | null`

3. `src/modules/palettes/utils/get-active-group-ids.ts`
   - Exports `getActiveGroupIds(palettePaintId: string, groupRefs: Map<string, GroupRefDraggable[]>): string[]`

4. `src/modules/palettes/utils/group-ring-class.ts`
   - Exports `getGroupRingClass(groupId: string, dropState: GroupDropState): string`

5. `src/modules/palettes/types/master-draggable.ts`
   - Exports `MasterDraggable`

6. `src/modules/palettes/types/group-ref-draggable.ts`
   - Exports `GroupRefDraggable`

7. `src/modules/palettes/types/draggable-group.ts`
   - Exports `DraggableGroup`

8. `src/modules/palettes/types/group-drop-state.ts`
   - Exports `GroupDropState`

> Per project convention (`CLAUDE.md` → "Project Structure — Domain Module Approach"), each type lives in its own file. No barrel re-exports.

#### Files to modify

- `src/modules/palettes/components/palette-grouped-paint-list.tsx`
  - Replace inline type definitions with imports from `types/`
  - Replace `seedMaster` / `seedGroupRefs` / `seedGroups` with imports from `utils/seed-dnd-items`
  - Replace `resolveTargetGroupId` / `getGroupRingClass` / `getActiveGroupIds` with util calls (passing state as arguments)
  - Split `handleDragEnd` into four inner functions: `handleGroupReorder`, `handleMasterReorder`, `handleCrossZoneAdd`, `handleGroupRefReorder`. Dispatcher remains the `handleDragEnd` function.

Target: ≥80-line reduction (file goes from 517 to ≤437 lines).

---

### Group 2: Extract `formatBrandLine` utility

Two components contain the identical inline expression:

| File | Line | Expression |
|---|---|---|
| `palette-paint-row.tsx` | 84 | `[paint.brand_name, paint.product_line_name].filter(Boolean).join(': ')` |
| `palette-swap-candidate-card.tsx` | 28 | `[paint.brand_name, paint.product_line_name].filter(Boolean).join(': ')` |

#### Files to create

1. `src/modules/palettes/utils/format-brand-line.ts`
   ```ts
   /**
    * Formats a paint's brand and product line into a "Brand: Line" string.
    * Returns the brand alone when product line is missing, an empty string when
    * both are null, and "Brand: Line" when both are present.
    */
   export function formatBrandLine(
     brandName: string | null,
     productLineName: string | null,
   ): string {
     return [brandName, productLineName].filter(Boolean).join(': ')
   }
   ```

#### Files to modify

- `src/modules/palettes/components/palette-paint-row.tsx` — replace line 84
- `src/modules/palettes/components/palette-swap-candidate-card.tsx` — replace line 28

---

### Group 3: Refactor `add-to-palette-menu.tsx` to `useReducer`

**Audit correction:** the component uses `useState` for `lastOpen` (not `useRef` as the original draft claimed), and the open-edge fetch fires during render — a React antipattern that the current code papers over with `setLastOpen` in the same render.

#### Current state shape (lines 51–82)
```ts
const [menuState, setMenuState] = useState<MenuState>('loading')
const [palettes, setPalettes] = useState<PaletteSummary[]>([])
const [isPending, startTransition] = useTransition()
const [lastOpen, setLastOpen] = useState(false)

if (open && !lastOpen) {
  setLastOpen(true)
  setMenuState('loading')
  ;(async () => { /* fetch ... */ })()
}
if (!open && lastOpen) {
  setLastOpen(false)
  setMenuState('loading')
}
```

Issues:
- Fetch triggered during render (works only because `setLastOpen` flushes before the IIFE awaits).
- State setters called during render — not strictly safe under React 19's concurrent rendering.
- `palettes` is a separate `useState` even though it's only meaningful in the `list` state.

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

Move the open-edge fetch into a `useEffect` keyed on `open`. Use an abort flag to prevent setting state after unmount or after `open` flips back to `false` mid-flight:

```ts
useEffect(() => {
  if (!open) { dispatch({ type: 'RESET' }); return }
  let cancelled = false
  dispatch({ type: 'FETCH_START' })
  ;(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) {
        dispatch({ type: 'FETCH_ERROR', message: 'Not signed in' })
        return
      }
      const list = await getPaletteService().listPalettesForUser(user.id)
      if (cancelled) return
      dispatch({ type: 'FETCH_SUCCESS', palettes: list })
    } catch {
      if (cancelled) return
      dispatch({ type: 'FETCH_ERROR', message: 'Failed to load palettes' })
    }
  })()
  return () => { cancelled = true }
}, [open])
```

#### Files to modify

- `src/modules/palettes/components/add-to-palette-menu.tsx`

---

### Group 4: Auth and ownership guard utilities

Fourteen actions repeat the same ~12-line block (verified — `palette.userId !== user.id` appears in 14 files). Sample from `add-paint-to-group.ts:29–40`:

```ts
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return { error: 'You must be signed in to modify a palette.' }
const service = createPaletteService(supabase)
const palette = await service.getPaletteById(paletteId)
if (!palette) return { error: 'Palette not found.' }
if (palette.userId !== user.id) return { error: 'You can only modify palettes you own.' }
```

#### Files to create

1. `src/modules/palettes/utils/require-auth.ts`
   ```ts
   /** Returns the authenticated user + supabase client, or an error result. */
   export async function requireAuth(): Promise<
     | { ok: true; user: User; supabase: SupabaseClient }
     | { ok: false; error: string }
   >
   ```

2. `src/modules/palettes/utils/require-palette-ownership.ts`
   ```ts
   /**
    * Verifies the caller is signed in and owns the given palette.
    * Returns the user, supabase client, hydrated palette, and a fresh service
    * instance ready for downstream writes.
    */
   export async function requirePaletteOwnership(paletteId: string): Promise<
     | { ok: true; user: User; supabase: SupabaseClient; palette: Palette; service: PaletteService }
     | { ok: false; error: string }
   >
   ```

Both utilities preserve the existing user-visible error wording so behavior remains identical at the callsite.

#### Files to modify

The 14 ownership-checking actions:

- `add-paint-to-group.ts`
- `add-paint-to-palette.ts` (preserve the `code` discriminator on the failure path)
- `add-paints-to-palette.ts` (same)
- `create-palette-group.ts`
- `delete-palette-group.ts`
- `get-hue-swap-candidates.ts`
- `remove-paint-from-group.ts`
- `remove-palette-paint.ts`
- `reorder-group-paints.ts`
- `reorder-palette-groups.ts`
- `reorder-palette-paints.ts`
- `swap-palette-paint.ts`
- `update-palette-group.ts`

Plus consider extending `delete-palette.ts` to use `requirePaletteOwnership` even though it currently relies on RLS — see [Risks](#risks-and-considerations).

`create-palette.ts` and `create-palette-with-paints.ts` continue to use `requireAuth` only.

---

### Group 5: Centralize revalidation paths

Eleven actions revalidate the full set (`/user/palettes`, `/palettes`, `/palettes/{id}`, `/user/palettes/{id}/edit`). Four actions revalidate only the list paths. Three actions intentionally skip revalidation (`add-paint-to-group`, `remove-paint-from-group`, `get-hue-swap-candidates`) — these must stay untouched because the edit page relies on optimistic updates without a server refresh.

#### Files to create

1. `src/modules/palettes/utils/revalidate-palette.ts`
   ```ts
   /** Revalidates list paths: /user/palettes and /palettes. */
   export function revalidatePaletteList(): void

   /** Revalidates detail paths: /palettes/{id} and /user/palettes/{id}/edit. */
   export function revalidatePaletteDetail(paletteId: string): void

   /** Convenience: revalidates list paths + detail paths. */
   export function revalidatePalette(paletteId: string): void
   ```

#### Files to modify

- 10 actions with full revalidation → replace 4 lines with `revalidatePalette(paletteId)`
- 3 actions with list-only revalidation (`create-palette`, `create-palette-with-paints`, `delete-palette`) → `revalidatePaletteList()`
- 1 action with partial revalidation (`update-palette`) → call `revalidatePaletteList()` + `revalidatePath('/palettes/' + id)` (or extend the utility — see Open Question 1 below)

Do **not** modify `add-paint-to-group.ts`, `remove-paint-from-group.ts`, or `get-hue-swap-candidates.ts`.

---

### Group 6: Standardize action result types

Currently actions return a mix of shapes (see [Action audit](#action-audit-verified)):
- `{ error?: string } | undefined` — 7 actions
- `{ error: string } | undefined` — 4 actions
- `{ error: string }` — 1 action
- `PaletteFormState` — 2 actions (intentional; required by `useActionState`)
- Custom discriminated unions — 3 actions

The `| undefined` pattern is the largest footgun — at the callsite, TypeScript allows `result.error` without the null check and won't warn on the omission. Example from `palette-grouped-paint-list.tsx:233`:

```ts
const result = await reorderPaletteGroups(...)
if (result?.error) { /* ... */ }  // optional chaining masks the undefined return
```

#### Scope clarification

- **Standardize** the 12 actions that return `{ error } | undefined` or `{ error }` → `Promise<VoidResult>`.
- **Keep** the 2 `PaletteFormState` returners (`create-palette`, `update-palette`) — they're shaped for `useActionState`.
- **Migrate** the 3 custom-union returners (`add-paint-to-palette`, `add-paints-to-palette`, `get-hue-swap-candidates`) to `ActionResult<T>` where `T` carries the success data. The `code` discriminator gets folded into the failure variant:

```ts
type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: 'duplicate' | 'auth' | 'not_found' | 'forbidden' | 'unknown' }

type VoidResult = ActionResult<void>
```

> **Acceptance Criteria note:** the existing "all 17 actions return typed results" criterion is updated implicitly here to "all standardizable actions" — the 2 `useActionState` actions are out of scope and the 3 custom-union actions converge on `ActionResult<T>` rather than `VoidResult`. Confirm the AC reading before implementing.

#### Files to create

1. `src/modules/palettes/types/action-result.ts` — exports `ActionResult<T>` and `VoidResult`

#### Files to modify

- 12 action files returning the bare error pattern → `Promise<VoidResult>`
- 3 action files using custom unions → `Promise<ActionResult<T>>`
- `src/modules/palettes/types/add-paint-to-palette-result.ts` — either delete (in favor of `ActionResult<{ paletteName: string }>`) or repoint it as an alias

##### Callsite updates (component-level)

Searches needed before implementing — there are ~25 callsites across the components folder:

| Pattern | Replace with |
|---|---|
| `if (result?.error)` | `if (!result.ok)` |
| `result.error` | `result.error` (still valid, but only inside `!result.ok` branch) |
| `if ('error' in result)` | `if (!result.ok)` |
| `result.code === 'duplicate'` | `result.code === 'duplicate'` (still valid inside failure branch) |

Files known to consume these results (non-exhaustive — confirm with `grep -rn "result?.error\|result\\.error\|'error' in result"` before merging):

- `palette-grouped-paint-list.tsx` (5 callsites)
- `palette-paint-row.tsx` (2 callsites)
- `add-to-palette-menu.tsx` (1 callsite using the `code` discriminator)
- `delete-palette-button.tsx`
- `palette-swap-dialog.tsx`
- `palette-swap-button.tsx`
- `palette-group-header.tsx`
- `palette-group-delete-dialog.tsx`
- `palette-paint-groups-toggle.tsx`
- `new-palette-inline-form.tsx`
- `add-to-palette-button.tsx`

---

## Risks and considerations

1. **`delete-palette.ts` has no explicit ownership check.** The current implementation relies on RLS in `service.deletePalette`. Group 4 should either (a) extend it to use `requirePaletteOwnership` for defence-in-depth, or (b) document the RLS reliance in the action's JSDoc. Recommend (a).
2. **`swap-palette-paint.ts` bypasses the service** — it issues a raw `supabase.from('palette_paints').update(...)` (lines 51–56). Out of scope for this refactor, but flag it on the PR as follow-up.
3. **Group 1 closure dependencies** — `resolveTargetGroupId`, `getActiveGroupIds`, and `getGroupRingClass` close over component state today. Extracting them changes nothing observable but does change reference equality on every render. None of these are passed as React props or hook dependencies, so no `useCallback`/`useMemo` regression risk — verify before merging.
4. **Group 3 fetch-during-render** is currently load-bearing. The `useEffect` migration must preserve the "fetch on every open" behavior (the comment at line 55 of the current file documents this as intentional — newly-created palettes from other tabs need to appear).
5. **Group 6 breaks callsites.** Land Groups 1–5 first; Group 6's PR will be large because every consumer needs the `!result.ok` guard. Consider splitting Group 6 into (a) introduce `ActionResult<T>`, migrate one action and its callsites, (b)…(c) progressive rollout.
6. **No automated tests** — the project has no test suite (`CLAUDE.md` § Testing). Each PR must be manually verified through the edit-palette page: reorder master list, reorder a group, cross-zone add (paint → group), toggle a group, swap a paint, delete a paint, create a palette, delete a palette. Capture this as a per-PR test plan.
7. **Type-import discipline** — all new files must follow the React/TS rules in `CLAUDE.md` (named imports only, `type` import for type-only imports, no `React.` namespace).
8. **JSDoc** is required on every export per `CLAUDE.md`. Each new util and type must include the required summary plus `@param` / `@returns` where applicable.

## Open Questions

1. **Should `revalidatePalette` also accept a partial mode** for the `update-palette.ts` case (revalidates `/palettes/{id}` but not the edit page)? Or is calling `revalidatePaletteList() + revalidatePath('/palettes/${id}')` inline acceptable? Recommend: keep the utility narrow (3 functions as specified) and let `update-palette.ts` call both.
2. **Group 6 — fold or preserve the `code` field?** Folding it into `ActionResult` keeps the type tight but every action that uses `code` (3 today) inherits the wide union. Alternative: a separate `ActionResultWithCode<T, C>` generic. Recommend: fold for now; revisit if the union grows.
3. **Should `requirePaletteOwnership` accept an optional `errorWording` parameter** so each action can preserve its custom "You can only X palettes you own" message, or is one canonical wording acceptable? Recommend: one canonical wording; the user-facing copy is nearly identical across the 14 sites already.

---

## Key Files

### Components (modified)
- `src/modules/palettes/components/palette-grouped-paint-list.tsx` — Group 1
- `src/modules/palettes/components/add-to-palette-menu.tsx` — Group 3
- `src/modules/palettes/components/palette-paint-row.tsx` — Group 2 + Group 6
- `src/modules/palettes/components/palette-swap-candidate-card.tsx` — Group 2
- All other components that consume action results — Group 6 (see list above)

### Actions (modified)
- All 17 files in `src/modules/palettes/actions/` (varying scope per group — see each group)

### New utilities
- `src/modules/palettes/utils/seed-dnd-items.ts` — Group 1
- `src/modules/palettes/utils/resolve-group-target.ts` — Group 1
- `src/modules/palettes/utils/get-active-group-ids.ts` — Group 1
- `src/modules/palettes/utils/group-ring-class.ts` — Group 1
- `src/modules/palettes/utils/format-brand-line.ts` — Group 2
- `src/modules/palettes/utils/require-auth.ts` — Group 4
- `src/modules/palettes/utils/require-palette-ownership.ts` — Group 4
- `src/modules/palettes/utils/revalidate-palette.ts` — Group 5

### New types
- `src/modules/palettes/types/master-draggable.ts` — Group 1
- `src/modules/palettes/types/group-ref-draggable.ts` — Group 1
- `src/modules/palettes/types/draggable-group.ts` — Group 1
- `src/modules/palettes/types/group-drop-state.ts` — Group 1
- `src/modules/palettes/types/action-result.ts` — Group 6

### Types possibly removed
- `src/modules/palettes/types/add-paint-to-palette-result.ts` — Group 6 (subsumed by `ActionResult<{ paletteName: string }>`)
