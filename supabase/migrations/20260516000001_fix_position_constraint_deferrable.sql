-- ============================================================
-- Fix: remove DEFERRABLE from position unique constraints and
-- replace the negative-offset reorder trick with a count-based
-- positive offset that satisfies CHECK (position >= 0).
--
-- The prior migration made UNIQUE (palette_id, position) and
-- UNIQUE (group_id, position) deferrable so that the RPCs could
-- use a negative-offset trick to temporarily park positions.
-- Two problems emerged:
--   1. Any ON CONFLICT clause referencing a deferrable unique
--      constraint as the arbiter fails at parse time (SQLSTATE
--      55000), which broke upsert paths.
--   2. The negative-offset park violated the existing
--      CHECK (position >= 0) constraint on both tables.
--
-- Fix: make both constraints non-deferrable; rewrite both RPCs
-- to shift positions up by the current row count (always
-- positive) rather than down to negative values.
-- ============================================================

-- ============================================================
-- 1. Replace palette_paints position constraint (non-deferrable)
-- ============================================================
ALTER TABLE public.palette_paints
  DROP CONSTRAINT palette_paints_palette_position_key;

ALTER TABLE public.palette_paints
  ADD CONSTRAINT palette_paints_palette_position_key UNIQUE (palette_id, position);

-- ============================================================
-- 2. Replace palette_group_paints position constraint (non-deferrable)
-- ============================================================
ALTER TABLE public.palette_group_paints
  DROP CONSTRAINT palette_group_paints_unique_position;

ALTER TABLE public.palette_group_paints
  ADD CONSTRAINT palette_group_paints_unique_position UNIQUE (group_id, position);

-- ============================================================
-- 3. Rewrite reorder_palette_paints_v2 — count-based offset
--
-- Phase 1 shifts all positions up by the current row count,
-- vacating the target range [0, count-1].  Since original
-- positions are in [0, count-1] and parked positions are in
-- [count, 2*count-1], the two ranges never overlap so no
-- UNIQUE violation can occur row-by-row.
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
  v_count int;
  v_id    uuid;
  v_idx   int := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.palettes
    WHERE id = p_palette_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = '42501';
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.palette_paints
  WHERE palette_id = p_palette_id;

  -- Phase 1: shift positions into [count, 2*count-1] to vacate [0, count-1]
  UPDATE public.palette_paints
  SET position = position + v_count
  WHERE palette_id = p_palette_id;

  -- Phase 2: assign final positions in supplied order
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
-- 4. Rewrite reorder_palette_group_paints — count-based offset
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
  v_count int;
  v_id    uuid;
  v_idx   int := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.palette_groups g
    JOIN   public.palettes        p ON p.id = g.palette_id
    WHERE  g.id = p_group_id AND p.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = '42501';
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.palette_group_paints
  WHERE group_id = p_group_id;

  -- Phase 1: shift positions into [count, 2*count-1] to vacate [0, count-1]
  UPDATE public.palette_group_paints
  SET position = position + v_count
  WHERE group_id = p_group_id;

  -- Phase 2: assign final positions in supplied order
  FOREACH v_id IN ARRAY p_palette_paint_ids
  LOOP
    UPDATE public.palette_group_paints
    SET position = v_idx
    WHERE group_id = p_group_id AND palette_paint_id = v_id;
    v_idx := v_idx + 1;
  END LOOP;
END;
$$;
