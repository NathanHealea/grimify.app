# Owned Collection UX Improvements

**Epic:** Paint Collection
**Type:** Enhancement
**Status:** In Progress

## Summary

Improve the owned paint collection UX in three areas: (1) replace the symbol-only `✓`/`+` button in the detail panel with human-readable text styled as a DaisyUI outlined button, (2) add a remove button to each paint in the collection sidebar with a confirmation dialog, and (3) use clear, human-readable wording throughout the add/remove interactions.

## Acceptance Criteria

- [x] Detail panel "owned" button displays human-readable text ("Add to Collection" / "Remove from Collection") instead of symbols
- [x] Detail panel button is styled as a DaisyUI `btn-outline` button with green accent color
- [x] Each paint in the collection sidebar has a remove button
- [x] Clicking the remove button in the sidebar shows a confirmation dialog before removing the paint
- [x] Confirmation dialog asks "Remove {paint name} from your collection?" with confirm/cancel actions
- [x] Wording is consistent and human-readable across detail panel and collection sidebar

## Implementation Plan

### Step 1: Update Detail Panel button wording and styling

**File:** `src/components/DetailPanel.tsx`

Replace the current symbol-only button (lines 198–203) with human-readable text and consistent DaisyUI outlined button styling:

```tsx
<button
  className={`btn btn-sm btn-outline w-full ${ownedIds.has(paint.id) ? 'btn-success' : ''}`}
  onClick={() => onToggleOwned(paint.id)}
>
  {ownedIds.has(paint.id) ? 'Remove from Collection' : 'Add to Collection'}
</button>
```

**Changes:**
- Replace `✓` with `"Remove from Collection"`
- Replace `+` with `"Add to Collection"`
- Use `btn-outline` base with `btn-success` modifier when owned, keeping the green accent consistent with the existing owned ring color (`#10b981` ≈ DaisyUI `success`)
- Remove the inline `style` override — rely on DaisyUI semantic classes instead

### Step 2: Add remove button to collection sidebar paint list

**File:** `src/components/CollectionPanel.tsx`

In the `filteredOwnedPaints.map()` render (lines 108–127), add a remove button (`✕` or trash icon) to each paint row. The button should stop propagation so clicking it doesn't also select the paint on the wheel.

```tsx
{filteredOwnedPaints.map((paint) => {
  const brand = brands.find((b) => b.id === paint.brand)
  return (
    <div key={paint.id} className='flex items-center gap-1'>
      <button
        className='flex flex-1 items-center gap-2 rounded px-2 py-1 text-left hover:bg-base-300'
        onClick={() => onSelectPaint(paint)}>
        <div
          className='size-4 shrink-0 rounded border border-base-300'
          style={{ backgroundColor: paint.hex }}
        />
        <div className='min-w-0 flex-1'>
          <p className='truncate text-sm'>{paint.name}</p>
          <p className='text-xs text-base-content/60'>
            {brand?.icon} {brand?.name} &middot; {paint.type}
          </p>
        </div>
      </button>
      <button
        className='btn btn-ghost btn-xs text-error'
        onClick={() => onRemoveOwned(paint)}
        aria-label={`Remove ${paint.name} from collection`}>
        <XMarkIcon className='size-3' />
      </button>
    </div>
  )
})}
```

**Changes:**
- Wrap each paint row in a `div` container with the remove button alongside
- The remove button uses `XMarkIcon` (already imported) with `text-error` color
- The remove button calls a new `onRemoveOwned` handler that triggers the confirmation dialog

### Step 3: Add confirmation dialog for collection removal

**File:** `src/components/CollectionPanel.tsx`

Add state to track which paint the user wants to remove, and render a DaisyUI modal dialog:

```tsx
const [paintToRemove, setPaintToRemove] = useState<ProcessedPaint | null>(null)
```

Add a new `onRemoveOwned` handler prop or keep it internal:
- When the user clicks the `✕` button, set `paintToRemove` to that paint
- Render a `<dialog>` element (DaisyUI modal pattern) that shows the paint name and asks for confirmation
- "Remove" button calls `onToggleOwned(paintToRemove.id)` and closes the dialog
- "Cancel" button closes the dialog without action

```tsx
{paintToRemove && (
  <dialog className='modal modal-open'>
    <div className='modal-box'>
      <h3 className='text-lg font-bold'>Remove from Collection</h3>
      <p className='py-4'>
        Remove <strong>{paintToRemove.name}</strong> from your collection?
      </p>
      <div className='modal-action'>
        <button className='btn btn-outline' onClick={() => setPaintToRemove(null)}>
          Cancel
        </button>
        <button
          className='btn btn-error'
          onClick={() => {
            onToggleOwned(paintToRemove.id)
            setPaintToRemove(null)
          }}>
          Remove
        </button>
      </div>
    </div>
    <form method='dialog' className='modal-backdrop'>
      <button onClick={() => setPaintToRemove(null)}>close</button>
    </form>
  </dialog>
)}
```

### Step 4: Update empty collection message wording

**File:** `src/components/CollectionPanel.tsx`

Update the empty collection message (line 100–102) to use human-readable wording that matches the new button text:

```tsx
<p className='text-xs text-base-content/40'>
  No paints in your collection yet. Select a paint on the wheel and click
  &ldquo;Add to Collection&rdquo; to start building your collection.
</p>
```

### Affected Files

| File | Changes |
|------|---------|
| `src/components/DetailPanel.tsx` | Replace symbol button with human-readable text, DaisyUI outlined styling |
| `src/components/CollectionPanel.tsx` | Add remove button per paint, confirmation dialog, update empty state wording |

### Risks & Considerations

- **Modal z-index:** The DaisyUI `modal` component uses a high z-index. Verify it renders above the sidebar and color wheel without issues.
- **Confirmation UX on mobile:** The modal should be touch-friendly. DaisyUI's modal pattern handles this well out of the box.
- **No new dependencies:** Uses existing DaisyUI modal pattern and already-imported `XMarkIcon`.
