# Collection Toast Feedback (Add / Remove)

**Epic:** Collection Tracking
**Type:** Enhancement
**Status:** Todo
**Branch:** `enhancement/collection-toast`
**Merge into:** `v1/main`

## Summary

When a user adds a paint to or removes a paint from their personal collection, the only visible feedback today is the bookmark icon flipping its filled/unfilled state and (in `paint-detail-panel.tsx`) an inline error line. That works, but it's easy to miss — especially on small icon-only buttons that overlay paint cards. This enhancement surfaces explicit success and failure feedback as toasts using the Sonner toast infrastructure that was added in [`11-color-palettes/06-prevent-duplicate-paint-add.md`](../11-color-palettes/06-prevent-duplicate-paint-add.md).

The same pattern that already exists for "Add to palette" — `toast.success(...)` on success, `toast.error(...)` on failure — is extended to "Add to collection" and "Remove from collection."

## Expected Behavior

1. Clicking an unfilled bookmark on a paint card or detail page calls `addToCollection`. On success, a green toast reads _"Added '{paint name}' to your collection"_. On error, a red toast surfaces the action's `error` message.
2. Clicking a filled bookmark calls `removeFromCollection`. On success, a toast reads _"Removed '{paint name}' from your collection"_. On error, the action's `error` message is shown.
3. The optimistic icon flip remains exactly as today — the toast is in addition to the immediate visual flip, not a replacement.
4. On error, the optimistic state still reverts (current behavior); the error toast tells the user *why*.
5. The standalone Add/Remove button rendered inside `<PaintDetailPanel>` (color-wheel overlay) gets the same toast treatment, replacing the existing inline `actionError` paragraph.
6. Unauthenticated clicks redirect to `/sign-in?next=...` (current behavior) — no toast involved.

## Acceptance Criteria

- [ ] `<CollectionToggle>` accepts a new required `paintName: string` prop and calls `toast.success(\`Added '${paintName}' to your collection\`)` after `addToCollection` resolves without error.
- [ ] `<CollectionToggle>` calls `toast.success(\`Removed '${paintName}' from your collection\`)` after `removeFromCollection` resolves without error.
- [ ] On `result.error`, `<CollectionToggle>` calls `toast.error(result.error)` and reverts the optimistic state (existing revert logic preserved).
- [ ] All callers of `<CollectionToggle>` pass the paint's display name:
  - [ ] `src/modules/collection/components/collection-paint-card.tsx`
  - [ ] `src/modules/paints/components/paint-detail.tsx`
- [ ] `<PaintDetailPanel>` (`src/modules/color-wheel/components/paint-detail-panel.tsx`) is updated to call `toast.success` / `toast.error` for its inline collection toggle, and the inline `actionError` `<p>` is removed along with its `useState`.
- [ ] Unauthenticated click behavior is unchanged — still redirects, never toasts.
- [ ] `npm run build` and `npm run lint` pass with no errors.

## Out of Scope

- **Bulk-remove from the collection dashboard** (`bulkRemoveFromCollection`). The user's request is singular ("when saving a paint" / "removing a paint"). Bulk remove already returns a `removedCount` and is invoked from a different surface; surfacing a single _"Removed N paints"_ toast is a follow-up if desired.
- **Replacing the inline confirmation in any other surface** (e.g. palette form, delete-palette dialog). Only the per-paint collection add/remove flow is in scope.
- **Theming/customizing toast appearance.** Sonner is already mounted with `richColors` + `theme="system"` at `src/app/layout.tsx:21`. No styling changes here.

## Key Files

| Action | File                                                              | Description                                                                                                        |
| ------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Modify | `src/modules/collection/components/collection-toggle.tsx`         | Add `paintName` prop; wire `toast.success` / `toast.error` in the post-action branch of `handleClick`.             |
| Modify | `src/modules/collection/components/collection-paint-card.tsx`     | Forward `name` as `paintName` to `<CollectionToggle>`.                                                             |
| Modify | `src/modules/paints/components/paint-detail.tsx`                  | Forward `paint.name` as `paintName` to `<CollectionToggle>`.                                                       |
| Modify | `src/modules/color-wheel/components/paint-detail-panel.tsx`       | Replace the inline `actionError` state + `<p>` with `toast.success` / `toast.error` calls in `handleCollectionToggle`. |

## Implementation

### Step 1 — Thread `paintName` into `<CollectionToggle>`

`<CollectionToggle>` already optimistically computes `next = !optimisticInCollection` *before* awaiting the action — that variable is the source of truth for which message to render. Add `paintName: string` to the props (required, not optional — every existing caller has the name in scope and a missing name would silently render `Added '' to your collection`).

In `src/modules/collection/components/collection-toggle.tsx`:

```tsx
import { toast } from 'sonner'

// inside the component
function handleClick(e: React.MouseEvent) {
  e.stopPropagation()
  e.preventDefault()

  if (!isAuthenticated) {
    router.push(`/sign-in?next=${encodeURIComponent(pathname)}`)
    return
  }

  startTransition(async () => {
    const next = !optimisticInCollection
    setOptimisticInCollection(next)

    const result = next
      ? await addToCollection(paintId, revalidatePath)
      : await removeFromCollection(paintId, revalidatePath)

    if (result.error) {
      setOptimisticInCollection(!next)
      toast.error(result.error)
      return
    }

    toast.success(
      next
        ? `Added '${paintName}' to your collection`
        : `Removed '${paintName}' from your collection`,
    )
  })
}
```

Update the JSDoc block above the component to document the new prop:

```ts
/**
 * @param props.paintName - Display name of the paint, used in success toast messages.
 */
```

> **Note on the `next` capture.** We deliberately key the toast off the local `next` variable, not off `optimisticInCollection` after the await. `useOptimistic` will have already settled to the server value by the time the post-`await` code runs, so `optimisticInCollection` would read as the *new* state and produce the wrong message in the error-revert path. `next` is the user's intent for this click and is what the toast should describe.

### Step 2 — Update the two `<CollectionToggle>` callers

In `src/modules/collection/components/collection-paint-card.tsx`, pass the `name` prop already on `<CollectionPaintCard>` straight through:

```tsx
<CollectionToggle
  paintId={id}
  paintName={name}
  isInCollection={isInCollection}
  isAuthenticated={isAuthenticated}
  size="sm"
  revalidatePath={revalidatePath}
  className="absolute right-1 top-1"
/>
```

In `src/modules/paints/components/paint-detail.tsx`:

```tsx
<CollectionToggle
  paintId={paint.id}
  paintName={paint.name}
  isInCollection={isInCollection}
  isAuthenticated={isAuthenticated}
  size="md"
  revalidatePath={`/paints/${paint.id}`}
/>
```

No other callers exist (verified via `grep -rn 'CollectionToggle' src`).

### Step 3 — Apply the same treatment to `<PaintDetailPanel>`

`paint-detail-panel.tsx` does not use `<CollectionToggle>` — it renders its own button styled as a daisyUI `btn-primary` / `btn-outline` because the panel is an overlay with its own visual rules. It still calls the same `addToCollection` / `removeFromCollection` actions, so it gets the same toast wiring.

In `src/modules/color-wheel/components/paint-detail-panel.tsx`:

1. Remove the `actionError` `useState` (line 37) and the corresponding `<p className="text-xs text-destructive">{actionError}</p>` block (lines 115–117).
2. Import `toast` from `'sonner'`.
3. Rewrite `handleCollectionToggle`:

```tsx
function handleCollectionToggle() {
  const nextOwned = !owned
  startTransition(async () => {
    const result = nextOwned
      ? await addToCollection(paint.id)
      : await removeFromCollection(paint.id)
    if (result.error) {
      toast.error(result.error)
      return
    }
    setOwned(nextOwned)
    toast.success(
      nextOwned
        ? `Added '${paint.name}' to your collection`
        : `Removed '${paint.name}' from your collection`,
    )
  })
}
```

The button's disabled/`…` pending state stays as-is; only the feedback channel changes.

### Step 4 — Manual QA checklist

- Click an unowned paint's bookmark on a paint card → green toast _"Added '{paint}' to your collection"_; bookmark fills.
- Click again to remove → green toast _"Removed '{paint}' from your collection"_; bookmark empties.
- Repeat on `/paints/{id}` (the full detail page) — same toasts, same flip.
- Open a paint inside the color wheel detail panel → click "Add to Collection" / "Remove from Collection" → same toasts; the inline error paragraph is gone.
- Sign out and click any bookmark → still redirects to `/sign-in?next=...` (no toast).
- Force an action failure (e.g. block the action in dev tools network tab, or revoke RLS in a sandbox) → red toast with the action's error message; bookmark reverts.
- `npm run build` + `npm run lint`.

## Risks & Considerations

- **Toast spam on rapid clicks.** Each click spawns a toast. Sonner's default `duration` (~4s) caps the visible stack, but a user mashing the bookmark would see a queue. If this becomes a usability issue, pass `id: \`collection-${paintId}\`` to `toast.success/error` so repeated calls replace the existing toast instead of stacking. Defer that until reported — premature optimization for a low-likelihood interaction pattern.
- **Required prop is a breaking signature change.** `paintName` is added as required, so adding a new caller without the name will fail at the type level. That's intentional — it's the only way to guarantee no caller silently produces an empty paint name in the toast. The two existing callers and the standalone overlay button all have the name in scope already, so the migration is mechanical.
- **Idempotent action returning success on no-op.** `addToCollection` returns success even when the paint is already in the collection (it's idempotent). The toast will say _"Added '{paint}' to your collection"_ in that case, which is technically wrong but functionally consistent with what the optimistic UI already implies. Not worth a duplicate-detection round trip; the path is unreachable from the UI because the bookmark only shows the "add" affordance when `isInCollection === false`.
- **`useOptimistic` interaction with `next`.** As called out in Step 1's blockquote, the toast must read from the local `next` const, not from the post-await `optimisticInCollection`, because `useOptimistic` will have already settled. Getting this wrong silently inverts the message on error.

## Notes

- Sonner is already installed (`package.json:42`) and `<Toaster />` is mounted once at `src/app/layout.tsx:21` with `position="bottom-right" richColors closeButton theme="system"`. No infrastructure changes are needed.
- This enhancement leaves `<CollectionToggle>`'s revert-on-error contract intact: the optimistic flip still reverts on `result.error`, the toast just adds a verbal channel on top of it.
