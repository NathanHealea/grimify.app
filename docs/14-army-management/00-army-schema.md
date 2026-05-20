# Army Database Schema & Module Foundation

**Epic:** Army Management
**Type:** Feature
**Status:** Todo
**Branch:** `feature/army-schema`
**Merge Into:** `main`

## Summary

Create the `armies` table with a self-referential `parent_id` to support unlimited hierarchical depth (alliance → faction → sub-faction), enable RLS policies matching the hues pattern (public read, admin write), and scaffold the `armies` domain module with types and services.

## Acceptance Criteria

- [ ] `armies` table exists with `id`, `parent_id` (nullable self-ref FK), `name`, `slug`, `sort_order`, and `created_at` columns
- [ ] Slug uniqueness is enforced per level: top-level slugs are globally unique; child slugs are unique within their parent
- [ ] `ON DELETE RESTRICT` on `parent_id` prevents deleting a parent that still has children
- [ ] RLS is enabled: all authenticated and anonymous users can read armies; only admins can insert, update, or delete
- [ ] `src/modules/armies/` module exists with `types/army.ts`, `types/army-node.ts`, and `services/army-service.ts`
- [ ] `ArmyService` exports: `getRootArmies()`, `getChildArmies(parentId)`, `getArmyTree()`, `getArmyById(id)`, `getAllArmiesFlat()`
- [ ] All exported types and service functions have JSDoc comments

## Implementation Plan

### 1. Supabase migration

Create `supabase/migrations/20260520000000_add_armies_table.sql`:

```sql
CREATE TABLE public.armies (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   uuid        REFERENCES public.armies (id) ON DELETE RESTRICT,
  name        text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  slug        text        NOT NULL CHECK (char_length(slug) BETWEEN 1 AND 100),
  sort_order  int,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Top-level slugs are globally unique
CREATE UNIQUE INDEX uq_armies_slug_top_level
  ON public.armies (slug) WHERE parent_id IS NULL;

-- Child slugs are unique within their parent
CREATE UNIQUE INDEX uq_armies_slug_within_parent
  ON public.armies (parent_id, slug) WHERE parent_id IS NOT NULL;

ALTER TABLE public.armies ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "armies_public_read"
  ON public.armies FOR SELECT
  USING (true);

-- Admin write: insert
CREATE POLICY "armies_admin_insert"
  ON public.armies FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- Admin write: update
CREATE POLICY "armies_admin_update"
  ON public.armies FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- Admin write: delete
CREATE POLICY "armies_admin_delete"
  ON public.armies FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );
```

Verify RLS policy SQL matches the exact pattern used in the hues migration before running.

### 2. Army type (`src/modules/armies/types/army.ts`)

Mirror the DB columns as a TypeScript type. `parent_id` is `string | null` (null for root armies). `sort_order` is `number | null`.

### 3. ArmyNode type (`src/modules/armies/types/army-node.ts`)

Extends `Army` with a `children: ArmyNode[]` field for recursive tree rendering. Used by admin tree lists and the palette army combobox.

### 4. Army service (`src/modules/armies/services/army-service.ts`)

All functions query the `armies` table via the Supabase server client. Key functions:

- **`getRootArmies()`** — `SELECT * FROM armies WHERE parent_id IS NULL ORDER BY sort_order ASC NULLS LAST, name ASC`
- **`getChildArmies(parentId: string)`** — `SELECT * FROM armies WHERE parent_id = $1 ORDER BY sort_order ASC NULLS LAST, name ASC`
- **`getAllArmiesFlat()`** — `SELECT * FROM armies ORDER BY sort_order ASC NULLS LAST, name ASC` — used to build trees in JS and for flat combobox lists
- **`getArmyById(id: string)`** — single row with optional parent join: `SELECT armies.*, parent:armies!parent_id(*) FROM armies WHERE id = $1`
- **`getArmyTree()`** — calls `getAllArmiesFlat()` and assembles into a nested `ArmyNode[]` tree in JS (group by parent_id, recurse from roots)

### Affected Files

| File | Changes |
|------|---------|
| `supabase/migrations/20260520000000_add_armies_table.sql` | New migration — armies table, indexes, RLS policies |
| `src/modules/armies/types/army.ts` | New — `Army` type |
| `src/modules/armies/types/army-node.ts` | New — `ArmyNode` type (Army + children) |
| `src/modules/armies/services/army-service.ts` | New — army service with read functions |

### Risks & Considerations

- Confirm that the admin RLS policy SQL matches the exact column and table names used in the existing hues or brands policies — inconsistencies will cause silent access failures.
- `ON DELETE RESTRICT` on `parent_id` means the admin UI must warn and block deletion of any army that has children. Implement this check in the delete action (Feature 01) before attempting the DB delete.
- `sort_order` is nullable; ordering uses `NULLS LAST` so unordered armies always fall after explicitly ordered ones.
- The `getArmyTree()` JS assembly approach avoids a recursive SQL CTE, keeping the query simple. For very large army lists (hundreds of nodes) this is still acceptable — the data set is admin-maintained and bounded.
