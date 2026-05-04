-- ============================================================
-- Reusable trigger function: set_updated_at
-- Sets NEW.updated_at to now() before any UPDATE, so callers
-- never have to pass the timestamp themselves.
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- Create palettes: user-owned ordered lists of paints
-- ============================================================

CREATE TABLE public.palettes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  name        text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  description text        CHECK (description IS NULL OR char_length(description) <= 1000),
  is_public   boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Create palette_paints: ordered join rows for palettes
-- ============================================================

CREATE TABLE public.palette_paints (
  palette_id uuid        NOT NULL REFERENCES public.palettes (id) ON DELETE CASCADE,
  position   int         NOT NULL CHECK (position >= 0),
  paint_id   uuid        NOT NULL REFERENCES public.paints (id) ON DELETE CASCADE,
  note       text        CHECK (note IS NULL OR char_length(note) <= 500),
  added_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (palette_id, position)
);

-- ============================================================
-- Indexes
-- ============================================================

-- user_id: scope "my palettes" queries to the owner
CREATE INDEX idx_palettes_user_id ON public.palettes (user_id);

-- is_public partial: cheap filter for the public browse list
CREATE INDEX idx_palettes_public ON public.palettes (is_public) WHERE is_public = true;

-- paint_id: reverse lookup ("palettes that use this paint")
CREATE INDEX idx_palette_paints_paint_id ON public.palette_paints (paint_id);

-- ============================================================
-- updated_at trigger for palettes
-- ============================================================

CREATE TRIGGER set_palettes_updated_at
  BEFORE UPDATE ON public.palettes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Row Level Security: palettes
-- ============================================================

ALTER TABLE public.palettes ENABLE ROW LEVEL SECURITY;

-- SELECT: owners can read their own palettes
CREATE POLICY "Owners can view their palettes"
  ON public.palettes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- SELECT (anon + authenticated): anyone can read public palettes
CREATE POLICY "Anyone can view public palettes"
  ON public.palettes
  FOR SELECT
  TO anon, authenticated
  USING (is_public = true);

-- INSERT: authenticated users may only create palettes for themselves
CREATE POLICY "Users can create their palettes"
  ON public.palettes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: owners only
CREATE POLICY "Owners can update their palettes"
  ON public.palettes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: owners only
CREATE POLICY "Owners can delete their palettes"
  ON public.palettes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- Row Level Security: palette_paints
-- Ownership is derived from the parent palettes row.
-- ============================================================

ALTER TABLE public.palette_paints ENABLE ROW LEVEL SECURITY;

-- SELECT: visible when the parent palette is visible (owner or public)
CREATE POLICY "Users can view palette paints they can access"
  ON public.palette_paints
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.palettes p
      WHERE p.id = palette_paints.palette_id
        AND (p.user_id = auth.uid() OR p.is_public = true)
    )
  );

-- INSERT: allowed only when the caller owns the parent palette
CREATE POLICY "Owners can add paints to their palettes"
  ON public.palette_paints
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.palettes p
      WHERE p.id = palette_paints.palette_id
        AND p.user_id = auth.uid()
    )
  );

-- UPDATE: allowed only when the caller owns the parent palette
CREATE POLICY "Owners can update paints in their palettes"
  ON public.palette_paints
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.palettes p
      WHERE p.id = palette_paints.palette_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.palettes p
      WHERE p.id = palette_paints.palette_id
        AND p.user_id = auth.uid()
    )
  );

-- DELETE: allowed only when the caller owns the parent palette
CREATE POLICY "Owners can remove paints from their palettes"
  ON public.palette_paints
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.palettes p
      WHERE p.id = palette_paints.palette_id
        AND p.user_id = auth.uid()
    )
  );

-- ============================================================
-- RPC: replace_palette_paints
-- Atomically replaces all palette_paints rows for a given
-- palette. Runs delete + insert in a single transaction so
-- positions never enter a gap state.
--
-- Ownership is enforced: the caller must own the palette.
-- Input rows format: [{"position": 0, "paint_id": "<uuid>", "note": null}, ...]
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
  -- Verify the calling user owns this palette
  IF NOT EXISTS (
    SELECT 1 FROM public.palettes
    WHERE id = p_palette_id
      AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = '42501';
  END IF;

  -- Remove all existing rows for the palette
  DELETE FROM public.palette_paints WHERE palette_id = p_palette_id;

  -- Insert the new rows
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    INSERT INTO public.palette_paints (palette_id, position, paint_id, note)
    VALUES (
      p_palette_id,
      (v_row->>'position')::int,
      (v_row->>'paint_id')::uuid,
      v_row->>'note'
    );
  END LOOP;
END;
$$;
