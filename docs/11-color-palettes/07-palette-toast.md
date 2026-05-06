# Palette & Scheme Toast Feedback

**Epic:** Color Palettes
**Type:** Enhancement
**Status:** Completed
**Branch:** `enhancement/palette-toast`
**Merge into:** `v1/main`

## Summary

Six palette and scheme surfaces show success/error feedback through a mix of inline `aria-live` lines, destructive banners inside dialogs, and (in one case) silent submissions. They predate the Sonner integration that landed with [`06-prevent-duplicate-paint-add.md`](./06-prevent-duplicate-paint-add.md), and now inconsistency is the cost: some palette interactions toast, others don't, and the inline patterns here lag the rest of the app.

This enhancement migrates all six surfaces to Sonner toasts, removes the inline error/success elements, and — for `<PalettePaintRow>`'s remove button — replaces the silent raw-form submission with a `useTransition` flow that surfaces a toast.

## Expected Behavior

| Surface                         | Action                                              | On success                                                   | On error          |
| ------------------------------- | --------------------------------------------------- | ------------------------------------------------------------ | ----------------- |
| `<PaletteForm>`                 | `updatePalette` (name/description/visibility save)  | green toast _"Palette saved"_                                | red toast         |
| `<PalettePaintList>` reorder    | `reorderPalettePaints`                              | (silent — drag completion is its own visual confirmation)    | red toast + roll back |
| `<PalettePaintRow>` remove      | `removePalettePaint`                                | green toast _"Removed '{paint name}' from palette"_          | red toast         |
| `<PaletteSwapDialog>` select    | `swapPalettePaint`                                  | green toast _"Swapped to '{candidate name}'"_; dialog closes | red toast; dialog stays open |
| `<DeletePaletteButton>`         | `deletePalette` (redirects on success)              | (success is the redirect — no toast)                         | red toast; dialog stays open |
| `<SaveSchemeAsPaletteButton>`   | `createPaletteWithPaints` (redirects on success)    | (success is the redirect — no toast)                         | red toast; dialog stays open |

The reorder action's success toast is intentionally suppressed — the drag-and-drop animation already confirms the move, and a toast on every drag would be noise. The error toast remains because rollback is otherwise silent.

## Acceptance Criteria

- [ ] `<PaletteForm>` (`palette-form.tsx`) replaces `state.success` "Saved" `<p aria-live>` (lines 98–102) with `toast.success('Palette saved')`. The top-level `state.errors.form` `<p>` (lines 86–88) becomes `toast.error(state.errors.form)`. Field-level `state.errors.name` and `state.errors.description` stay inline beneath their inputs.
- [ ] `<PalettePaintList>` (`palette-paint-list.tsx`) removes the local `error` state (line 75), the `<p role="status">` block (lines 149–153), and replaces them with a `toast.error(result.error)` call inside the failure branch of `handleDragEnd` (line 114). The rollback (`setSlots(previousSlots)`) is preserved.
- [ ] `<PalettePaintRow>` (`palette-paint-row.tsx`) replaces the raw `<form action={...}>` remove submission (lines 98–112) with a `<button>` + `useTransition` + `removePalettePaint` call. On success, dispatches `toast.success(\`Removed '${paint.name}' from palette\`)`; on error, `toast.error(result.error)`. The action's existing revalidation refreshes the list.
- [ ] `<PaletteSwapDialog>` (`palette-swap-dialog.tsx`) removes `swapError` state (line 65) and the `{swapError && (<div role="alert">…)}` block (lines 189–198). On error, `toast.error(result.error)` and the dialog stays open. On success, captures the candidate's name (looked up by id from the visible list) and dispatches `toast.success(\`Swapped to '${candidate.name}'\`)` before `onSwapped()` and `handleClose()`.
- [ ] `<DeletePaletteButton>` (`delete-palette-button.tsx`) removes the local `error` state (line 28) and the destructive banner (lines 85–89). On error, `toast.error(result.error)` and the dialog stays open. The success path is unchanged — the action redirects.
- [ ] `<SaveSchemeAsPaletteButton>` (`save-scheme-as-palette-button.tsx`) removes the local `error` state (line 43) and the destructive banner (lines 120–124). On error, `toast.error(result.error)`. The success path is unchanged — the action redirects.
- [ ] No `<p role="status">`, `<div role="alert">`, or sibling destructive `<div>`/`<p>` blocks survive in any of the listed files for top-level success/error feedback. Field-level form errors (only present in `<PaletteForm>`) remain inline.
- [ ] `npm run build` and `npm run lint` pass with no errors.

## Out of Scope

- **`<PaletteSwapDialog>`'s on-mount candidate fetch error** (`fetchState.status === 'error'` rendering at lines 210–212). It's a different failure mode (data load, not user action) and the inline `<p>` doubles as an empty-state message. Leave it alone.
- **`<NewPaletteInlineForm>`** (`new-palette-inline-form.tsx`). Already uses Sonner via the `prevent-duplicate-paint-add` change. Its remaining inline `<p>` is a *client-side* pre-action validation, which is the correct place for a field-level error.
- **`<AddToPaletteMenu>`'s already-toasting flows.** Add-to-palette success/error toasts are already wired up.
- **Server-side flash messages** (e.g. on the `/palettes` list after a redirect). Out of scope; revisit if a redirect-target needs a success message.

## Key Files

| Action | File                                                                  | Description                                                                              |
| ------ | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Modify | `src/modules/palettes/components/palette-form.tsx`                    | `useEffect` keyed on `state` for top-level success / form error toasts; remove `<p>` blocks. |
| Modify | `src/modules/palettes/components/palette-paint-list.tsx`              | Replace inline reorder error with `toast.error`; remove local `error` state.             |
| Modify | `src/modules/palettes/components/palette-paint-row.tsx`               | Replace raw form submit with `useTransition` flow; toast on success/error.               |
| Modify | `src/modules/palettes/components/palette-swap-dialog.tsx`             | Replace `swapError` state with `toast.*`; success toast names the candidate.             |
| Modify | `src/modules/palettes/components/delete-palette-button.tsx`           | Replace dialog error banner with `toast.error`.                                          |
| Modify | `src/modules/color-schemes/components/save-scheme-as-palette-button.tsx` | Replace dialog error banner with `toast.error`.                                          |

## Implementation

### Step 1 — `<PaletteForm>` (`useActionState` flow)

This is the only `useActionState` flow in this group. Apply the same pattern as the auth doc:

```tsx
import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'

useEffect(() => {
  if (state.errors.form) {
    toast.error(state.errors.form)
  } else if (state.success) {
    toast.success('Palette saved')
  }
}, [state])
```

The two branches are mutually exclusive in practice: a successful save sets `state.success` and clears `state.errors.form`; a failure populates `state.errors.form` and leaves `state.success` falsy. Field-level `state.errors.name` / `state.errors.description` continue to render inline as today.

Delete:
- Lines 86–88 (`{state.errors.form && (<p>…)}`)
- Lines 98–102 (`{state.success && (<p aria-live>Saved</p>)}`)

### Step 2 — `<PalettePaintList>` (optimistic rollback)

The pattern used today is exactly what's needed for a toast:

```tsx
if (result?.error) {
  setSlots(previousSlots)
  toast.error(result.error)
} else {
  latestConfirmedRef.current = newSlots
}
```

Delete:
- Line 75 (`const [error, setError] = useState<string | null>(null)`)
- Line 104 (`setError(null)`)
- Lines 149–153 (the `<p role="status">` block)
- The `error &&` setter call on line 114 — replaced by the `toast.error` call.

### Step 3 — `<PalettePaintRow>` (raw form → transition)

The current code uses `<form action={removePalettePaint.bind(null, paletteId, position) as ...}>` which submits as a server-action form. Server-action forms produce `void` from the client's perspective, so the `error` channel is unreachable today. Convert to a click handler:

```tsx
'use client'
import { useTransition } from 'react'
import { toast } from 'sonner'
// ...

const [isPending, startTransition] = useTransition()

function handleRemove() {
  startTransition(async () => {
    const result = await removePalettePaint(paletteId, position)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success(`Removed '${paint.name}' from palette`)
  })
}

// JSX:
<button
  type="button"
  onClick={handleRemove}
  disabled={isPending}
  className="btn btn-sm btn-ghost text-destructive hover:text-destructive"
  aria-label={`Remove ${paint.name}`}
>
  {isPending ? 'Removing…' : 'Remove'}
</button>
```

The `<form>` wrapper and the `as unknown as ...` cast (lines 96–104) are deleted. The action's existing `revalidatePath('/palettes/[id]', 'page')` (or equivalent — verify in the action file) refreshes the list once the toast fires.

### Step 4 — `<PaletteSwapDialog>` (capture candidate name)

The candidate name is needed in `handleSelect` for the success toast. The function receives `paintId`; resolve the name from the visible candidate list before awaiting the action:

```tsx
function handleSelect(paintId: string) {
  const candidate = visible.find(({ paint: p }) => p.id === paintId)?.paint
  startTransition(async () => {
    const result = await swapPalettePaint(paletteId, position, paintId)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success(`Swapped to '${candidate?.name ?? 'paint'}'`)
    onSwapped()
    handleClose()
  })
}
```

Delete:
- Line 65 (`const [swapError, setSwapError] = useState<string | null>(null)`)
- Line 95 (`setSwapError(null)` in `handleClose`)
- Line 100 (`setSwapError(null)` in `handleSelect`)
- Lines 189–198 (the `{swapError && (<div role="alert">…)}` block)

The `fetchState.status === 'error'` rendering (lines 210–212) is left alone — it's a separate concern (data-load failure, not user action).

### Step 5 — `<DeletePaletteButton>` & `<SaveSchemeAsPaletteButton>` (dialog confirm + redirect-on-success)

Both follow the same shape: confirm button → action call → server redirects on success. On error, today's code sets a local `error` state that renders a banner inside the dialog.

```tsx
function handleConfirm() {
  startTransition(async () => {
    const result = await deletePalette(palette.id)  // or createPaletteWithPaints({...})
    if (result?.error) {
      toast.error(result.error)
    }
    // success: server already redirected, this code path is unreachable
  })
}
```

Delete in each:
- The `error` `useState`.
- The `setError(null)` calls in `handleClose` / before-action.
- The `<div className="rounded-lg border border-destructive/20 …">` block.

The dialog stays open on error (the user is still in `handleConfirm`'s scope — no `handleClose()` call), which is the existing behavior.

### Step 6 — Manual QA checklist

- Edit a palette's name and save → green toast _"Palette saved"_; no more inline "Saved" text.
- Save with a duplicate name (or other server-side `errors.form` failure) → red toast.
- Save with an invalid name (client/server field-level validation) → inline message beneath the input; no toast.
- Drag a palette row to a new position → no success toast; reorder persists.
- Force a reorder failure (revoke the action in dev tools) → red toast; rows roll back.
- Click "Remove" on a palette row → green toast _"Removed '{paint}' from palette"_; row disappears after revalidation.
- Open the swap dialog, pick a candidate → green toast _"Swapped to '{candidate}'"_; dialog closes.
- Force a swap failure → red toast; dialog stays open.
- Click "Delete palette," type the name, confirm → server redirects to `/palettes`; no toast.
- Force a delete failure (e.g. simulate a 500) → red toast; dialog stays open.
- "Save scheme as palette" → server redirects to the new palette's edit page; no toast.
- Force a save-scheme failure → red toast; dialog stays open.
- `npm run build` + `npm run lint`.

## Risks & Considerations

- **`<PalettePaintRow>` form-to-button conversion is the most invasive change.** Today the form-action form submission has a different network shape than a fetch-from-client. Confirm `removePalettePaint` is callable directly from a client component (not a `'server-only'` action gated to forms) — verify by checking the action file's `'use server'` directive (it should still work since `'use server'` allows direct invocation from client components). If the action ever depended on `formData` being a real `FormData`, that would need adjustment — current signature is `(paletteId, position)`, so no.
- **Reorder success toast intentionally absent.** This is a deliberate UX choice to avoid noise. If user feedback later disagrees, add a toast keyed off `latestConfirmedRef` updates.
- **`<PaletteSwapDialog>` candidate lookup.** If `paintId` ever isn't in the `visible` array (e.g. a stale click after the candidate was filtered out), the toast falls back to _"Swapped to 'paint'"_. Acceptable; the fallback path is degenerate.
- **`<DeletePaletteButton>` dialog stays open on error.** Today's behavior — preserved. The toast is a layer on top of the existing dialog; the user can still cancel.
- **`<SaveSchemeAsPaletteButton>` redirect race.** `createPaletteWithPaints` redirects server-side; on the client, the `await` resolves with no error and the next paint of the React render is interrupted by navigation. The success branch is therefore unreachable — only the error branch needs a toast. Same pattern as `<DeletePaletteButton>`.
- **`<PaletteForm>` `state` reference and stable input.** `useActionState` returns a fresh state per submission; the effect re-fires correctly. Re-renders driven by other state (none in this form besides the form's own action) don't change `state`'s reference.

## Notes

- Sonner is already mounted at `src/app/layout.tsx:21`. No infrastructure changes.
- This doc is independent of the auth, profile, and admin toast docs. It can ship in any order.
- The reorder, swap, and remove flows don't share files with the others — multiple of these docs could be implemented and shipped in parallel branches, though serializing through `v1/main` keeps the diff churn manageable.
