# Purchase List — Database Schema

**Epic:** Purchase List
**Type:** Feature
**Status:** Todo
**Branch:** `feature/purchase-list-schema`
**Merge into:** `main`

## Summary

Create the `user_purchase_list` table that backs the purchase list feature. Establishes the schema, RLS policies scoped to the owning user, an `updated_at` trigger for tracking last activity, and regenerates Supabase TypeScript types.

## Acceptance Criteria

- [ ] `user_purchase_list` table exists with columns: `user_id`, `paint_id`, `added_at`, `notes`, `updated_at`
- [ ] Composite primary key on `(user_id, paint_id)` prevents duplicate entries
- [ ] Foreign keys reference `profiles.id` and `paints.id` with `ON DELETE CASCADE`
- [ ] RLS is enabled; authenticated users can read, insert, update, and delete only their own rows
- [ ] `updated_at` is maintained automatically by a trigger on row updates
- [ ] `npm run db:types` regenerates types without errors
- [ ] `npm run build` and `npm run lint` pass with no errors

## Routes

None — this feature is schema-only.

## Database

### Migration — `XXXXXX_create_user_purchase_list_table.sql`

```sql
CREATE TABLE public.user_purchase_list (
  user_id    uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  paint_id   uuid NOT NULL REFERENCES public.paints (id)   ON DELETE CASCADE,
  added_at   timestamptz NOT NULL DEFAULT now(),
  notes      text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, paint_id)
);

-- Indexes
CREATE INDEX idx_user_purchase_list_user_id  ON public.user_purchase_list (user_id);
CREATE INDEX idx_user_purchase_list_paint_id ON public.user_purchase_list (paint_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_user_purchase_list_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_user_purchase_list_updated
  BEFORE UPDATE ON public.user_purchase_list
  FOR EACH ROW EXECUTE FUNCTION public.set_user_purchase_list_updated_at();

-- RLS
ALTER TABLE public.user_purchase_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own purchase list"
  ON public.user_purchase_list FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into their own purchase list"
  ON public.user_purchase_list FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own purchase list"
  ON public.user_purchase_list FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete from their own purchase list"
  ON public.user_purchase_list FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
```

## Key Files

| Action | File | Description |
|--------|------|-------------|
| Create | `supabase/migrations/XXXXXX_create_user_purchase_list_table.sql` | Table DDL, indexes, trigger, and RLS policies |

## Implementation

### Step 1: Create the migration

Create `supabase/migrations/XXXXXX_create_user_purchase_list_table.sql` with the SQL above. Use the next sequential timestamp that is later than all existing migration files.

Apply locally:
```bash
npx supabase db reset
```
or
```bash
npx supabase migration up
```

### Step 2: Regenerate TypeScript types

```bash
npm run db:types
```

Verify the generated types include `user_purchase_list` with all five columns.

### Step 3: Build and lint

```bash
npm run build && npm run lint
```

Commit: `feat(purchase-list): add user_purchase_list table with RLS and updated_at trigger`

## Risks & Considerations

- **Dependency on `profiles` and `paints` tables.** Both must exist before this migration runs; they are established in earlier migrations.
- **`notes` column.** Nullable, reserved for future admin editing — no user-facing UI in this feature.
- **`updated_at` trigger.** Mirrors the pattern proposed in `docs/08-user-management/06-collection-management.md` for `user_paints`. If that feature has not landed, the trigger function name here is unique (`set_user_purchase_list_updated_at`) so there is no collision.
