# Color Palette Groups

**Epic:** Color Palettes
**Type:** Feature
**Status:** Todo
**Branch:** `feature/color-palette-groups`
**Merge into:** `v1/main`

## Summary

Allow palette owners to create named groups within a palette to organize paints by model part (e.g., "Basecoat", "Highlights", "Metallics"). Groups are reorderable and have a free-text name. Deleting a group removes only the group label — the paints remain in the palette as ungrouped entries. Group membership is stored on the `palette_paints` row as a nullable `group_id` so it survives drag-to-reorder via the existing `replace_palette_paints` RPC.

## Acceptance Criteria

- [ ] Palette owners can create a group by typing a name and submitting an inline form inside the palette builder
- [ ] Groups are displayed as labeled section headers within the paint list (builder and read view)
- [ ] Group names can be edited inline via a text input that auto-saves on blur
- [ ] Deleting a group does not delete any palette paints — their `group_id` becomes `NULL` (ungrouped) via `ON DELETE SET NULL`
- [ ] Paints can be assigned to a group, moved to a different group, or moved back to ungrouped via a per-row select in the builder
- [ ] Groups are ordered by `position`; owners can drag-and-drop to reorder groups (group DnD is a separate `DndContext` from paint DnD)
- [ ] Ungrouped paints render as a distinct section below all named groups
- [ ] The read-only view (`/palettes/[id]`) also renders paints organized by group
- [ ] `npm run build` and `npm run lint` pass with no errors

## Implementation Plan

The work spans the `palettes` domain module exclusively (`src/modules/palettes/`). New files follow the file-per-export rule under existing subdirectories.

### Step 1 — Database migration

Create `supabase/migrations/20260508000000_add_palette_groups.sql`. Match the style of `20260425000000_create_palettes_tables.sql`: section banners, separate RLS policies per action, explicit role grants (`TO authenticated` for owner ops, `TO anon, authenticated` for public read).

```sql
-- ============================================================
-- Create palette_groups: ordered named buckets within a palette
-- ============================================================

CREATE TABLE public.palette_groups (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  palette_id uuid        NOT NULL REFERENCES public.palettes (id) ON DELETE CASCADE,
  name       text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  position   int         NOT NULL CHECK (position >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_palette_groups_palette_id ON public.palette_groups (palette_id);

-- ============================================================
-- Add group_id to palette_paints (nullable; SET NULL on delete)
-- ============================================================

ALTER TABLE public.palette_paints
  ADD COLUMN group_id uuid REFERENCES public.palette_groups (id) ON DELETE SET NULL;

CREATE INDEX idx_palette_paints_group_id ON public.palette_paints (group_id);

-- ============================================================
-- Row Level Security: palette_groups
-- Ownership is derived from the parent palettes row.
-- ============================================================

ALTER TABLE public.palette_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view palette groups they can access"
  ON public.palette_groups
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.palettes p
      WHERE p.id = palette_groups.palette_id
        AND (p.user_id = auth.uid() OR p.is_public = true)
    )
  );

CREATE POLICY "Owners can create palette groups"
  ON public.palette_groups
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.palettes p
      WHERE p.id = palette_groups.palette_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update palette groups"
  ON public.palette_groups
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.palettes p
      WHERE p.id = palette_groups.palette_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.palettes p
      WHERE p.id = palette_groups.palette_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can delete palette groups"
  ON public.palette_groups
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.palettes p
      WHERE p.id = palette_groups.palette_id
        AND p.user_id = auth.uid()
    )
  );

-- ============================================================
-- Update replace_palette_paints RPC to carry group_id
-- The existing function only inserts (palette_id, position, paint_id, note),
-- so reorder would null out group_id. Re-create it to also persist group_id.
-- ============================================================

CREATE OR REPLACE FUNCTION public.replace_palette_paints(
  p_palette_id uuid,
  p_rows       jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_row jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.palettes
    WHERE id = p_palette_id
      AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.palette_paints WHERE palette_id = p_palette_id;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    INSERT INTO public.palette_paints (palette_id, position, paint_id, note, group_id)
    VALUES (
      p_palette_id,
      (v_row->>'position')::int,
      (v_row->>'paint_id')::uuid,
      v_row->>'note',
      NULLIF(v_row->>'group_id', '')::uuid
    );
  END LOOP;
END;
$$;
```

Apply via `supabase db push` (local).

### Step 2 — Regenerate Supabase TypeScript types

```bash
supabase gen types typescript --local > src/types/supabase.ts
```

### Step 3 — Types

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

Update `src/modules/palettes/types/palette-paint.ts` — add `groupId: string | null` to the `PalettePaint` shape.

Update `src/modules/palettes/types/palette.ts` — add `groups: PaletteGroup[]` to the `Palette` shape.

### Step 4 — Update palette service

`src/modules/palettes/services/palette-service.ts` (factory `createPaletteService(supabase)`):

1. **`getPaletteById`** — extend the existing `select` to include `palette_groups(id, name, position, created_at)` and `group_id` on `palette_paints`. Sort `groups` by `position` ascending. Map `group_id` → `groupId: string | null` on each paint slot.

2. **`setPalettePaints`** — extend the row payload type to include `groupId?: string | null` and pass `group_id: p.groupId ?? null` through the JSON rows so the updated RPC persists it.

3. Add new methods on the service factory return value:

   - **`createPaletteGroup(paletteId, name)`** — inserts into `palette_groups` with `position = (current max + 1)`. Returns `{ group?: PaletteGroup; error?: string }`.
   - **`updatePaletteGroup(groupId, patch: { name?: string })`** — UPDATE on `palette_groups`. Returns `{ group?: PaletteGroup; error?: string }`.
   - **`deletePaletteGroup(groupId)`** — DELETE on `palette_groups`; the FK cascade sets `group_id = NULL` on member paints. Returns `{ error?: string }`.
   - **`reorderPaletteGroups(paletteId, ordered: Array<{ id: string; position: number }>)`** — batch UPDATE positions. Returns `{ error?: string }`. (Simple sequence of single-row updates is fine; group counts are small. No new RPC needed.)
   - **`assignPaintToGroup(paletteId, position, groupId: string | null)`** — UPDATE `palette_paints` `group_id` where `(palette_id, position)`. Returns `{ error?: string }`.

### Step 5 — Server actions

Each action follows the existing pattern in `actions/reorder-palette-paints.ts`:

1. Auth check via `supabase.auth.getUser()`
2. Load palette via `service.getPaletteById`
3. Ownership check (`palette.userId !== user.id`)
4. Service call
5. `revalidatePath` block (4 paths)
6. Return `undefined` on success, `{ error: string }` on failure

The standard revalidate block:

```ts
revalidatePath('/user/palettes')
revalidatePath('/palettes')
revalidatePath(`/palettes/${paletteId}`)
revalidatePath(`/user/palettes/${paletteId}/edit`)
```

Files to create under `src/modules/palettes/actions/`:

| File | Action signature |
|------|------------------|
| `create-palette-group.ts` | `createPaletteGroup(paletteId: string, name: string): Promise<{ error?: string } \| undefined>` |
| `update-palette-group.ts` | `updatePaletteGroup(paletteId: string, groupId: string, name: string): Promise<{ error?: string } \| undefined>` |
| `delete-palette-group.ts` | `deletePaletteGroup(paletteId: string, groupId: string): Promise<{ error?: string } \| undefined>` |
| `reorder-palette-groups.ts` | `reorderPaletteGroups(paletteId: string, ordered: Array<{ id: string; position: number }>): Promise<{ error?: string } \| undefined>` |
| `assign-paint-to-group.ts` | `assignPaintToGroup(paletteId: string, position: number, groupId: string \| null): Promise<{ error?: string } \| undefined>` |

`update-palette-group.ts` and `delete-palette-group.ts` take `paletteId` as the first argument so the action can run the standard ownership check and revalidate the right paths without a reverse lookup from `groupId`.

### Step 6 — Validation

Add a `validateGroupName(name: string): string | null` helper to `src/modules/palettes/validation.ts`. Mirror the `validateName` pattern: trim, enforce 1–100 chars, return `null` for valid, an error string otherwise. The `create-` and `update-` actions call this before the service call.

### Step 7 — UI components

#### `PaletteGroupHeader` (`src/modules/palettes/components/palette-group-header.tsx`)

Client component. A draggable section divider for one group.

Props:
- `paletteId: string`
- `group: PaletteGroup`
- `canEdit: boolean`
- `dndId?: string` — when present, the header is draggable (via `useSortable` from dnd-kit, mirroring `PalettePaintRow`)

Layout:
- Drag handle (visible only in edit mode, reuses `palette-drag-handle.tsx`)
- Inline `<input>` for the group name; `onBlur` calls `updatePaletteGroup` inside `useTransition` (no full form state — single field, auto-save). Show a Sonner toast on error and revert the input value to `group.name`.
- A small delete button that opens a `PaletteGroupDeleteDialog` (Step 7c).

In read mode (`canEdit={false}`) render a plain `<h3>` with `group.name`.

#### `PaletteGroupForm` (`src/modules/palettes/components/palette-group-form.tsx`)

Client component. Inline form to create a new group. Uses `useActionState` against `createPaletteGroup` (mirrors `palette-form.tsx`):

```tsx
const [state, formAction, isPending] = useActionState(action, undefined)
```

Renders a single-row form with a text input (`name="name"`, max 100 chars), an "Add group" submit button, and inline error text from `state?.error`. Reset the input on successful submit (track previous error via `useRef` like `palette-form.tsx` does).

Props: `paletteId: string`.

#### `PaletteGroupDeleteDialog` (`src/modules/palettes/components/palette-group-delete-dialog.tsx`)

Client component. Confirmation dialog for "Delete group?". Pattern mirrors `delete-palette-button.tsx` exactly:

- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter` from `@/components/ui/dialog`
- State-controlled open via parent (`PaletteGroupHeader`)
- `useTransition` to call `deletePaletteGroup`
- Body copy: "Delete the group _\"{name}\"_? Paints in this group will become ungrouped — they won't be removed from the palette."
- Cancel + Delete buttons

No type-to-confirm — group delete is non-destructive to paint data, so a single confirm click is enough.

Props: `paletteId, group, open, onOpenChange`.

#### `PalettePaintGroupSelect` (`src/modules/palettes/components/palette-paint-group-select.tsx`)

Client component. Per-row group selector rendered inside `PalettePaintRow` (only in edit mode and only when at least one group exists).

Renders a `<select>` with `<option value="">Ungrouped</option>` followed by one option per group. `onChange` calls `assignPaintToGroup` inside `useTransition` and shows a toast on error.

Props: `paletteId, position, currentGroupId, groups`.

#### `PaletteGroupedPaintList` (`src/modules/palettes/components/palette-grouped-paint-list.tsx`)

Client component. Replaces the flat `PalettePaintList` in `PaletteBuilder` and (in read mode) in `PaletteDetail`.

Top-level structure:

1. Wrap the group headers in their own `DndContext` (sensors and `closestCenter` mirror `palette-paint-list.tsx`). Reorder updates a `useState<PaletteGroup[]>` and calls `reorderPaletteGroups` via `useTransition`. Use the same `latestConfirmedRef` rollback-on-error pattern as `palette-paint-list.tsx` lines 81–119.
2. For each group section: render `<PaletteGroupHeader>` + a per-group `DndContext`/`SortableContext` of that group's `PalettePaintRow`s. Reorder within a group calls `reorderPalettePaints` with the full palette slot list (groups stable, only positions change inside the touched group). The action's existing multiset validation accepts any permutation.
3. Append an "Ungrouped" section using the same per-group DnD wrapper, rendering paints with `groupId === null`.
4. Below all sections in edit mode, render `<PaletteGroupForm>` for adding new groups.

Pass `groups` and `paints` from the parent. Each `PalettePaintRow` receives the additional `groups` prop so it can render `PalettePaintGroupSelect`.

#### `PalettePaintRow` (`src/modules/palettes/components/palette-paint-row.tsx`) — small extension

Add an optional `groups?: PaletteGroup[]` and `currentGroupId?: string | null` prop. When `canEdit && groups && groups.length > 0`, render `<PalettePaintGroupSelect>` next to (or below) the existing controls. When `groups` is absent or empty, render nothing extra — the row keeps its current behavior so the flat `PalettePaintList` continues to work unchanged on palettes with no groups.

### Step 8 — Update `PaletteBuilder`

`src/modules/palettes/components/palette-builder.tsx`: replace the `PalettePaintList` usage with `PaletteGroupedPaintList`, passing `paints={palette.paints}`, `groups={palette.groups}`, `paletteId={palette.id}`, `canEdit`. The owner empty-state branch (`palette.paints.length === 0`) stays.

### Step 9 — Update `PaletteDetail` (read view)

`src/modules/palettes/components/palette-detail.tsx`: when `palette.groups.length > 0`, render `<PaletteGroupedPaintList canEdit={false} ... />` instead of `PalettePaintList`. When there are no groups, keep the existing flat `PalettePaintList` call (no behavior change for legacy palettes).

### Step 10 — Reorder utility

The existing `reorderPalettePaints` action accepts the full palette slot list as input. To keep group reordering clean, `PaletteGroupedPaintList` builds the new full slot list from per-group DnD events by:

1. Splicing the moved slot within its group's slice
2. Concatenating each group's slice in current group order
3. Appending the ungrouped slice
4. Calling `reorderPalettePaints(paletteId, fullList)`

No new server-side validation is needed — the multiset check at `reorder-palette-paints.ts:49–60` already handles this.

### Affected Files

| File | Changes |
|------|---------|
| `supabase/migrations/20260508000000_add_palette_groups.sql` | New migration: `palette_groups` table, `group_id` column, RLS, updated `replace_palette_paints` RPC |
| `src/types/supabase.ts` | Regenerated |
| `src/modules/palettes/types/palette-group.ts` | New `PaletteGroup` type |
| `src/modules/palettes/types/palette-paint.ts` | Add `groupId: string \| null` |
| `src/modules/palettes/types/palette.ts` | Add `groups: PaletteGroup[]` |
| `src/modules/palettes/services/palette-service.ts` | Update `getPaletteById`/`setPalettePaints`; add 5 group methods |
| `src/modules/palettes/validation.ts` | Add `validateGroupName` |
| `src/modules/palettes/actions/create-palette-group.ts` | New action |
| `src/modules/palettes/actions/update-palette-group.ts` | New action |
| `src/modules/palettes/actions/delete-palette-group.ts` | New action |
| `src/modules/palettes/actions/reorder-palette-groups.ts` | New action |
| `src/modules/palettes/actions/assign-paint-to-group.ts` | New action |
| `src/modules/palettes/components/palette-group-header.tsx` | New component |
| `src/modules/palettes/components/palette-group-form.tsx` | New component |
| `src/modules/palettes/components/palette-group-delete-dialog.tsx` | New component |
| `src/modules/palettes/components/palette-paint-group-select.tsx` | New component |
| `src/modules/palettes/components/palette-grouped-paint-list.tsx` | New component |
| `src/modules/palettes/components/palette-paint-row.tsx` | Accept `groups` + `currentGroupId`; render group select in edit mode |
| `src/modules/palettes/components/palette-builder.tsx` | Use `PaletteGroupedPaintList` |
| `src/modules/palettes/components/palette-detail.tsx` | Use grouped list when groups exist |

### Risks & Considerations

- **`replace_palette_paints` RPC change is non-additive** — the new column must be in the RPC body or reordering will silently null out `group_id`. Verify by reordering paints in a grouped palette and confirming groups are preserved.
- **`palette_paints` PK is `(palette_id, position)`** (not `paint_id`), so adding `group_id` as a regular nullable column is safe; it does not interact with the PK.
- **`getPaletteById` is the central read path** — the additional nested select for `palette_groups` plus `group_id` on `palette_paints` should be verified against the Supabase response shape.
- **Group DnD and paint DnD must use separate `DndContext` instances** to avoid sortable id collisions (groups are keyed by `group.id`, paints by `slot.dndId`).
- **Read-view backward compat** — palettes created before this migration have `groups = []` and `groupId = null` on every paint. `PaletteDetail` falls back to the flat `PalettePaintList` in that case so legacy palettes render identically.
- **Empty group is allowed** — a group with no paints still renders its header so the owner can drag paints into it. No extra validation needed.
- **Position uniqueness within `palette_groups`** is *not* enforced by a DB unique index; the application normalizes `0..N-1` on every reorder. Matches the pattern used for `palette_paints.position`.
- **Inline rename auto-save vs. validation** — the rename `onBlur` path bypasses `useActionState`. Run `validateGroupName` client-side before calling the action; if invalid, revert and toast.
