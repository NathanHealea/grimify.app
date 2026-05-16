-- ============================================================
-- Split palette_paints into master list + palette_group_paints
--
-- Motivation: the legacy group_id column on palette_paints collapses
-- "is this paint in the palette" and "which group does it belong to"
-- into one row, making it impossible to add the same paint to multiple
-- groups. This migration splits the model:
--   - palette_paints becomes a unique master list (UNIQUE palette_id, paint_id)
--   - palette_group_paints is a new join table for memberships
-- ============================================================

-- ============================================================
-- 1. Add stable uuid primary key to palette_paints.
--    (The old PK is (palette_id, position); we keep position as UNIQUE.)
-- ============================================================
ALTER TABLE public.palette_paints
  ADD COLUMN id uuid NOT NULL DEFAULT gen_random_uuid();

-- ============================================================
-- 2. De-duplicate any pre-existing (palette_id, paint_id) rows.
--    Collapses duplicates onto the row with the lowest position;
--    later rows are deleted so the UNIQUE constraint can be added.
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
--    add UNIQUE (palette_id, paint_id).
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
-- 5. Create the palette_group_paints join table.
-- ============================================================
CREATE TABLE public.palette_group_paints (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id         uuid        NOT NULL REFERENCES public.palette_groups (id)  ON DELETE CASCADE,
  palette_paint_id uuid        NOT NULL REFERENCES public.palette_paints (id)  ON DELETE CASCADE,
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
  (row_number() OVER (PARTITION BY pp.group_id ORDER BY pp.position) - 1)::int
FROM public.palette_paints pp
WHERE pp.group_id IS NOT NULL;

-- ============================================================
-- 7. Drop the legacy group_id column from palette_paints.
-- ============================================================
DROP INDEX IF EXISTS idx_palette_paints_group_id;
ALTER TABLE public.palette_paints DROP COLUMN group_id;

-- ============================================================
-- Row Level Security: palette_group_paints
-- Ownership is derived from the parent palette via palette_groups.
-- ============================================================
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

-- ============================================================
-- 8. New id-based reorder RPC for master list.
--    Uses negative-offset trick to avoid firing the deferred
--    UNIQUE (palette_id, position) constraint mid-update.
-- ============================================================
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

  -- Phase 1: park positions outside the valid range
  UPDATE public.palette_paints
  SET position = -position - 1
  WHERE palette_id = p_palette_id;

  -- Phase 2: assign final positions
  FOREACH v_id IN ARRAY p_palette_paint_ids
  LOOP
    UPDATE public.palette_paints
    SET position = v_idx
    WHERE id = v_id AND palette_id = p_palette_id;
    v_idx := v_idx + 1;
  END LOOP;
END;
$$;

-- ============================================================
-- 9. New id-based reorder RPC for group memberships.
-- ============================================================
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

  -- Phase 1: park positions outside the valid range
  UPDATE public.palette_group_paints
  SET position = -position - 1
  WHERE group_id = p_group_id;

  -- Phase 2: assign final positions
  FOREACH v_id IN ARRAY p_palette_paint_ids
  LOOP
    UPDATE public.palette_group_paints
    SET position = v_idx
    WHERE group_id = p_group_id AND palette_paint_id = v_id;
    v_idx := v_idx + 1;
  END LOOP;
END;
$$;

-- ============================================================
-- 10. Drop the legacy replace_palette_paints RPC.
--     Replaced by reorder_palette_paints_v2 above.
-- ============================================================
DROP FUNCTION IF EXISTS public.replace_palette_paints(uuid, jsonb);
