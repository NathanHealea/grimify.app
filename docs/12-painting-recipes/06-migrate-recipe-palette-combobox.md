# Migrate `RecipePaletteCombobox` to Radix Select

**Epic:** Painting Recipes
**Type:** Refactor
**Status:** Todo
**Branch:** `refactor/migrate-recipe-palette-combobox`
**Merge into:** `v1/main`

## Summary

`src/modules/recipes/components/recipe-palette-combobox.tsx` is the **only remaining native `<select>`** in the application. Every other dropdown in the app (paint sort bar, pagination controls, paint pagination, role assignment, user role filter, admin user roles editor, palette paint group selector) was migrated to the shadcn-style `<Select>` primitive that wraps `@radix-ui/react-select` after `@radix-ui/react-select` was added in commit `c9a0f0d`. Migrate this last holdout so the recipe form's "Pinned palette" picker matches every other dropdown in look, feel, keyboard behavior, and theming. As part of the change, fix a small stale JSDoc on `assign-role-form.tsx` that still claims to "render a `<select>`" even though it already uses the Radix primitive.

## Acceptance Criteria

- [ ] `RecipePaletteCombobox` renders Radix `<Select>` instead of a native `<select>`.
- [ ] The form-data contract is unchanged: a hidden `<input type="hidden" name="paletteId">` carries either `""` (no palette) or the palette UUID. `create-recipe` and `update-recipe` actions are **not** modified — they continue to read `formData.get('paletteId')` and treat empty string as `null`.
- [ ] "No palette" remains the first option, defaults to selected when `defaultValue === null`, and submits as `""`.
- [ ] The trigger uses `select-trigger w-full` so it spans the form field width like the native version did.
- [ ] The component still accepts `id`, `name`, `palettes`, `defaultValue` — calling site in `recipe-form.tsx` requires no changes.
- [ ] Keyboard accessibility: trigger is focusable, opens with Enter/Space, arrow keys navigate options, Escape closes (Radix-default).
- [ ] Light and dark mode rendering matches every other Radix-based select in the app.
- [ ] JSDoc on `RecipePaletteCombobox` updated to describe Radix select instead of native `<select>` — drop the "intentional overkill" justification (no longer true).
- [ ] JSDoc on `assign-role-form.tsx` line 24 corrected: it claims to render a `<select>` but already renders the Radix primitive — reword to "dropdown selector" or similar.
- [ ] No grep hit for `^[^*]*<select\b` in `src/` after the change (i.e. no native `<select>` JSX anywhere). The JSDoc-only false positive in `recipe-palette-combobox.tsx` is also gone.
- [ ] `npm run build` and `npm run lint` pass.

## Key Files

| Action | File                                                                | Description                                                                                       |
| ------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Modify | `src/modules/recipes/components/recipe-palette-combobox.tsx`        | Replace native `<select>` with `<Select>`/`<SelectTrigger>`/`<SelectContent>`/`<SelectItem>`. Add a sentinel + hidden input to preserve the `""` form-data contract. Update JSDoc. |
| Modify | `src/modules/admin/components/assign-role-form.tsx`                 | Fix stale JSDoc on line 24 — it claims to render `<select>` but already renders the Radix `<Select>`. One-line edit, no behavior change. |
| —      | `src/modules/recipes/components/recipe-form.tsx`                    | Caller — **no change**. Continues to pass `id`, `name="paletteId"`, `palettes`, `defaultValue={state.values.paletteId}`. |
| —      | `src/modules/recipes/actions/create-recipe.ts`                      | **No change.** Still reads `formData.get('paletteId')`, trims, treats empty as `null`.            |
| —      | `src/modules/recipes/actions/update-recipe.ts`                      | **No change.** Same contract as create.                                                            |

## Implementation Plan

### Module placement

The file already lives in the right place (`src/modules/recipes/components/`). This is a pure refactor — no new files, no new types, no new actions. The migration is one-component-scoped.

### Step 1 — Rewrite `RecipePaletteCombobox`

Replace the body with a Radix Select wired through a hidden input. The hidden input is the key piece that preserves the form-data contract: Radix's `name` prop on `<Select>` would otherwise submit the sentinel string (`"__none__"`) as the value, which would break the action.

```tsx
'use client'

import { useState } from 'react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { PaletteSummary } from '@/modules/palettes/types/palette-summary'

const NO_PALETTE_VALUE = '__none__'

/**
 * Compact palette picker for the recipe form.
 *
 * Renders the shadcn-style `<Select>` primitive populated with the caller's
 * palettes plus a "No palette" sentinel at the top. The selected value is
 * mirrored into a hidden `<input>` so the form submits either `""` (no
 * palette) or the palette UUID — the contract `create-recipe` and
 * `update-recipe` already expect.
 *
 * @param props.name - Form field name. The submitted value is the palette UUID
 *   or `""` for "no palette".
 * @param props.palettes - Caller's palettes, used to populate the dropdown.
 * @param props.defaultValue - Initially-selected palette UUID, or `null` for none.
 * @param props.id - Optional DOM id for the trigger (label association).
 */
export function RecipePaletteCombobox({
  name,
  palettes,
  defaultValue,
  id,
}: {
  name: string
  palettes: PaletteSummary[]
  defaultValue: string | null
  id?: string
}) {
  const [value, setValue] = useState<string>(defaultValue ?? NO_PALETTE_VALUE)
  const formValue = value === NO_PALETTE_VALUE ? '' : value

  return (
    <>
      <input type="hidden" name={name} value={formValue} />
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger id={id} className="select-trigger w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_PALETTE_VALUE}>No palette</SelectItem>
          {palettes.map((palette) => (
            <SelectItem key={palette.id} value={palette.id}>
              {palette.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  )
}
```

Notes on the rewrite:

- **Sentinel = `'__none__'`.** Matches the convention used by `palette-paint-group-select.tsx` (`UNGROUPED_VALUE = '__ungrouped__'`). Radix forbids `value=""` on `<SelectItem>` — that's why the sentinel exists, and why we need the hidden input.
- **Controlled, not uncontrolled.** Radix's `defaultValue` would work too, but we need `value`/`onValueChange` so we can compute `formValue` on each render. Cheap, deterministic, no `useEffect`.
- **Hidden input, not `<Select name=...>`.** The Radix root accepts `name` and renders an internal hidden input — but it submits whatever sentinel string is in the root, so a user choosing "No palette" would post `paletteId=__none__`. The actions translate empty string to `null`; they do **not** know about the sentinel. Keeping the translation in the component (hidden input with `formValue`) is safer than adding sentinel-awareness to two server actions.
- **No `placeholder` on `<SelectValue>`.** The default value always resolves to either a real palette name or "No palette" — the placeholder would never render. (The native `<select>` analogue is "the first option is always selected by default" — which our `defaultValue ?? NO_PALETTE_VALUE` mirrors.)
- **`w-full` on the trigger.** The native `<select>` previously had `className="select w-full"`. The Radix trigger gets `select-trigger w-full` so it still spans the form column.

Drop the stale `'@/modules/palettes/types/palette-summary'` import direction comment — keep the type import, it's still needed.

### Step 2 — Update `assign-role-form.tsx` JSDoc

In `src/modules/admin/components/assign-role-form.tsx`, replace this stale JSDoc line:

```ts
 * Renders a `<select>` populated with users not already assigned to
```

with something like:

```ts
 * Renders a dropdown populated with users not already assigned to
```

That's the only change to this file — it already uses the Radix `<Select>` primitive (line 71). One-line edit, no behavior change. This kills the last `<select>` grep false-positive in the codebase.

### Step 3 — Verify

1. **Build / lint.** `npm run build` and `npm run lint` pass.
2. **No native selects anywhere.** Run `grep -rnE "<select(\s|>)" src --include="*.tsx" --include="*.ts" | grep -v "^[^:]*:[0-9]*: \*"` — output should be empty.
3. **Recipe form smoke test** (`npm run dev`):
   - Create a new recipe without picking a palette → submits, `paletteId` is `null` in the DB row.
   - Create a recipe and pick a palette → submits, `paletteId` is the chosen UUID.
   - Edit an existing recipe whose palette is set → trigger displays the palette's name on load; switching to "No palette" and saving clears `paletteId` to `null`.
   - Edit an existing recipe whose palette is `null` → trigger displays "No palette" on load; selecting a palette and saving sets `paletteId`.
4. **Keyboard.** Focus the trigger via Tab; press Space → menu opens; arrow keys move selection; Enter selects; Escape closes.
5. **Theming.** Toggle dark mode — trigger and popup use the same `bg-popover` / `border-input` / `text-popover-foreground` tokens as every other Radix select in the app.

### Order of operations

1. Step 1 — rewrite `RecipePaletteCombobox`.
2. Step 2 — fix the `assign-role-form.tsx` JSDoc (trivial cleanup, can ride in the same PR; logically belongs in this refactor because it's the same audit that surfaced the issue).
3. Step 3 — manual verification.

Single commit, single PR. Conventional commit style: `refactor(recipes): migrate palette picker to Radix Select`.

## Risks & Considerations

- **Form-data contract is the load-bearing invariant.** If the hidden input is dropped (or its `value` is computed wrong), saving "No palette" will write the sentinel string into `paletteId` instead of `null`, which silently breaks the server-side `palette_id` foreign key. The verification step above explicitly probes both paths (set → null, null → set).
- **Don't make the actions sentinel-aware.** Tempting to "simplify" by skipping the hidden input and teaching `create-recipe` + `update-recipe` to translate `__none__` → `null`. Don't — that splits the sentinel knowledge across three files (component + 2 actions) and risks the next non-form caller of those actions (e.g. an API route) leaking the sentinel into the DB.
- **`SelectValue` resolution for missing palettes.** If a recipe is loaded with a `paletteId` whose palette no longer exists (rare, but possible after a palette delete), the `Select` value is set to a UUID with no matching `<SelectItem>`. Radix renders an empty trigger in that case. This matches the native `<select>`'s behavior (empty option text) — so no regression, but worth knowing.
- **Sentinel collision.** `__none__` is fine because palette UUIDs can't start with `__`. Don't change the sentinel to anything that could be a real value.
- **`select-trigger w-full` not `select w-full`.** The previous component used the legacy `.select` class which targeted native `<select>` styling. The Radix trigger uses `.select-trigger`. Mixing them up will leave the field unstyled.
- **Out of scope.** No DB schema change, no API change, no validation logic change, no new sizes / variants for the trigger. Just swap the markup and fix one stale doc string.
