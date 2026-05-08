-- ============================================================
-- Painting Recipes: schema foundation
--
-- Creates six tables (recipes, recipe_sections, recipe_steps,
-- recipe_step_paints, recipe_notes, recipe_photos), supporting
-- indexes, RLS policies (with a SECURITY DEFINER ownership
-- helper for nested children), the replace_recipe_step_paints
-- RPC, and the recipe-photos Storage bucket and policies.
--
-- Reuses public.set_updated_at() (defined in the palettes
-- migration) for the recipes updated_at trigger.
--
-- The cover_photo_id FK on recipes is added at the end of the
-- migration to break the circular dependency between recipes
-- and recipe_photos. palette_slot_id on recipe_step_paints is a
-- plain uuid (no FK) because palette_paints.slot_id does not
-- exist in the current schema; if Epic 11 lands a slot_id
-- column later, a follow-up migration can add the FK.
-- ============================================================

-- ============================================================
-- Table: recipes
-- ============================================================

CREATE TABLE public.recipes (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  palette_id     uuid        REFERENCES public.palettes (id) ON DELETE SET NULL,
  title          text        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  summary        text        CHECK (summary IS NULL OR char_length(summary) <= 5000),
  cover_photo_id uuid,
  is_public      boolean     NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Table: recipe_sections
-- ============================================================

CREATE TABLE public.recipe_sections (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.recipes (id) ON DELETE CASCADE,
  position  int  NOT NULL CHECK (position >= 0),
  title     text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  UNIQUE (recipe_id, position)
);

-- ============================================================
-- Table: recipe_steps
-- ============================================================

CREATE TABLE public.recipe_steps (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id   uuid NOT NULL REFERENCES public.recipe_sections (id) ON DELETE CASCADE,
  position     int  NOT NULL CHECK (position >= 0),
  title        text CHECK (title IS NULL OR char_length(title) <= 120),
  technique    text CHECK (technique IS NULL OR char_length(technique) <= 120),
  instructions text CHECK (instructions IS NULL OR char_length(instructions) <= 5000),
  UNIQUE (section_id, position)
);

-- ============================================================
-- Table: recipe_step_paints
--
-- palette_slot_id is a plain uuid (no FK) by design: the
-- palette_paints table does not currently expose a slot_id
-- column. The denormalized paint_id remains the source of
-- truth for rendering, so a missing palette slot does not
-- break the step view.
-- ============================================================

CREATE TABLE public.recipe_step_paints (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id         uuid NOT NULL REFERENCES public.recipe_steps (id) ON DELETE CASCADE,
  position        int  NOT NULL CHECK (position >= 0),
  paint_id        uuid NOT NULL REFERENCES public.paints (id) ON DELETE CASCADE,
  palette_slot_id uuid,
  ratio           text CHECK (ratio IS NULL OR char_length(ratio) <= 200),
  note            text CHECK (note IS NULL OR char_length(note) <= 500),
  UNIQUE (step_id, position)
);

-- ============================================================
-- Table: recipe_notes
--
-- XOR check: a note attaches to either a recipe or a step,
-- never both and never neither.
-- ============================================================

CREATE TABLE public.recipe_notes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id  uuid        REFERENCES public.recipes (id) ON DELETE CASCADE,
  step_id    uuid        REFERENCES public.recipe_steps (id) ON DELETE CASCADE,
  position   int         NOT NULL CHECK (position >= 0),
  body       text        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((recipe_id IS NOT NULL) <> (step_id IS NOT NULL))
);

-- ============================================================
-- Table: recipe_photos
--
-- Same XOR parent constraint as recipe_notes.
-- ============================================================

CREATE TABLE public.recipe_photos (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id    uuid        REFERENCES public.recipes (id) ON DELETE CASCADE,
  step_id      uuid        REFERENCES public.recipe_steps (id) ON DELETE CASCADE,
  position     int         NOT NULL CHECK (position >= 0),
  storage_path text        NOT NULL CHECK (char_length(storage_path) BETWEEN 1 AND 500),
  width_px     int         CHECK (width_px IS NULL OR width_px > 0),
  height_px    int         CHECK (height_px IS NULL OR height_px > 0),
  caption      text        CHECK (caption IS NULL OR char_length(caption) <= 200),
  created_at   timestamptz NOT NULL DEFAULT now(),
  CHECK ((recipe_id IS NOT NULL) <> (step_id IS NOT NULL))
);

-- ============================================================
-- Resolve circular FK: recipes.cover_photo_id -> recipe_photos
-- ============================================================

ALTER TABLE public.recipes
  ADD CONSTRAINT recipes_cover_photo_id_fkey
  FOREIGN KEY (cover_photo_id)
  REFERENCES public.recipe_photos (id)
  ON DELETE SET NULL;

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX idx_recipes_user_id          ON public.recipes (user_id);
CREATE INDEX idx_recipes_public_updated   ON public.recipes (is_public, updated_at DESC) WHERE is_public = true;
CREATE INDEX idx_recipe_sections_recipe   ON public.recipe_sections (recipe_id);
CREATE INDEX idx_recipe_steps_section     ON public.recipe_steps (section_id);
CREATE INDEX idx_recipe_step_paints_step  ON public.recipe_step_paints (step_id);
CREATE INDEX idx_recipe_step_paints_paint ON public.recipe_step_paints (paint_id);
CREATE INDEX idx_recipe_notes_recipe      ON public.recipe_notes (recipe_id) WHERE recipe_id IS NOT NULL;
CREATE INDEX idx_recipe_notes_step        ON public.recipe_notes (step_id)   WHERE step_id   IS NOT NULL;
CREATE INDEX idx_recipe_photos_recipe     ON public.recipe_photos (recipe_id) WHERE recipe_id IS NOT NULL;
CREATE INDEX idx_recipe_photos_step       ON public.recipe_photos (step_id)   WHERE step_id   IS NOT NULL;

-- ============================================================
-- updated_at trigger for recipes
-- ============================================================

CREATE TRIGGER set_recipes_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Ownership helper for nested children
--
-- recipe_step_paints lives two parents away from recipes
-- (step -> section -> recipe). Inlining that join in every
-- policy clause is noisy; this SECURITY DEFINER helper wraps
-- it once. The function returns true when the caller owns the
-- recipe that ultimately contains the given step.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_recipe_owner_via_step(p_step_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.recipe_steps st
    JOIN public.recipe_sections sec ON sec.id = st.section_id
    JOIN public.recipes r           ON r.id   = sec.recipe_id
    WHERE st.id = p_step_id
      AND r.user_id = auth.uid()
  );
$$;

-- Matching readability helper: visibility (owner OR public) via step
CREATE OR REPLACE FUNCTION public.is_recipe_visible_via_step(p_step_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.recipe_steps st
    JOIN public.recipe_sections sec ON sec.id = st.section_id
    JOIN public.recipes r           ON r.id   = sec.recipe_id
    WHERE st.id = p_step_id
      AND (r.user_id = auth.uid() OR r.is_public = true)
  );
$$;

-- ============================================================
-- Row Level Security: recipes
-- ============================================================

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their recipes"
  ON public.recipes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view public recipes"
  ON public.recipes
  FOR SELECT
  TO anon, authenticated
  USING (is_public = true);

CREATE POLICY "Users can create their recipes"
  ON public.recipes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update their recipes"
  ON public.recipes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can delete their recipes"
  ON public.recipes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- Row Level Security: recipe_sections
-- Ownership flows from the parent recipes row.
-- ============================================================

ALTER TABLE public.recipe_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view recipe sections they can access"
  ON public.recipe_sections
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.recipes r
      WHERE r.id = recipe_sections.recipe_id
        AND (r.user_id = auth.uid() OR r.is_public = true)
    )
  );

CREATE POLICY "Owners can add recipe sections"
  ON public.recipe_sections
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recipes r
      WHERE r.id = recipe_sections.recipe_id
        AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update recipe sections"
  ON public.recipe_sections
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.recipes r
      WHERE r.id = recipe_sections.recipe_id
        AND r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recipes r
      WHERE r.id = recipe_sections.recipe_id
        AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can delete recipe sections"
  ON public.recipe_sections
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.recipes r
      WHERE r.id = recipe_sections.recipe_id
        AND r.user_id = auth.uid()
    )
  );

-- ============================================================
-- Row Level Security: recipe_steps
-- Ownership flows section -> recipe.
-- ============================================================

ALTER TABLE public.recipe_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view recipe steps they can access"
  ON public.recipe_steps
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.recipe_sections sec
      JOIN public.recipes r ON r.id = sec.recipe_id
      WHERE sec.id = recipe_steps.section_id
        AND (r.user_id = auth.uid() OR r.is_public = true)
    )
  );

CREATE POLICY "Owners can add recipe steps"
  ON public.recipe_steps
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.recipe_sections sec
      JOIN public.recipes r ON r.id = sec.recipe_id
      WHERE sec.id = recipe_steps.section_id
        AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update recipe steps"
  ON public.recipe_steps
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.recipe_sections sec
      JOIN public.recipes r ON r.id = sec.recipe_id
      WHERE sec.id = recipe_steps.section_id
        AND r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.recipe_sections sec
      JOIN public.recipes r ON r.id = sec.recipe_id
      WHERE sec.id = recipe_steps.section_id
        AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can delete recipe steps"
  ON public.recipe_steps
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.recipe_sections sec
      JOIN public.recipes r ON r.id = sec.recipe_id
      WHERE sec.id = recipe_steps.section_id
        AND r.user_id = auth.uid()
    )
  );

-- ============================================================
-- Row Level Security: recipe_step_paints
-- Two parents up; uses the helper functions for clarity.
-- ============================================================

ALTER TABLE public.recipe_step_paints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view recipe step paints they can access"
  ON public.recipe_step_paints
  FOR SELECT
  TO anon, authenticated
  USING (public.is_recipe_visible_via_step(step_id));

CREATE POLICY "Owners can add recipe step paints"
  ON public.recipe_step_paints
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_recipe_owner_via_step(step_id));

CREATE POLICY "Owners can update recipe step paints"
  ON public.recipe_step_paints
  FOR UPDATE
  TO authenticated
  USING (public.is_recipe_owner_via_step(step_id))
  WITH CHECK (public.is_recipe_owner_via_step(step_id));

CREATE POLICY "Owners can delete recipe step paints"
  ON public.recipe_step_paints
  FOR DELETE
  TO authenticated
  USING (public.is_recipe_owner_via_step(step_id));

-- ============================================================
-- Row Level Security: recipe_notes
-- Parent is either recipe_id or step_id (XOR).
-- ============================================================

ALTER TABLE public.recipe_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view recipe notes they can access"
  ON public.recipe_notes
  FOR SELECT
  TO anon, authenticated
  USING (
    (
      recipe_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.recipes r
        WHERE r.id = recipe_notes.recipe_id
          AND (r.user_id = auth.uid() OR r.is_public = true)
      )
    )
    OR (
      step_id IS NOT NULL
      AND public.is_recipe_visible_via_step(step_id)
    )
  );

CREATE POLICY "Owners can add recipe notes"
  ON public.recipe_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      recipe_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.recipes r
        WHERE r.id = recipe_notes.recipe_id
          AND r.user_id = auth.uid()
      )
    )
    OR (
      step_id IS NOT NULL
      AND public.is_recipe_owner_via_step(step_id)
    )
  );

CREATE POLICY "Owners can update recipe notes"
  ON public.recipe_notes
  FOR UPDATE
  TO authenticated
  USING (
    (
      recipe_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.recipes r
        WHERE r.id = recipe_notes.recipe_id
          AND r.user_id = auth.uid()
      )
    )
    OR (
      step_id IS NOT NULL
      AND public.is_recipe_owner_via_step(step_id)
    )
  )
  WITH CHECK (
    (
      recipe_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.recipes r
        WHERE r.id = recipe_notes.recipe_id
          AND r.user_id = auth.uid()
      )
    )
    OR (
      step_id IS NOT NULL
      AND public.is_recipe_owner_via_step(step_id)
    )
  );

CREATE POLICY "Owners can delete recipe notes"
  ON public.recipe_notes
  FOR DELETE
  TO authenticated
  USING (
    (
      recipe_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.recipes r
        WHERE r.id = recipe_notes.recipe_id
          AND r.user_id = auth.uid()
      )
    )
    OR (
      step_id IS NOT NULL
      AND public.is_recipe_owner_via_step(step_id)
    )
  );

-- ============================================================
-- Row Level Security: recipe_photos
-- Same parent XOR shape as recipe_notes.
-- ============================================================

ALTER TABLE public.recipe_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view recipe photos they can access"
  ON public.recipe_photos
  FOR SELECT
  TO anon, authenticated
  USING (
    (
      recipe_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.recipes r
        WHERE r.id = recipe_photos.recipe_id
          AND (r.user_id = auth.uid() OR r.is_public = true)
      )
    )
    OR (
      step_id IS NOT NULL
      AND public.is_recipe_visible_via_step(step_id)
    )
  );

CREATE POLICY "Owners can add recipe photos"
  ON public.recipe_photos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      recipe_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.recipes r
        WHERE r.id = recipe_photos.recipe_id
          AND r.user_id = auth.uid()
      )
    )
    OR (
      step_id IS NOT NULL
      AND public.is_recipe_owner_via_step(step_id)
    )
  );

CREATE POLICY "Owners can update recipe photos"
  ON public.recipe_photos
  FOR UPDATE
  TO authenticated
  USING (
    (
      recipe_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.recipes r
        WHERE r.id = recipe_photos.recipe_id
          AND r.user_id = auth.uid()
      )
    )
    OR (
      step_id IS NOT NULL
      AND public.is_recipe_owner_via_step(step_id)
    )
  )
  WITH CHECK (
    (
      recipe_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.recipes r
        WHERE r.id = recipe_photos.recipe_id
          AND r.user_id = auth.uid()
      )
    )
    OR (
      step_id IS NOT NULL
      AND public.is_recipe_owner_via_step(step_id)
    )
  );

CREATE POLICY "Owners can delete recipe photos"
  ON public.recipe_photos
  FOR DELETE
  TO authenticated
  USING (
    (
      recipe_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.recipes r
        WHERE r.id = recipe_photos.recipe_id
          AND r.user_id = auth.uid()
      )
    )
    OR (
      step_id IS NOT NULL
      AND public.is_recipe_owner_via_step(step_id)
    )
  );

-- ============================================================
-- RPC: replace_recipe_step_paints
--
-- Atomically replaces all rows for a step. Mirrors
-- replace_palette_paints exactly: SECURITY INVOKER, ownership
-- check, delete + reinsert in one transaction.
--
-- Input row format:
--   { "position": 0,
--     "paint_id": "<uuid>",
--     "palette_slot_id": "<uuid?>",
--     "ratio": "<text?>",
--     "note": "<text?>" }
-- ============================================================

CREATE OR REPLACE FUNCTION public.replace_recipe_step_paints(
  p_step_id uuid,
  p_rows    jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_row jsonb;
BEGIN
  IF NOT public.is_recipe_owner_via_step(p_step_id) THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.recipe_step_paints WHERE step_id = p_step_id;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    INSERT INTO public.recipe_step_paints (
      step_id,
      position,
      paint_id,
      palette_slot_id,
      ratio,
      note
    )
    VALUES (
      p_step_id,
      (v_row->>'position')::int,
      (v_row->>'paint_id')::uuid,
      NULLIF(v_row->>'palette_slot_id', '')::uuid,
      v_row->>'ratio',
      v_row->>'note'
    );
  END LOOP;
END;
$$;

-- ============================================================
-- Storage bucket: recipe-photos
--
-- Bucket is "public" so getPublicUrl() yields a usable URL,
-- but per-object access is still gated by the SELECT policy
-- below: an object is only readable when it corresponds to a
-- recipe_photos row whose parent recipe is visible to the
-- caller (owner or is_public). Writes require the path's
-- first segment to equal the caller's auth.uid() AND the
-- corresponding recipe_photos row's parent recipe to be owned
-- by the caller. Object path convention:
--   {user_id}/{recipe_id}/{photo_id}.{ext}
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-photos', 'recipe-photos', true)
ON CONFLICT (id) DO NOTHING;

-- SELECT: visible when the linked recipe_photos row's parent
-- recipe is owned by the caller or is public.
CREATE POLICY "Recipe photo objects are readable when parent is visible"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id = 'recipe-photos'
    AND EXISTS (
      SELECT 1
      FROM public.recipe_photos ph
      LEFT JOIN public.recipes  r_direct ON r_direct.id = ph.recipe_id
      LEFT JOIN public.recipe_steps    st  ON st.id  = ph.step_id
      LEFT JOIN public.recipe_sections sec ON sec.id = st.section_id
      LEFT JOIN public.recipes  r_via_step ON r_via_step.id = sec.recipe_id
      WHERE ph.storage_path = storage.objects.name
        AND (
          (r_direct.id   IS NOT NULL AND (r_direct.user_id   = auth.uid() OR r_direct.is_public   = true))
          OR
          (r_via_step.id IS NOT NULL AND (r_via_step.user_id = auth.uid() OR r_via_step.is_public = true))
        )
    )
  );

-- INSERT: caller may upload only under their own user_id prefix
-- and only for recipes they own. We enforce the prefix at write
-- time; the matching recipe_photos row gets created by the
-- application layer immediately after the upload.
CREATE POLICY "Owners can upload recipe photo objects"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'recipe-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- UPDATE: caller may only update objects under their own prefix.
CREATE POLICY "Owners can update their recipe photo objects"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'recipe-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'recipe-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- DELETE: caller may only delete objects under their own prefix.
CREATE POLICY "Owners can delete their recipe photo objects"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'recipe-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
