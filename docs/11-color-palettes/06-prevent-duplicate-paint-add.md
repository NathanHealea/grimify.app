# Prevent Duplicate Paints in a Palette + Toast Feedback

**Epic:** Color Palettes
**Type:** Bug
**Status:** Todo
**Branch:** `bug/prevent-duplicate-paint-add`
**Merge into:** `v1/main`

## Summary

A palette is meant to hold each paint at most once, but the current implementation lets the same paint be added to a palette multiple times. The schema does not enforce uniqueness (`palette_paints` PK is `(palette_id, position)`), and `appendPaintToPalette` blindly appends without checking for an existing entry. The acceptance criteria in [`02-add-to-palette.md`](./02-add-to-palette.md) even codified the wrong behavior: _"Adding a paint already in the target palette is allowed (the schema permits duplicates)."_

In addition, success feedback is currently rendered as a small inline `aria-live="polite"` line inside the dropdown menu. Per `palette-form.tsx:24`, this convention exists "without requiring a toast library." The user-facing requirement has changed: success and failure should be surfaced as toasts instead.

This bug:

1. Makes "add paint to palette" reject duplicates and return a dedicated error message.
2. Replaces the inline confirmation with toast notifications (success and error).

## Expected Behavior

1. Selecting a palette in the "Add to palette" menu when the paint is **not yet** in that palette appends the paint and shows a success toast: _"Added '{paint name}' to '{palette name}'"_.
2. Selecting a palette when the paint **is already** in that palette shows an error toast: _"'{paint name}' is already in '{palette name}'"_; the palette is not modified.
3. Any other failure (auth, network, RPC error) shows an error toast with the underlying message.
4. The "Save scheme as palette" flow (which creates a new palette atomically) deduplicates its `paintIds` input so the same scheme color can't seed two slots.

## Actual Behavior

1. Selecting a palette twice for the same paint adds two `palette_paints` rows, one per position. The palette swatches show duplicates.
2. Success/failure show inline text inside the dropdown menu (`add-to-palette-menu.tsx:88-93`), which collapses when the menu closes and is easy to miss.

## Root Cause

**Service layer** (`src/modules/palettes/services/palette-service.ts:322-336`): `appendPaintToPalette` reads the palette, appends `{ position: palette.paints.length, paintId }`, and writes through `replace_palette_paints`. There is no check that `paintId` is absent from `palette.paints`.

**Schema** (`supabase/migrations/20260425000000_create_palettes_tables.sql:35-42`): The composite PK is `(palette_id, position)` rather than `(palette_id, paint_id)`, so no DB constraint catches the duplicate.

**UI** (`src/modules/palettes/components/add-to-palette-menu.tsx:76-93`): On result, `setConfirmation(...)` writes a string into a `<div aria-live="polite">` inside the menu. There is no toast component because the project has not added a toast library — see the JSDoc note on `palette-form.tsx:24`.

## Acceptance Criteria

- [ ] `appendPaintToPalette` returns `{ error, code: 'duplicate' }` when `paintId` already exists in the palette and does not write through the RPC.
- [ ] `appendPaintsToPalette` returns `{ error, code: 'duplicate', duplicateIds }` when any input paint is already in the palette and does not write any rows.
- [ ] `createPaletteWithPaints` deduplicates `paintIds` before inserting so a caller (e.g. "Save scheme as palette") cannot seed a brand-new palette with two of the same paint.
- [ ] `addPaintToPalette` server action propagates the `code: 'duplicate'` flag and the human-readable error.
- [ ] Selecting an existing palette for a paint already in it shows a toast _"'{paint name}' is already in '{palette name}'"_ — no inline message inside the menu.
- [ ] Selecting an existing palette for a new paint shows a toast _"Added '{paint name}' to '{palette name}'"_; the dropdown closes.
- [ ] Generic action errors (auth, network) show an error toast with the action's `error` string.
- [ ] The previous acceptance bullet in `02-add-to-palette.md` is updated to reflect the new behavior; the change is noted in this PR's commit body.
- [ ] `npm run build` and `npm run lint` pass with no errors.

## Out of Scope

- Adding a `UNIQUE (palette_id, paint_id)` constraint to `palette_paints`. The application layer enforces uniqueness in this fix; a follow-up migration can harden the schema and dedupe any pre-existing duplicate rows. See _Risks & Considerations_.
- Migrating other inline-confirmation surfaces (e.g. the palette form, delete-palette dialog) to the new toast system. Only the add-to-palette flow is in scope for this bug.

## Key Files

| Action | File                                                                       | Description                                                                                  |
| ------ | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Modify | `package.json`                                                             | Add `sonner` dependency.                                                                     |
| Modify | `src/app/layout.tsx`                                                       | Mount `<Toaster />` once at the root so any client component can call `toast(...)`.          |
| Create | `src/modules/palettes/types/add-paint-to-palette-result.ts`                | New `AddPaintToPaletteResult` discriminated union including the `'duplicate'` error code.    |
| Modify | `src/modules/palettes/services/palette-service.ts`                         | `appendPaintToPalette` / `appendPaintsToPalette` reject duplicates pre-RPC.                  |
| Modify | `src/modules/palettes/actions/add-paint-to-palette.ts`                     | Return the new result type with `code` field.                                                |
| Modify | `src/modules/palettes/actions/add-paints-to-palette.ts`                    | Same — also returns `duplicateIds` for caller-side messaging.                                |
| Modify | `src/modules/palettes/actions/create-palette-with-paints.ts`               | Dedupe `paintIds` before insert.                                                             |
| Modify | `src/modules/palettes/components/add-to-palette-menu.tsx`                  | Replace inline `confirmation` state with `toast.success` / `toast.error`; auto-close on add. |
| Modify | `src/modules/palettes/components/add-to-palette-button.tsx`                | Pass `paintName` down so the menu can include it in toasts; close the dropdown after success.|
| Modify | `src/modules/collection/components/collection-paint-card.tsx`              | Forward the paint's `name` to `<AddToPaletteButton>`.                                        |
| Modify | `src/modules/paints/components/paint-detail.tsx`                           | Forward the paint's `name` to `<AddToPaletteButton>`.                                        |
| Modify | `docs/11-color-palettes/02-add-to-palette.md`                              | Update the now-stale "duplicates allowed" acceptance line and the related QA item.           |

## Implementation

### Step 1 — Install Sonner and mount the Toaster

Run `npm install sonner`. Sonner is a small (~5KB), unstyled-by-default toast library that integrates cleanly with the project's existing daisyUI/shadcn patterns and React 19 / Next 16. It does not require a context provider, so any client component anywhere in the tree can call `toast(...)` once the `<Toaster />` is mounted.

Mount `<Toaster />` exactly once in `src/app/layout.tsx`, immediately inside `<body>` and before `{children}`:

```tsx
import { Toaster } from 'sonner'

// inside RootLayout return
<body className={...}>
  {children}
  <Toaster
    position="bottom-right"
    richColors
    closeButton
    theme="system"
  />
</body>
```

The `richColors` prop maps `toast.success` / `toast.error` onto color tokens that already harmonize with the daisyUI theme (green/red soft variants); no custom CSS is required for v1. If a future visual pass needs project-specific styling, Sonner accepts a `toastOptions.classNames` prop that can apply Tailwind classes — out of scope here.

### Step 2 — Reject duplicates in the service layer

Add a small typed result so callers can distinguish duplicate errors from generic ones. Create `src/modules/palettes/types/add-paint-to-palette-result.ts`:

```ts
/**
 * Discriminated result returned by the per-paint and bulk add actions.
 * `code: 'duplicate'` lets the UI render a duplicate-specific toast message
 * without parsing the human-readable `error` string.
 */
export type AddPaintToPaletteResult =
  | { ok: true; paletteName: string }
  | { error: string; code?: 'duplicate' | 'auth' | 'not_found' | 'forbidden' | 'unknown' }

/** Bulk variant: also reports which input paint IDs were already in the palette. */
export type AddPaintsToPaletteResult =
  | { ok: true }
  | { error: string; code?: 'duplicate' | 'auth' | 'not_found' | 'forbidden' | 'unknown'; duplicateIds?: string[] }
```

Update `appendPaintToPalette` in `palette-service.ts:322` to refuse the write when `paintId` is already present:

```ts
async appendPaintToPalette(
  paletteId: string,
  paintId: string,
  note?: string | null,
): Promise<{ error?: string; code?: 'duplicate' | 'not_found' }> {
  const palette = await this.getPaletteById(paletteId)
  if (!palette) return { error: 'Palette not found.', code: 'not_found' }

  if (palette.paints.some((slot) => slot.paintId === paintId)) {
    return { error: 'This paint is already in the palette.', code: 'duplicate' }
  }

  const next = normalizePalettePositions([
    ...palette.paints,
    { position: palette.paints.length, paintId, note: note ?? null },
  ])

  return this.setPalettePaints(paletteId, next)
},
```

Update `appendPaintsToPalette` similarly. Reject the entire call atomically when any input duplicates an existing slot or another input row — _do not_ silently drop duplicates. The caller surfaces a single error toast that names the offending paints:

```ts
async appendPaintsToPalette(
  paletteId: string,
  paintIds: string[],
): Promise<{ error?: string; code?: 'duplicate' | 'not_found'; duplicateIds?: string[] }> {
  const palette = await this.getPaletteById(paletteId)
  if (!palette) return { error: 'Palette not found.', code: 'not_found' }

  const existing = new Set(palette.paints.map((p) => p.paintId))
  const seen = new Set<string>()
  const duplicates: string[] = []
  for (const id of paintIds) {
    if (existing.has(id) || seen.has(id)) duplicates.push(id)
    seen.add(id)
  }
  if (duplicates.length > 0) {
    return {
      error: `${duplicates.length} paint(s) are already in this palette.`,
      code: 'duplicate',
      duplicateIds: duplicates,
    }
  }

  const base = palette.paints.length
  const additions = paintIds.map((id, i) => ({ position: base + i, paintId: id, note: null as string | null }))
  const next = normalizePalettePositions([...palette.paints, ...additions])
  return this.setPalettePaints(paletteId, next)
},
```

### Step 3 — Dedupe in `createPaletteWithPaints`

The "Save scheme as palette" flow assembles `paintIds` from `nearestPaints[0].id` of each scheme color. Triadic and analogous schemes can resolve to the same paint for adjacent slots, which would seed the new palette with duplicates. Dedupe defensively in `create-palette-with-paints.ts:59-62` while preserving order:

```ts
const uniquePaintIds = Array.from(new Set(input.paintIds))
if (uniquePaintIds.length > 0) {
  await service.appendPaintsToPalette(palette.id, uniquePaintIds)
}
```

This is silent (no error) because the upstream caller — the scheme save dialog — is opinionated that "best matches per slot, deduplicated" is the intent. We don't reject the whole creation when scheme matches collide.

### Step 4 — Update server actions

`add-paint-to-palette.ts`: import the new result type; add a `paintName` lookup so the success payload includes both the palette and paint names for the toast.

```ts
export async function addPaintToPalette(
  paletteId: string,
  paintId: string,
): Promise<AddPaintToPaletteResult> {
  // ...existing auth + ownership checks; on auth fail return { error, code: 'auth' }
  const result = await service.appendPaintToPalette(paletteId, paintId)
  if (result.error) return { error: result.error, code: result.code ?? 'unknown' }

  revalidatePath('/palettes')
  revalidatePath(`/palettes/${paletteId}`)
  revalidatePath(`/palettes/${paletteId}/edit`)

  return { ok: true, paletteName: palette.name }
}
```

`add-paints-to-palette.ts`: thread the `duplicateIds` array through unchanged.

`create-palette-with-paints.ts`: no signature change — only the inline dedupe described in Step 3.

### Step 5 — Replace inline confirmation with toasts

Edit `src/modules/palettes/components/add-to-palette-menu.tsx`:

1. Remove the `confirmation` state and the early-return `<div aria-live>...</div>` block.
2. Accept a new `paintName: string` prop and an `onClose: () => void` callback that the parent button uses to close the dropdown.
3. In `handleSelect`, switch on the result:

```ts
function handleSelect(palette: PaletteSummary) {
  startTransition(async () => {
    const result = await addPaintToPalette(palette.id, paintId)
    if ('error' in result) {
      if (result.code === 'duplicate') {
        toast.error(`'${paintName}' is already in '${palette.name}'`)
      } else {
        toast.error(result.error)
      }
      // keep the menu open on duplicate so the user can pick another palette
      return
    }
    toast.success(`Added '${paintName}' to '${result.paletteName}'`)
    onClose()
  })
}
```

`add-to-palette-button.tsx`:

- Accept `paintName` and forward it to `<AddToPaletteMenu>`.
- Pass `onClose={() => setOpen(false)}` so the menu can close itself after a successful add.

`collection-paint-card.tsx` and `paint-detail.tsx`:

- Each already has access to the paint object. Pass `paintName={paint.name}` into `<AddToPaletteButton>` alongside the existing `paintId`.

### Step 6 — `NewPaletteInlineForm` (create-new flow)

The "Create new palette" inline form already triggers a server-side `redirect(...)` to `/palettes/{id}/edit` on success, so a client-side `toast.success` would be unmounted before it could render. Two options:

1. **Defer toast to next page**: append a query param like `?created=1` and in `palette-detail-edit/page.tsx` (or its client component) call `toast.success('Palette created')` once on mount.
2. **Skip success toast for the create flow**: the redirect itself is feedback; only show `toast.error(result.error)` when validation/creation fails.

Adopt **option 2** for this bug fix to keep the change focused. Surface only the error path:

```ts
startTransition(async () => {
  const result = await createPaletteWithPaints({ name, paintIds: [paintId] })
  if (result?.error) toast.error(result.error)
})
```

Remove the `<p data-error>` element and the imperative DOM writes on `validatePaletteName` failure — replace with a local `useState` for the inline name validation message (`validatePaletteName` runs before the action and is purely client-side, so it stays inline rather than as a toast). The action error becomes a toast.

### Step 7 — Stale documentation cleanup

Edit `docs/11-color-palettes/02-add-to-palette.md`:

- Change the acceptance bullet _"Adding a paint already in the target palette is allowed (the schema permits duplicates)"_ to _"Adding a paint already in the target palette is rejected with a duplicate error toast — see [06-prevent-duplicate-paint-add.md](./06-prevent-duplicate-paint-add.md)"_.
- Update the manual QA bullet that says _"Add the same paint twice → both rows persist..."_ to reflect the new behavior.

Do not retroactively change the prose in section 3/4 of that doc — call this out as a follow-up if the broader narrative needs cleanup.

### Step 8 — Manual QA checklist

- Add a paint from a paint card → green success toast _"Added '{paint}' to '{palette}'"_; dropdown closes; refresh shows the paint in the palette.
- Add the same paint a second time → red error toast _"'{paint}' is already in '{palette}'"_; dropdown stays open; the palette is unchanged on refresh.
- Sign out, click any "Add to palette" → still redirects to `/sign-in?next=...` (no toast involved).
- Trigger a non-duplicate failure (e.g. revoke palette ownership in dev tools, then attempt add) → red toast with the action's error message.
- Generate a triadic scheme where two slots collapse to the same paint → "Save as palette" succeeds with a deduplicated palette (one row per unique paint).
- `npm run build` + `npm run lint`.

## Risks & Considerations

- **Schema does not yet enforce uniqueness**: A direct DB write that bypasses the application can still insert duplicate `(palette_id, paint_id)` rows. RLS limits this to the palette owner, so the blast radius is "user makes their own palette weird." A follow-up should add `UNIQUE (palette_id, paint_id)` after a one-time migration that dedupes existing rows by keeping the lowest `position` per paint. That migration is **not** in this fix because it's destructive (drops rows) and warrants its own review.
- **Pre-existing duplicates in the wild**: If any palette already contains duplicates from before this fix, the new guard will not retroactively remove them — it only blocks new adds. Users will see the duplicates until the future cleanup migration runs. The palette editor's existing "remove paint" affordance is sufficient to recover manually.
- **Toast verbosity**: Sonner stacks toasts. Repeated rapid clicks on the same duplicate could spawn a stack of identical toasts. Sonner's default `duration` (~4s) is short enough to make this a non-issue; if it becomes annoying, pass `id: \`dup-\${paletteId}-\${paintId}\`` to deduplicate the toast itself.
- **Bundle size**: Sonner is ~5KB gzipped. No comparable smaller alternative is already in the dependency graph; building one in-house is more code than it's worth and would re-implement the same focus / a11y nuances.
- **`<Toaster />` SSR**: Sonner is client-only. Mounting it inside the server-rendered root layout is supported (it self-marks `'use client'`), but verify the layout type does not error after install.

## Notes

- This bug intentionally does not attempt to harmonize the project's broader feedback patterns. Other surfaces still use inline `aria-live` messages (`palette-form.tsx`, `delete-palette-button.tsx`); migrating them is a separate enhancement.
- After this lands, `02-add-to-palette.md` and `04-palette-hue-swap.md` should be re-read to ensure no other doc still claims duplicates are permitted.
