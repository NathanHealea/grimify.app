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
