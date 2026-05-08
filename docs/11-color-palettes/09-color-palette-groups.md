# Color Palette Groups

**Epic:** Color Palettes
**Type:** Feature
**Status:** Todo
**Branch:** `feature/color-palette-groups`
**Merge into:** `v1/main`

## Summary

Allow palette owners to create named groups within a palette to organize paints by model part (e.g., "Basecoat", "Highlights", "Metallics"). Groups are reorderable and have a free-text name. Deleting a group removes only the group label — the paints remain in the palette as ungrouped entries.

## Acceptance Criteria

- [ ] Palette owners can create a group by typing a name and submitting a form inside the palette builder
- [ ] Groups are displayed as labeled section headers within the paint list (builder and read view)
- [ ] Group names can be edited inline via a text input
- [ ] Deleting a group does not delete any palette paints — their `group_id` becomes `NULL` (ungrouped)
- [ ] Paints can be assigned to a group or moved to a different group (or back to ungrouped) via a per-row select in the builder
- [ ] Groups are ordered by `position`; owners can drag-and-drop to reorder groups (groups section is separate from paint reorder)
- [ ] Ungrouped paints render as a distinct section below all named groups
- [ ] The read-only view (`/palettes/[id]`) also renders paints organized by group
- [ ] `npm run build` and `npm run lint` pass with no errors

## Implementation Plan

### Step 1 — Database migration

Create `supabase/migrations/20260508000000_add_palette_groups.sql`:

```sql
-- palette_groups table
CREATE TABLE palette_groups (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  palette_id uuid        NOT NULL REFERENCES palettes(id) ON DELETE CASCADE,
  name       text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  position   integer     NOT NULL CHECK (position >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_palette_groups_palette_id ON palette_groups (palette_id);

-- group_id on palette_paints (nullable; ON DELETE SET NULL keeps paints when group is deleted)
ALTER TABLE palette_paints
  ADD COLUMN group_id uuid REFERENCES palette_groups(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE palette_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "palette_groups_owner" ON palette_groups
  USING (
    EXISTS (
      SELECT 1 FROM palettes
      WHERE palettes.id = palette_groups.palette_id
        AND palettes.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM palettes
      WHERE palettes.id = palette_groups.palette_id
        AND palettes.user_id = auth.uid()
    )
  );

CREATE POLICY "palette_groups_public_read" ON palette_groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM palettes
      WHERE palettes.id = palette_groups.palette_id
        AND palettes.is_public = true
    )
  );
```

Apply via `supabase db push` (local) or the Supabase CLI migration workflow.

### Step 2 — Regenerate Supabase TypeScript types

```bash
supabase gen types typescript --local > src/types/supabase.ts
```

### Step 3 — New `PaletteGroup` type

Create `src/modules/palettes/types/palette-group.ts`:

```ts
export type PaletteGroup = {
  id: string
  paletteId: string
  name: string
  position: number
  createdAt: string
}
```

### Step 4 — Update existing types

**`PalettePaint`** (`src/modules/palettes/types/palette-paint.ts`): add `groupId: string | null`.

**`Palette`** (`src/modules/palettes/types/palette.ts`): add `groups: PaletteGroup[]`.

### Step 5 — Update palette service

`src/modules/palettes/services/palette-service.ts`:

1. **`getPaletteById`** — extend the Supabase select to include `palette_groups(id, name, position, created_at)` and `group_id` on `palette_paints`. Map both into the returned `Palette`.

2. **`createPaletteGroup(paletteId, name)`** — inserts a new row with `position` set to `(current max + 1)`. Returns `PaletteGroup`.

3. **`updatePaletteGroup(groupId, patch: { name?: string })`** — patches the group row. Returns `PaletteGroup`.

4. **`deletePaletteGroup(groupId)`** — deletes the group; the DB cascade sets `group_id = NULL` on member paints.

5. **`reorderPaletteGroups(paletteId, groups: Array<{ id: string; position: number }>)`** — batch-updates `position` for each group row. Returns `{ error?: string }`.

6. **`assignPaintToGroup(paletteId, position, groupId: string | null)`** — updates `group_id` on the `palette_paints` row at `(palette_id, position)`. Returns `{ error?: string }`.

### Step 6 — Server actions

Create one file per action in `src/modules/palettes/actions/`:

| File | Action | Revalidates |
|------|---------|-------------|
| `create-palette-group.ts` | `createPaletteGroup(paletteId, name)` | `/palettes/[id]/edit` |
| `update-palette-group.ts` | `updatePaletteGroup(groupId, name)` | `/palettes/[id]/edit` |
| `delete-palette-group.ts` | `deletePaletteGroup(groupId, paletteId)` | `/palettes/[id]/edit` |
| `reorder-palette-groups.ts` | `reorderPaletteGroups(paletteId, groups)` | `/palettes/[id]/edit` |
| `assign-paint-to-group.ts` | `assignPaintToGroup(paletteId, position, groupId)` | `/palettes/[id]/edit` |

Each action follows the existing pattern: server-side Supabase client → service call → revalidatePath → return `{ error?: string }`.

### Step 7 — New UI components

#### `PaletteGroupHeader` (`src/modules/palettes/components/palette-group-header.tsx`)

Client component. Renders a group section divider:
- In read mode: `<h3>` with the group name
- In edit mode: inline text input (auto-save on blur via `updatePaletteGroup`), plus a delete button (calls `deletePaletteGroup` with optimistic removal)

Props: `groupId`, `paletteId`, `name`, `canEdit`.

#### `PaletteGroupForm` (`src/modules/palettes/components/palette-group-form.tsx`)

Client component. A small inline form (text input + "Add group" button) that calls `createPaletteGroup` on submit. Shown at the bottom of the groups section in the builder.

Props: `paletteId`.

#### `PaletteGroupedPaintList` (`src/modules/palettes/components/palette-grouped-paint-list.tsx`)

Client component. Replaces the flat `PalettePaintList` in `PaletteBuilder`. Renders:
1. Named groups (sorted by `position`) — each as a `PaletteGroupHeader` followed by its paints
2. An "Ungrouped" section for paints with `groupId === null`
3. A `PaletteGroupForm` at the bottom for adding new groups

In edit mode, each paint row includes a group-select dropdown (rendered via a small select element showing group names + "No group"). On change, calls `assignPaintToGroup`.

Group reorder uses a separate `DndContext` wrapping the group headers (not the paint rows). Paint reorder within the flat global position continues to work via the existing `reorderPalettePaints` action.

Paint rows remain the existing `PalettePaintRow` component — only the wrapper changes.

### Step 8 — Update `PaletteBuilder`

`src/modules/palettes/components/palette-builder.tsx`: replace `PalettePaintList` with `PaletteGroupedPaintList` in the edit path. Pass `groups` from the `palette` prop.

### Step 9 — Update `PaletteDetail` (read view)

`src/modules/palettes/components/palette-detail.tsx`: replace or augment `PalettePaintList` with a read-only grouped view. Either pass groups to a shared grouped component (with `canEdit={false}`) or render group headers inline before their paints.

### Affected Files

| File | Changes |
|------|---------|
| `supabase/migrations/20260508000000_add_palette_groups.sql` | New migration |
| `src/types/supabase.ts` | Regenerated |
| `src/modules/palettes/types/palette-group.ts` | New type |
| `src/modules/palettes/types/palette-paint.ts` | Add `groupId: string \| null` |
| `src/modules/palettes/types/palette.ts` | Add `groups: PaletteGroup[]` |
| `src/modules/palettes/services/palette-service.ts` | Update `getPaletteById`; add 5 group methods |
| `src/modules/palettes/actions/create-palette-group.ts` | New action |
| `src/modules/palettes/actions/update-palette-group.ts` | New action |
| `src/modules/palettes/actions/delete-palette-group.ts` | New action |
| `src/modules/palettes/actions/reorder-palette-groups.ts` | New action |
| `src/modules/palettes/actions/assign-paint-to-group.ts` | New action |
| `src/modules/palettes/components/palette-group-header.tsx` | New component |
| `src/modules/palettes/components/palette-group-form.tsx` | New component |
| `src/modules/palettes/components/palette-grouped-paint-list.tsx` | New component |
| `src/modules/palettes/components/palette-builder.tsx` | Use grouped list |
| `src/modules/palettes/components/palette-detail.tsx` | Render groups in read view |

### Risks & Considerations

- `getPaletteById` already does a complex join; adding `palette_groups` as another nested select should be fine but verify the Supabase client shapes the response correctly.
- `ON DELETE SET NULL` on `group_id` is the core safety mechanism for the "delete group, keep paints" requirement — ensure the migration is correct before building the UI.
- Group drag-and-drop and paint drag-and-drop must use separate `DndContext` instances to avoid ID collisions.
- The existing `PalettePaintList` is also used in `PaletteDetail` (read view). Keep that component intact and add group awareness there separately, or unify under `PaletteGroupedPaintList` with `canEdit` controlling group management controls.
- Supabase type regeneration must happen after `supabase db push` or the TypeScript types will be stale.
