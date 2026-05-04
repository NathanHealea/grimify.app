# Recipe Step Paints — Picker, Ratios, Palette Import

**Epic:** Painting Recipes
**Type:** Feature
**Status:** Todo
**Branch:** `feature/recipe-step-paints`
**Merge into:** `v1/main`

## Summary

Replace the placeholder paint section on every recipe step with a real, ordered list of paints. Each paint row stores a paint reference, an optional ratio (free-form text, e.g. `"50/50 with Lahmian Medium"`), and an optional per-row note. Users can pick paints from any source (full library), but if the recipe has a linked palette, that palette's paints are surfaced as the default candidate set with a "show all paints" escape hatch.

## Acceptance Criteria

- [ ] Each step in the builder has an "Add paint" button that opens a paint picker
- [ ] If the recipe has a linked palette, the picker defaults to **palette mode** (shows the palette's paints first)
- [ ] The picker offers a "Search all paints" mode for paints not in the palette (or when no palette is linked)
- [ ] Selected paints render as rows on the step, in order, each with: paint swatch, name, brand, technique chip (inherited from the step), ratio field, note field
- [ ] Ratio and note fields auto-save on blur
- [ ] Rows can be removed; rows can be reordered within the step (drag/drop, same dnd-kit pattern)
- [ ] When a paint added came from the palette, the row stores `palette_slot_id` so future palette swaps can propagate (via swap UX in `palette-hue-swap`)
- [ ] If a step's paint references a palette slot whose `paint_id` later changes, the recipe's read view shows the **current** paint (live join through `palette_slot_id`)
- [ ] If the linked palette is deleted, existing step paints continue to render (the `paint_id` column denormalizes the paint)
- [ ] The read view shows step paints with their swatches, brands, and ratios; clicking a paint opens its detail page
- [ ] `npm run build` and `npm run lint` pass with no errors

## Module additions

```
src/modules/recipes/
├── actions/
│   ├── add-recipe-step-paint.ts          NEW
│   ├── update-recipe-step-paint.ts       NEW (ratio, note)
│   ├── remove-recipe-step-paint.ts       NEW
│   └── reorder-recipe-step-paints.ts     NEW
├── components/
│   ├── recipe-step-paint-list.tsx        NEW — rendered in step card; replaces placeholder
│   ├── recipe-step-paint-row.tsx         NEW — swatch + name + brand + ratio + note + remove
│   ├── recipe-step-paint-picker.tsx      NEW — popover/modal with palette + search modes
│   └── recipe-step-paint-mode-tabs.tsx   NEW — "Palette" / "All paints" toggle
└── utils/
    └── format-step-paint-source.ts       NEW — describes whether a row came from the palette
```

## Key Files

| Action | File                                                                | Description                                                          |
| ------ | ------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Create | `src/modules/recipes/actions/add-recipe-step-paint.ts`              | Append a paint to a step (with optional `palette_slot_id`)           |
| Create | `src/modules/recipes/actions/update-recipe-step-paint.ts`           | Update ratio/note                                                    |
| Create | `src/modules/recipes/actions/remove-recipe-step-paint.ts`           | Delete a row, normalize positions                                    |
| Create | `src/modules/recipes/actions/reorder-recipe-step-paints.ts`         | Two-phase position update                                            |
| Create | `src/modules/recipes/components/recipe-step-paint-list.tsx`         | DnD wrapper + rows                                                   |
| Create | `src/modules/recipes/components/recipe-step-paint-row.tsx`          | Editable row                                                         |
| Create | `src/modules/recipes/components/recipe-step-paint-picker.tsx`       | Picker with two modes                                                |
| Create | `src/modules/recipes/components/recipe-step-paint-mode-tabs.tsx`    | Mode switcher                                                        |
| Modify | `src/modules/recipes/components/recipe-step-card.tsx`               | Mounts `<RecipeStepPaintList>` in place of the placeholder           |
| Modify | `src/modules/recipes/components/recipe-detail.tsx`                  | Read view renders step paints                                        |

## Implementation

### 1. Picker — palette mode

When the recipe has a linked palette:

- Picker opens in **Palette mode** by default
- Renders the palette's paints (in palette order) as a grid of `CollectionPaintCard`s
- Selecting a paint calls `addRecipeStepPaint` with `{ stepId, paintId, paletteSlotId }` so the row is later swap-aware
- A search field at the top filters within the palette
- A "Search all paints" tab swaps to general search mode

When no palette is linked, the picker opens directly in **All paints** mode (same as below, no tabs).

### 2. Picker — all-paints mode

Reuse the existing paint-search component (the same one that powers `BaseColorPicker` and `CollectionPaintCard` lookups). Selecting a paint calls `addRecipeStepPaint` with `{ stepId, paintId, paletteSlotId: null }`.

### 3. Row component

`RecipeStepPaintRow` shows:

- Drag handle (only in builder, not read view)
- Paint swatch (24px square) + name + brand
- "From palette" chip when `palette_slot_id` is set
- Ratio input (text, max 200 chars)
- Note input (text, max 500 chars)
- Remove button

Inputs auto-save on blur via `updateRecipeStepPaint`. The component subscribes to `useTransition` for save-in-progress state.

### 4. Read view

`recipe-detail.tsx` renders the step's paint list with no inputs:

- Same swatch + name + brand
- "From palette" chip retained
- Ratio shown as small italic text below the paint name
- Note shown as muted text below the ratio
- Each paint card links to `/paints/{id}`

If the row's `palette_slot_id` is non-null, the recipe service hydrates the **current** `paint_id` from `palette_paints.paint_id` (so palette swaps propagate). If the slot was deleted, fall back to the row's denormalized `paint_id`.

The hydration logic lives in `recipe-service.ts` so both the builder and read view see the same shape.

### 5. Reordering

Same dnd-kit pattern as Epic 11. The row id is `recipe_step_paints.id` (uuid), already stable.

### 6. Mode tab interaction

`RecipeStepPaintModeTabs` is a small headerless control: two tabs ("Palette" / "All paints"), shown only when a palette is linked. Switching tabs swaps the picker body without closing the dialog.

### 7. Manual QA checklist

- Recipe with no linked palette — picker opens in "All paints" mode, no tabs
- Link a palette, open picker on a step — opens in "Palette" mode by default; tabs are visible
- Select a palette paint — row saves, "From palette" chip shows
- Switch to "All paints" tab; pick a paint not in the palette — row saves, no chip
- Edit a row's ratio + note — auto-saves on blur; refresh confirms persistence
- Reorder rows in a step — persists
- Remove a row — list shrinks, positions normalize
- In Epic 11's hue-swap dialog, swap a palette slot's paint — refresh the recipe; rows that referenced that slot now render the new paint
- Delete the linked palette entirely — existing rows still render with their original paint (denormalized)
- Read view shows everything correctly without builder inputs
- `npm run build` + `npm run lint`

## Risks & Considerations

- **Live join through `palette_slot_id`**: Hydrating the "current" paint from the slot is the feature that makes "swap palette → recipe updates" work. Be deliberate about which read paths use the live value vs. the denormalized one. The rule: builder + read view show live values when the slot is alive, denormalized when the slot was deleted. The builder also shows the chip explicitly so the user understands the linkage.
- **Auto-save on blur for ratio/note**: Same UX risk as the recipe step's inline edits. Keep the action small and idempotent; if the user has unsaved changes when navigating away, the builder should warn.
- **Picker state**: The picker's "mode" state is local (no persistence). If the user toggles to "All paints" and adds a paint, then opens the picker again, it reopens in palette mode if a palette is linked. Avoid persisting this — saves a server round trip and respects the model that palette mode is the default.
- **Palette unlink behavior**: If the user clears the palette association on a recipe, existing step paints don't lose their `palette_slot_id`. The slot still exists; it's just no longer "the palette of this recipe." This is intentional — the palette could later be re-linked. The "From palette" chip remains accurate.
- **Picker performance**: The "All paints" mode searches the full library — already proven via `BaseColorPicker`. Reuse the same search hooks; don't reimplement.

## Notes

- The technique chip on a step is inherited; rows don't have their own technique. This matches the inspiration page (technique applies to a step, paints just describe what's used).
- This feature supersedes the placeholder slot left by `01-recipe-builder` — `recipe-step-card.tsx` now mounts the real list.
