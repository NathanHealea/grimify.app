# Paint Group References (Master List + Group Memberships)

**Epic:** Color Palettes
**Type:** Feature
**Status:** Todo
**Branch:** `feature/paint-group-references`
**Merge into:** `v1/main`

## Summary

Rethink palette groups so the same paint can be added to **multiple groups** within one palette without losing the existing rule that the palette's master list contains each paint at most once.

Today a palette is a flat ordered list of `palette_paints` rows where each row carries a single `group_id`. That model collapses two distinct concepts — "is this paint in the palette" and "which group does this paint belong to" — into one row. As a result, putting "Pure Red" into both the **Highlights** and **Layering** groups requires duplicating the paint at the master level (which is now blocked by the duplicate-prevention rule from [`06-prevent-duplicate-paint-add.md`](./06-prevent-duplicate-paint-add.md)) or compromising one of the groups.

This feature splits the model:

1. **Master list** — `palette_paints` becomes a unique catalog of paints in the palette (`UNIQUE (palette_id, paint_id)`).
2. **Group memberships** — a new `palette_group_paints` join table records which master entries belong to which groups, allowing the same `palette_paint_id` to be referenced from multiple groups.

Drag-and-drop semantics change accordingly:

- Dragging a paint **from the master list into a group** creates a membership; the master entry stays put.
- Dragging a paint **from one group into another** moves the membership (delete from source, insert into destination).
- Removing a paint **from a group** deletes only the membership.
- Removing a paint **from the master list** cascades to delete every membership referencing it.

## Acceptance Criteria

- [ ] The same paint can be added to two or more groups within a single palette without violating master-list uniqueness.
- [ ] The master list still rejects duplicate paint adds (the rule from `06-prevent-duplicate-paint-add.md` is preserved).
- [ ] Dragging a master-list row into a group section copies the reference into that group; the master row remains in the master list.
- [ ] Dragging a paint from one group into another deletes the source membership and creates the destination membership in a single transaction; the master row is unaffected.
- [ ] Removing a paint from a group (via per-row remove) deletes only the membership. The paint stays in the master list and any other groups.
- [ ] Removing a paint from the master list cascades to delete every group membership for that paint.
- [ ] Within a group, paints can be reordered independently of the master list and other groups.
- [ ] Within the master list, paints can be reordered without disturbing group memberships.
- [ ] Deleting a group cascades to delete all of its memberships; master-list rows are untouched.
- [ ] The read-only palette view (`/palettes/[id]`) renders the master list followed by each group's referenced paints.
- [ ] The palette builder view renders the same structure with edit affordances.
- [ ] Existing palettes with `palette_paints.group_id` values are migrated into equivalent membership rows without data loss before the column is dropped.
- [ ] `npm run build` and `npm run lint` pass with no errors.

## Out of Scope

- A bulk "add multiple paints to group" UI (the current per-row interaction is sufficient; bulk selection can come as a follow-up).
- Group-level metadata beyond `name` and `position` (no colors, icons, or descriptions yet).
- Cross-palette references (memberships always stay within the palette that owns the master list).
- A schema-level `UNIQUE (palette_id, paint_id)` constraint without a one-time dedupe of any pre-existing duplicate `palette_paints` rows. The migration must handle that dedupe; see _Risks & Considerations_.

## Key Files

| Action  | File                                                                                  | Description                                                                               |
| ------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Create  | `supabase/migrations/{ts}_split_palette_paints_into_master_and_groups.sql`            | New migration: stable id on master, dedupe, UNIQUE, join table, backfill, drop `group_id`. |
| Modify  | `src/modules/palettes/services/palette-service.ts`                                    | Read joined memberships; add `addPaintToGroup` / `removePaintFromGroup` / `reorderGroupPaints`; rewrite reorder to id-based. |
| Modify  | `src/modules/palettes/types/palette-paint.ts`                                         | Add stable `id` field; remove `groupId` (membership lives elsewhere).                     |
| Modify  | `src/modules/palettes/types/palette-group.ts`                                         | Embed an ordered `paints: PaletteGroupPaint[]` reference list.                            |
| Create  | `src/modules/palettes/types/palette-group-paint.ts`                                   | New `PaletteGroupPaint` type — one membership row.                                        |
| Modify  | `src/modules/palettes/types/palette.ts`                                               | `paints` is the master list, `groups[].paints` are the references (already exists).       |
| Create  | `src/modules/palettes/actions/add-paint-to-group.ts`                                  | New server action to insert one membership.                                               |
| Create  | `src/modules/palettes/actions/remove-paint-from-group.ts`                             | New server action to delete one membership.                                               |
| Create  | `src/modules/palettes/actions/reorder-group-paints.ts`                                | New server action to reorder a single group's memberships.                                |
| Delete  | `src/modules/palettes/actions/assign-paint-to-group.ts`                               | Replaced by the two add/remove actions above.                                             |
| Modify  | `src/modules/palettes/actions/reorder-palette-paints.ts`                              | Reorder by `palettePaintId[]` instead of by `paintId[]` (preserves stable ids).           |
| Modify  | `src/modules/palettes/actions/remove-palette-paint.ts`                                | Identify the slot by `palettePaintId` instead of `(paletteId, position)`.                 |
| Modify  | `src/modules/palettes/components/palette-grouped-paint-list.tsx`                      | Major refactor: master list + group sections; copy-on-drag-into-group; per-group reorder. |
| Delete  | `src/modules/palettes/components/palette-paint-group-select.tsx`                      | Single-group selector replaced by chip add/remove on the master row.                      |
| Create  | `src/modules/palettes/components/palette-paint-groups-toggle.tsx`                     | New chip-style multi-toggle: "in group A · add to group B" controls.                       |
| Modify  | `src/modules/palettes/components/palette-paint-row.tsx`                               | Distinguish master-row vs group-row variant; remove behaves differently per variant.       |
| Modify  | `src/modules/palettes/components/palette-paint-list.tsx`                              | Reorder uses `palettePaintId[]`.                                                           |
| Modify  | `docs/11-color-palettes/09-color-palette-groups.md`                                   | Add a "Superseded by `11-paint-group-references.md`" note at the top.                      |
| Modify  | `docs/overview.md`                                                                    | Append the new feature row under Epic: Color Palettes.                                    |

## Implementation Plan

The feature lives entirely in the `palettes` domain module (`src/modules/palettes/`) plus one Supabase migration. All work is broken into ordered groups so reorder/membership behavior is exercised end-to-end before the legacy `group_id` column is dropped.

### Step 1 — Schema migration

Create `supabase/migrations/{timestamp}_split_palette_paints_into_master_and_groups.sql`. Match the section-banner style of `20260508000000_add_palette_groups.sql`.

The migration runs in this order so backfill and constraint changes are safe:

```sql
-- ============================================================
-- 1. Add stable id to palette_paints (no UNIQUE yet).
-- ============================================================
ALTER TABLE public.palette_paints
  ADD COLUMN id uuid NOT NULL DEFAULT gen_random_uuid();

-- ============================================================
-- 2. De-duplicate any pre-existing (palette_id, paint_id) rows
--    by collapsing them onto the lowest position; their memberships
--    will be unioned into the new join table in step 5.
--    The duplicate-prevention rule in 06-prevent-duplicate-paint-add.md
--    blocks new duplicates but never cleaned up old data.
-- ============================================================
WITH ranked AS (
  SELECT
    ctid,
    row_number() OVER (
      PARTITION BY palette_id, paint_id
      ORDER BY position
    ) AS rn
  FROM public.palette_paints
)
DELETE FROM public.palette_paints pp
USING ranked r
WHERE pp.ctid = r.ctid AND r.rn > 1;

-- ============================================================
-- 3. Renumber positions in each palette to close any gaps left by step 2.
-- ============================================================
WITH renumbered AS (
  SELECT id, row_number() OVER (PARTITION BY palette_id ORDER BY position) - 1 AS new_pos
  FROM public.palette_paints
)
UPDATE public.palette_paints pp
SET position = r.new_pos
FROM renumbered r
WHERE pp.id = r.id;

-- ============================================================
-- 4. Promote id to PRIMARY KEY; demote (palette_id, position) to UNIQUE;
--    add the long-overdue UNIQUE (palette_id, paint_id).
-- ============================================================
ALTER TABLE public.palette_paints
  DROP CONSTRAINT palette_paints_pkey;

ALTER TABLE public.palette_paints
  ADD CONSTRAINT palette_paints_pkey PRIMARY KEY (id);

ALTER TABLE public.palette_paints
  ADD CONSTRAINT palette_paints_palette_position_key UNIQUE (palette_id, position)
  DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE public.palette_paints
  ADD CONSTRAINT palette_paints_palette_paint_key UNIQUE (palette_id, paint_id);

-- ============================================================
-- 5. Create the join table.
-- ============================================================
CREATE TABLE public.palette_group_paints (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id         uuid        NOT NULL REFERENCES public.palette_groups (id)  ON DELETE CASCADE,
  palette_paint_id uuid        NOT NULL REFERENCES public.palette_paints (id) ON DELETE CASCADE,
  position         int         NOT NULL CHECK (position >= 0),
  added_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT palette_group_paints_unique_membership UNIQUE (group_id, palette_paint_id),
  CONSTRAINT palette_group_paints_unique_position   UNIQUE (group_id, position) DEFERRABLE INITIALLY IMMEDIATE
);

CREATE INDEX idx_palette_group_paints_group_id         ON public.palette_group_paints (group_id);
CREATE INDEX idx_palette_group_paints_palette_paint_id ON public.palette_group_paints (palette_paint_id);

-- ============================================================
-- 6. Backfill memberships from the legacy group_id column.
--    Position within each group preserves the master-list order.
-- ============================================================
INSERT INTO public.palette_group_paints (group_id, palette_paint_id, position)
SELECT
  pp.group_id,
  pp.id,
  row_number() OVER (PARTITION BY pp.group_id ORDER BY pp.position) - 1
FROM public.palette_paints pp
WHERE pp.group_id IS NOT NULL;

-- ============================================================
-- 7. Drop the legacy group_id column from palette_paints.
-- ============================================================
DROP INDEX IF EXISTS idx_palette_paints_group_id;
ALTER TABLE public.palette_paints DROP COLUMN group_id;
```

Then add RLS for the new table (mirrors the per-action policies on `palette_groups`):

```sql
ALTER TABLE public.palette_group_paints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view group paints they can access"
  ON public.palette_group_paints
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.palette_groups g
      JOIN   public.palettes        p ON p.id = g.palette_id
      WHERE  g.id = palette_group_paints.group_id
        AND  (p.user_id = auth.uid() OR p.is_public = true)
    )
  );

CREATE POLICY "Owners can insert group paints"
  ON public.palette_group_paints
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.palette_groups g
      JOIN   public.palettes        p ON p.id = g.palette_id
      WHERE  g.id = palette_group_paints.group_id
        AND  p.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update group paints"
  ON public.palette_group_paints
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.palette_groups g
      JOIN   public.palettes        p ON p.id = g.palette_id
      WHERE  g.id = palette_group_paints.group_id
        AND  p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.palette_groups g
      JOIN   public.palettes        p ON p.id = g.palette_id
      WHERE  g.id = palette_group_paints.group_id
        AND  p.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can delete group paints"
  ON public.palette_group_paints
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.palette_groups g
      JOIN   public.palettes        p ON p.id = g.palette_id
      WHERE  g.id = palette_group_paints.group_id
        AND  p.user_id = auth.uid()
    )
  );
```

Replace the `replace_palette_paints` RPC with two ID-preserving reorder RPCs. Both use the negative-offset trick so the deferred `UNIQUE (palette_id, position)` / `UNIQUE (group_id, position)` constraint never fires mid-update.

```sql
CREATE OR REPLACE FUNCTION public.reorder_palette_paints_v2(
  p_palette_id        uuid,
  p_palette_paint_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_id  uuid;
  v_idx int := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.palettes
    WHERE id = p_palette_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = '42501';
  END IF;

  -- Phase 1: park positions outside the valid range so the new order can be applied
  -- without colliding with current positions.
  UPDATE public.palette_paints
  SET position = -position - 1
  WHERE palette_id = p_palette_id;

  -- Phase 2: assign final positions.
  FOREACH v_id IN ARRAY p_palette_paint_ids
  LOOP
    UPDATE public.palette_paints
    SET position = v_idx
    WHERE id = v_id AND palette_id = p_palette_id;
    v_idx := v_idx + 1;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.reorder_palette_group_paints(
  p_group_id          uuid,
  p_palette_paint_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_id  uuid;
  v_idx int := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.palette_groups g
    JOIN   public.palettes        p ON p.id = g.palette_id
    WHERE  g.id = p_group_id AND p.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = '42501';
  END IF;

  UPDATE public.palette_group_paints
  SET position = -position - 1
  WHERE group_id = p_group_id;

  FOREACH v_id IN ARRAY p_palette_paint_ids
  LOOP
    UPDATE public.palette_group_paints
    SET position = v_idx
    WHERE group_id = p_group_id AND palette_paint_id = v_id;
    v_idx := v_idx + 1;
  END LOOP;
END;
$$;

DROP FUNCTION IF EXISTS public.replace_palette_paints(uuid, jsonb);
```

### Step 2 — Types

Update `src/modules/palettes/types/palette-paint.ts`:

- Add `id: string` (the new stable PK).
- Remove `groupId`.

```ts
export type PalettePaint = {
  id: string
  position: number
  paintId: string
  note: string | null
  addedAt: string
  paint?: ColorWheelPaint
}
```

Create `src/modules/palettes/types/palette-group-paint.ts`:

```ts
import type { PalettePaint } from '@/modules/palettes/types/palette-paint'

/**
 * A reference from a palette group to one of its palette's master entries.
 *
 * The same {@link palettePaintId} may appear in many groups simultaneously —
 * memberships are independent across groups. Within a single group, each
 * paint appears at most once.
 */
export type PaletteGroupPaint = {
  id: string
  groupId: string
  palettePaintId: string
  position: number
  addedAt: string
  /** Hydrated master entry, present when loaded via `getPaletteById`. */
  palettePaint?: PalettePaint
}
```

Update `src/modules/palettes/types/palette-group.ts` to include an ordered `paints: PaletteGroupPaint[]` array.

`src/modules/palettes/types/palette.ts` already has `paints: PalettePaint[]` and `groups: PaletteGroup[]`; no shape change there, but the JSDoc should clarify that `paints` is the master list and `groups[].paints` are reference rows.

### Step 3 — Service layer

In `src/modules/palettes/services/palette-service.ts`:

1. **`getPaletteById`** — extend the `select(...)` to fetch group memberships:

   ```ts
   .select(
     '*, ' +
     'palette_groups(id, name, position, created_at, palette_group_paints(id, palette_paint_id, position, added_at)), ' +
     'palette_paints(id, position, paint_id, note, added_at, paints(*, product_lines(*, brands(*))))'
   )
   ```

   Map `palette_groups[].palette_group_paints[]` into `PaletteGroup.paints`, sorted by `position` ascending. Hydrate `palettePaint` by looking up the master row in the already-mapped `paints` array — no second query.

2. **Replace `setPalettePaints`** — its only caller becomes the master-list reorder. Switch to the new RPC:

   ```ts
   async reorderMasterList(
     paletteId: string,
     palettePaintIds: string[],
   ): Promise<{ error?: string }> {
     const { error } = await supabase.rpc('reorder_palette_paints_v2', {
       p_palette_id: paletteId,
       p_palette_paint_ids: palettePaintIds,
     })
     if (error) return { error: error.message }
     return {}
   }
   ```

3. **`appendPaintToPalette` / `appendPaintsToPalette`** — change to direct `INSERT INTO palette_paints` with the next-position computed in code. Return the new `palette_paint_id` from the insert so callers can chain a group add. The duplicate-rejection rule in [`06-prevent-duplicate-paint-add.md`](./06-prevent-duplicate-paint-add.md) is preserved (and now also enforced at the schema level by the new UNIQUE constraint).

4. **Remove from master** — replace the read-modify-rewrite pattern with a direct `DELETE` by `palette_paint_id`. The FK on `palette_group_paints.palette_paint_id` is `ON DELETE CASCADE`, so memberships disappear automatically. After delete, renumber remaining master positions via the new RPC.

5. **Remove `assignPaintToGroup`**. Add three new methods:

   ```ts
   async addPaintToGroup(groupId: string, palettePaintId: string): Promise<{ error?: string }>
   async removePaintFromGroup(groupId: string, palettePaintId: string): Promise<{ error?: string }>
   async reorderGroupPaints(groupId: string, palettePaintIds: string[]): Promise<{ error?: string }>
   ```

   `addPaintToGroup` computes the next position as `(max(position) of memberships in group) + 1`, then inserts. `INSERT ... ON CONFLICT (group_id, palette_paint_id) DO NOTHING` makes the action idempotent. `removePaintFromGroup` deletes by composite key. `reorderGroupPaints` calls the new RPC.

6. **`deletePaletteGroup`** — no logic change; the `ON DELETE CASCADE` on `palette_group_paints.group_id` handles the membership cleanup.

### Step 4 — Server actions

For each new/changed action, follow the project pattern: auth → load palette → ownership check → service call → revalidate four paths (`/user/palettes`, `/palettes`, `/palettes/${paletteId}`, `/user/palettes/${paletteId}/edit`).

- **Create** `src/modules/palettes/actions/add-paint-to-group.ts`:

  ```ts
  export async function addPaintToGroup(
    paletteId: string,
    groupId: string,
    palettePaintId: string,
  ): Promise<{ error?: string } | undefined>
  ```

- **Create** `src/modules/palettes/actions/remove-paint-from-group.ts`:

  ```ts
  export async function removePaintFromGroup(
    paletteId: string,
    groupId: string,
    palettePaintId: string,
  ): Promise<{ error?: string } | undefined>
  ```

- **Create** `src/modules/palettes/actions/reorder-group-paints.ts`:

  ```ts
  export async function reorderGroupPaints(
    paletteId: string,
    groupId: string,
    palettePaintIds: string[],
  ): Promise<{ error?: string } | undefined>
  ```

- **Delete** `src/modules/palettes/actions/assign-paint-to-group.ts`. No code in the codebase should reference it after Step 5 lands (verify with grep).

- **Modify** `src/modules/palettes/actions/reorder-palette-paints.ts`:
  - Signature changes from `ordered: { paintId, note, groupId? }[]` to `palettePaintIds: string[]`.
  - The multiset check becomes a set check by id (the new UNIQUE constraint guarantees no dup ids per palette).
  - Calls `service.reorderMasterList(paletteId, palettePaintIds)`.

- **Modify** `src/modules/palettes/actions/remove-palette-paint.ts`:
  - Signature changes from `(paletteId, position)` to `(paletteId, palettePaintId)`.
  - Use `palettePaintId` to delete; no normalization needed because the DB-side reorder closes gaps via the RPC after delete.

### Step 5 — Component refactor: `palette-grouped-paint-list.tsx`

Rebuild the component around the new master-list / membership model. The DnD logic from the existing file is the right scaffold but its `slots` array needs to split into two layers: `master` (master-list slots) and `groupSlots` (per-group reference rows).

**State shape**

```ts
type MasterDraggable = {
  dndId: string                  // mount-stable, never reused
  palettePaintId: string         // stable across reorders
  paint: ColorWheelPaint | undefined
  note: string | null
  addedAt: string
}

type GroupRefDraggable = {
  dndId: string                  // mount-stable per (groupId, palettePaintId)
  groupId: string
  palettePaintId: string         // FK into master
}

const [master, setMaster]               = useState<MasterDraggable[]>(...)
const [groupRefs, setGroupRefs]         = useState<Map<string, GroupRefDraggable[]>>(...)
const [draggableGroups, setGroups]      = useState<DraggableGroup[]>(...)
```

Use one `DndContext` with three logical zones (master, each group, group-header rail). Use the `data` field on each draggable to distinguish:

```ts
useSortable({
  id: dndId,
  data: { kind: 'master' | 'group-ref' | 'group-header', groupId?: string, palettePaintId?: string }
})
```

**Drag semantics — handled in `handleDragEnd`**

| Source kind   | Destination kind                  | Operation                                                                  |
| ------------- | --------------------------------- | -------------------------------------------------------------------------- |
| `master`      | `master`                          | Reorder master via `reorderPalettePaints`.                                 |
| `master`      | `group-ref` or empty group section | **Copy** — call `addPaintToGroup(paletteId, destGroupId, palettePaintId)`. The master row stays; the destination group gains a membership at the drop index, then call `reorderGroupPaints` to commit the index. |
| `group-ref`   | same group's `group-ref`          | Reorder within group via `reorderGroupPaints`.                             |
| `group-ref`   | different group's section         | **Move** — `removePaintFromGroup(source)` + `addPaintToGroup(dest)` in a single transition. If `dest` already has the paint, fall back to a remove-only (the duplicate is the destination already) and surface a debounced toast. |
| `group-ref`   | `master`                          | **Remove from group only** — `removePaintFromGroup(source)`. Master is unchanged. |
| `group-header`| `group-header`                    | Reorder groups (existing behavior, unchanged).                              |

Optimistic updates:
- Master list rows keep their `dndId` across reorders (mount-stable).
- Group ref `dndId` is keyed by `(groupId, palettePaintId)` so a copy across groups gets a new `dndId` automatically.
- A copy locally inserts a new `GroupRefDraggable` into `groupRefs.get(destGroupId)` immediately. On server failure, roll back by restoring the previous `groupRefs` snapshot from `latestConfirmedGroupRefsRef`.

`onDragOver` no longer mutates `groupId` on a master row — instead it sets a transient `previewDrop: { kind, groupId?, index } | null` state used purely for visual feedback; the real mutation happens on `onDragEnd`. This is a meaningful simplification over the current `slotsRef` synchronous-mutation pattern.

**Render layout**

```
┌── Master List ─────────────────────────┐
│ [drag] swatch — Paint name      [trash] [⋯ groups] │
│ ...                                                │
└────────────────────────────────────────┘

┌── Group: Highlights (drag) ────────────┐
│ [drag] swatch — Paint name      [✕]    │   ← only removes membership
│ ...                                   │
└────────────────────────────────────────┘

┌── Group: Layering (drag) ──────────────┐
│ ...                                   │
└────────────────────────────────────────┘
```

The "Ungrouped" pseudo-section from `09-color-palette-groups.md` goes away — the master list now serves that role and is always present.

### Step 6 — Component refactor: `palette-paint-row.tsx`

Add a `variant: 'master' | 'group'` prop. `master` rows render the trash icon (deletes from master list, cascading group removals) and a new `<PalettePaintGroupsToggle />`. `group` rows render the `✕` icon (removes from this group only) and no toggle.

```ts
type Variant =
  | { variant: 'master'; palettePaintId: string }
  | { variant: 'group';  palettePaintId: string; groupId: string }
```

The remove button branches on variant:

```ts
function handleRemove() {
  startTransition(async () => {
    const result = props.variant === 'master'
      ? await removePalettePaint(paletteId, props.palettePaintId)
      : await removePaintFromGroup(paletteId, props.groupId, props.palettePaintId)

    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success(
      props.variant === 'master'
        ? `Removed '${paint.name}' from palette`
        : `Removed '${paint.name}' from group`,
    )
  })
}
```

### Step 7 — Replace single-group selector with a multi-toggle

Delete `src/modules/palettes/components/palette-paint-group-select.tsx` and its only call site in `palette-paint-row.tsx`.

Create `src/modules/palettes/components/palette-paint-groups-toggle.tsx`. It renders one chip per group, with an active state when the master row's paint is currently a member of that group. Clicking a chip calls `addPaintToGroup` or `removePaintFromGroup` in a `useTransition`. Surface failures via `toast.error`.

```tsx
<div className="flex flex-wrap gap-1">
  {groups.map((g) => {
    const isMember = g.paints.some((m) => m.palettePaintId === palettePaintId)
    return (
      <button
        type="button"
        key={g.id}
        onClick={() => toggle(g.id, isMember)}
        disabled={isPending}
        aria-pressed={isMember}
        className={cn(
          'badge cursor-pointer',
          isMember ? 'badge-primary' : 'badge-outline',
        )}
      >
        {g.name}
      </button>
    )
  })}
</div>
```

This affordance is shown only on the master row (where a paint can join multiple groups). Group rows already imply membership in their parent group.

### Step 8 — Update `palette-paint-list.tsx`

For palettes with no groups, `palette-paint-list.tsx` is still the renderer. Its DnD reorder must switch to id-based:

- `seedSlots` adds `palettePaintId` to `DraggableSlot`.
- `handleDragEnd` calls `reorderPalettePaints(paletteId, newSlots.map((s) => s.palettePaintId))`.
- Sort confirm dialog (from `10-color-palette-sorting.md`) likewise calls the new id-based action.

### Step 9 — Documentation

- Edit `docs/11-color-palettes/09-color-palette-groups.md`: add a banner under the Status line:

  > **Note:** Single-group membership has been superseded by [`11-paint-group-references.md`](./11-paint-group-references.md), which allows the same paint to belong to multiple groups via a join table.

- Append a row to the Color Palettes scope list in `docs/overview.md`:

  ```md
  - [ ] [Paint group references (multi-group memberships)](./11-color-palettes/11-paint-group-references.md)
  ```

### Step 10 — Manual QA checklist

- Add a paint to the master list via "Add to palette" → appears in master list once; success toast; second add is rejected with the duplicate toast.
- Drag a master-list row over **Group A** → master row stays; new chip appears in Group A; refresh confirms persistence.
- From the master row, click **Group B** chip → paint also appears in Group B; both chips show `aria-pressed=true`.
- Drag the Group A row over Group B → moves (Group A loses the row, Group B gains it). The master list is unchanged.
- Drag the Group B row over the master list → Group B loses the row; master list unchanged (paint was already present).
- Click **✕** on the Group A row → Group A loses the row; master list and Group B unchanged.
- Click **trash** on the master row → master list loses the paint; all group chips for it disappear; cascade removed from any group it was in.
- Reorder master list via drag → group memberships intact, group internal order intact.
- Reorder within Group A → does not affect master list or other groups.
- Delete Group A entirely → master list intact; Group B intact; Group A's memberships are gone.
- Sign out, view a public palette → master list and group sections render correctly.
- `npm run build` and `npm run lint` pass.

## Risks & Considerations

- **Pre-existing duplicate `palette_paints` rows**: Any palette that ended up with duplicate `(palette_id, paint_id)` rows before [`06-prevent-duplicate-paint-add.md`](./06-prevent-duplicate-paint-add.md) landed will fail the new `UNIQUE (palette_id, paint_id)` constraint. The migration's Step 2 dedupes on the lowest position to handle this. **Run on a snapshot of production data before deploying** to confirm no surprises (e.g. distinct `note` values getting collapsed). If there are notes worth preserving, the dedupe should concatenate them with a separator rather than dropping silently.
- **Backward incompatibility of `replace_palette_paints`**: Any deploy where the old client (still calling the legacy RPC) hits the new schema will break. Plan a coordinated deploy: ship the migration + service/action changes + UI in one PR. Do not stage the migration ahead of the code.
- **Position update concurrency**: The two new reorder RPCs use the negative-offset trick. Two concurrent reorders on the same palette/group could still race, but the second writer's negative phase overwrites the first's final positions and ends up with the second's final order — last-write-wins, which matches the existing `replace_palette_paints` semantics.
- **dnd-kit cross-zone drag complexity**: Distinguishing master vs group via `useSortable({ data })` and routing the drop in `handleDragEnd` is the only practical approach with one `DndContext`. Alternative: nested contexts. Avoid that — cross-context drags require `useDroppable` plumbing and tend to drift out of sync. The single-context approach is what the current `palette-grouped-paint-list.tsx` already uses.
- **Optimistic copy/move rollback**: If a server error happens after the UI has copied a chip into Group B, the rollback must restore both `master` and `groupRefs` to the last confirmed snapshot. Keep `latestConfirmedMasterRef` and `latestConfirmedGroupRefsRef` and snapshot in lockstep, mirroring the pattern from `palette-grouped-paint-list.tsx`.
- **Group chip overflow on small screens**: Palettes with many groups (>6) will overflow the row. The chip strip should wrap (`flex-wrap`) and, if needed in a follow-up, collapse into a popover. Out of scope here — current scope is correctness, not chip UX polish.
- **Public palette read perf**: Fetching `palette_groups → palette_group_paints` in one query adds a join. Existing palettes have ≤30 paints and ≤10 groups, so the query stays small. No new index is required beyond `idx_palette_group_paints_group_id` and `idx_palette_group_paints_palette_paint_id` on the join table.
