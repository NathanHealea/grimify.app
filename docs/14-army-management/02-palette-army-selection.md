# Palette Army Selection

**Epic:** Army Management
**Type:** Feature
**Status:** Completed
**Branch:** `feature/palette-army-selection`
**Merge Into:** `epic/army-management`

## Summary

Allow users to associate a palette with an army when creating or editing it. Adds an `army_id` foreign key to the `palettes` table, surfaces a searchable army combobox in the palette form, and displays the selected army on the palette detail page.

## Acceptance Criteria

- [x] `palettes.army_id` column exists as a nullable FK to `armies.id` with `ON DELETE SET NULL`
- [x] The palette create form includes an army selector (optional field)
- [x] The palette edit form pre-populates with the current army selection and allows changing or clearing it
- [x] The army selector shows all armies in a searchable combobox with ancestry breadcrumb labels (e.g., `Imperium › Space Marines › Dark Angels`)
- [x] Selecting a leaf node or any mid-level army is allowed — any army in the tree can be chosen
- [x] Palette detail/view page displays the associated army icon (if set) and name (with ancestry path) when set
- [x] `Palette` TypeScript type includes an optional `army` field
- [x] Palette service queries join `armies` so the army data is embedded in the returned `Palette`
- [x] All new components and types have JSDoc comments

## Implementation Plan

### 1. Supabase migration

Create `supabase/migrations/20260520000001_add_palette_army_id.sql`:

```sql
ALTER TABLE public.palettes
  ADD COLUMN army_id uuid REFERENCES public.armies (id) ON DELETE SET NULL;
```

`ON DELETE SET NULL` means that if an army is ever deleted, affected palettes lose the association rather than being deleted or blocked.

### 2. Update `Palette` type (`src/modules/palettes/types/palette.ts`)

Add an optional `army` field:

```ts
import type { Army } from '@/modules/armies/types/army'

// inside Palette type:
/** The army this palette is built for; `null` when no army is selected. */
army: Army | null
```

### 3. Update palette service (`src/modules/palettes/services/palette-service.ts`)

In the Supabase select string for `getPaletteById` (and any list queries that embed palette data), add `army:armies(*)` to the select so the army row is fetched and embedded. Map `army` from snake_case to the `Army` type in the same hydration step used for the rest of the palette.

If the palette list service (`getPalettes()` or similar) returns summaries, also include `army_id` and/or the army name so list cards can display the army without a second query.

### 4. Army combobox component (`src/modules/armies/components/army-combobox.tsx`)

A searchable combobox (built on the project's existing combobox pattern — see `src/modules/paints/components/paint-combobox.tsx` for reference) that:

- Accepts `armies: Army[]` (flat list) as a prop and builds ancestry labels in JS
- Displays options as `"Alliance › Faction › Sub-faction"` breadcrumb strings; if an army has an `icon_url`, renders a small icon image (16×16) to the left of the label
- Allows searching by any segment of the breadcrumb path
- Includes a "None" / clear option so the user can unset the army
- Emits the selected army `id` (or `null`) via a hidden form input named `army_id`
- Shows the selected army's icon (if set) and breadcrumb label when closed

Props: `armies: Army[]`, `defaultValue?: string | null`, `name?: string` (defaults to `"army_id"`).

To build ancestry labels: receive the flat `armies` array, build a `Map<id, Army>`, then for each army walk up via `parent_id` until null, accumulating name segments in reverse.

### 5. Update palette form (`src/modules/palettes/components/palette-form.tsx`)

Add the `<ArmyCombobox>` to the palette form below the existing fields (name, description, isPublic). It is an optional field — no validation error if left blank. The form receives an `armies: Army[]` prop (fetched by the parent route page from `armyService.getAllArmiesFlat()`).

### 6. Update create palette action (`src/modules/palettes/actions/create-palette.ts`)

Read `army_id` from form data. If present and non-empty, include it in the insert payload. If absent or empty string, insert `null`.

### 7. Update update palette action (`src/modules/palettes/actions/update-palette.ts`)

Same as above — read `army_id` from form data, coerce empty string to `null`, include in the update payload.

### 8. Update palette create/edit route pages

The route pages that render the palette form must now fetch `armyService.getAllArmiesFlat()` and pass the result as a prop to the form component.

### 9. Display army on palette detail page

On the palette view/detail page (and list cards if space permits), render the army icon (if `icon_url` is set, as a small `<img>` inline) followed by the army name with its ancestry path when `palette.army` is set. A simple inline breadcrumb (e.g., `Imperium › Space Marines`) next to the palette name or in the metadata row is sufficient. When `army` is null, render nothing.

### Affected Files

| File | Changes |
|------|---------|
| `supabase/migrations/20260520000001_add_palette_army_id.sql` | New — adds army_id FK to palettes |
| `src/modules/palettes/types/palette.ts` | Modify — add `army: Army \| null` field |
| `src/modules/palettes/services/palette-service.ts` | Modify — join armies in select; map army into Palette |
| `src/modules/armies/components/army-combobox.tsx` | New — searchable army picker with breadcrumb labels |
| `src/modules/palettes/components/palette-form.tsx` | Modify — add ArmyCombobox field and armies prop |
| `src/modules/palettes/actions/create-palette.ts` | Modify — read and pass army_id |
| `src/modules/palettes/actions/update-palette.ts` | Modify — read and pass army_id |
| Palette create route page | Modify — fetch armies, pass to form |
| Palette edit route page | Modify — fetch armies, pass to form |
| Palette detail/view component | Modify — display army breadcrumb when set |

### Risks & Considerations

- **Ancestry label building**: The flat army list from `getAllArmiesFlat()` must be fetched once and reused — do not make per-army requests to build breadcrumbs. Build the `Map<id, Army>` once in the combobox and compute all labels upfront.
- **Service hydration**: The palette service uses a nested Supabase select with explicit column aliasing. Confirm the join syntax `army:armies(*)` works with the existing query structure before assuming — test with a real palette that has an army set.
- **Empty vs null**: HTML forms serialize unselected fields as empty strings. The create and update actions must convert `""` to `null` before passing to Supabase.
- **Palette list performance**: If the palette list page fetches summaries, avoid joining the full army row for each palette — selecting only `army_id` and the army name in a lighter join is preferable.
- **Ordering**: This feature depends on Feature 00 (army schema) being deployed and Feature 01 (admin army management) having at least some armies seeded before it is useful to users. Implement in order.
