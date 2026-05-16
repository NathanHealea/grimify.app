-- ============================================================
-- Fix reorder RPCs: use MAX(position)+1 as Phase 1 shift offset.
--
-- The previous COUNT(*)-based offset is incorrect when positions have
-- gaps (e.g. after a paint is deleted). With gaps, count < max_position,
-- so position+count can equal an existing position of an as-yet-unupdated
-- row. PostgreSQL checks non-deferrable UNIQUE constraints immediately
-- after each row update within an UPDATE statement, causing a violation.
--
-- MAX(position)+1 guarantees all parked positions are strictly above
-- every original position regardless of row-update order.
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
  v_max int;
  v_id  uuid;
  v_idx int := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.palettes
    WHERE id = p_palette_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = '42501';
  END IF;

  -- Phase 1: park all positions above the current maximum.
  -- COALESCE(-1) handles an empty table: shift = 0, which is a no-op.
  SELECT COALESCE(MAX(position), -1) INTO v_max
  FROM public.palette_paints
  WHERE palette_id = p_palette_id;

  UPDATE public.palette_paints
  SET position = position + v_max + 1
  WHERE palette_id = p_palette_id;

  -- Phase 2: assign final 0-based positions in the requested order.
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
  v_max int;
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

  -- Phase 1: park all positions above the current maximum.
  SELECT COALESCE(MAX(position), -1) INTO v_max
  FROM public.palette_group_paints
  WHERE group_id = p_group_id;

  UPDATE public.palette_group_paints
  SET position = position + v_max + 1
  WHERE group_id = p_group_id;

  -- Phase 2: assign final 0-based positions in the requested order.
  FOREACH v_id IN ARRAY p_palette_paint_ids
  LOOP
    UPDATE public.palette_group_paints
    SET position = v_idx
    WHERE group_id = p_group_id AND palette_paint_id = v_id;
    v_idx := v_idx + 1;
  END LOOP;
END;
$$;
