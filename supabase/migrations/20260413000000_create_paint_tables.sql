-- ============================================================
-- Create paint data tables: brands, product_lines, paints, paint_references
-- ============================================================

-- ============================================================
-- brands: miniature paint manufacturers
-- ============================================================
CREATE TABLE public.brands (
  id serial PRIMARY KEY,
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  website_url text,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- product_lines: paint ranges within a brand (e.g., Citadel Base, Vallejo Game Color)
-- ============================================================
CREATE TABLE public.product_lines (
  id serial PRIMARY KEY,
  brand_id int NOT NULL REFERENCES public.brands (id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_id, slug)
);

-- ============================================================
-- paints: individual paint colors with computed color data
-- ============================================================
CREATE TABLE public.paints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_paint_id text NOT NULL,
  product_line_id int NOT NULL REFERENCES public.product_lines (id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  hex text NOT NULL,
  r int NOT NULL,
  g int NOT NULL,
  b int NOT NULL,
  hue float NOT NULL,
  saturation float NOT NULL,
  lightness float NOT NULL,
  is_metallic boolean NOT NULL DEFAULT false,
  is_discontinued boolean NOT NULL DEFAULT false,
  paint_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_line_id, slug)
);

-- ============================================================
-- paint_references: directional relationships between paints
-- ============================================================
CREATE TABLE public.paint_references (
  id serial PRIMARY KEY,
  paint_id uuid NOT NULL REFERENCES public.paints (id) ON DELETE CASCADE,
  related_paint_id uuid NOT NULL REFERENCES public.paints (id) ON DELETE CASCADE,
  relationship text NOT NULL,
  similarity_score float,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (paint_id, related_paint_id, relationship),
  CHECK (paint_id != related_paint_id),
  CHECK (similarity_score IS NULL OR (similarity_score >= 0 AND similarity_score <= 100))
);

-- ============================================================
-- Indexes
-- ============================================================

-- product_lines: FK lookup by brand
CREATE INDEX idx_product_lines_brand_id ON public.product_lines (brand_id);

-- paints: FK lookup by product line
CREATE INDEX idx_paints_product_line_id ON public.paints (product_line_id);

-- paints: lookup by brand-specific paint identifier
CREATE INDEX idx_paints_brand_paint_id ON public.paints (brand_paint_id);

-- paints: color search by exact hex
CREATE INDEX idx_paints_hex ON public.paints (hex);

-- paints: color wheel angle queries
CREATE INDEX idx_paints_hue ON public.paints (hue);

-- paints: filter by paint type
CREATE INDEX idx_paints_paint_type ON public.paints (paint_type);

-- paints: filter metallic paints
CREATE INDEX idx_paints_is_metallic ON public.paints (is_metallic) WHERE is_metallic = true;

-- paints: filter discontinued paints
CREATE INDEX idx_paints_is_discontinued ON public.paints (is_discontinued) WHERE is_discontinued = true;

-- paint_references: lookup references for a given paint
CREATE INDEX idx_paint_references_paint_id ON public.paint_references (paint_id);

-- paint_references: reverse lookup
CREATE INDEX idx_paint_references_related_paint_id ON public.paint_references (related_paint_id);

-- paint_references: filter by relationship type
CREATE INDEX idx_paint_references_relationship ON public.paint_references (relationship);

-- ============================================================
-- Row Level Security: brands
-- ============================================================
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

-- SELECT: Public read access (anon + authenticated)
CREATE POLICY "Anyone can view brands"
  ON public.brands
  FOR SELECT
  USING (true);

-- INSERT: Admin only
CREATE POLICY "Admins can insert brands"
  ON public.brands
  FOR INSERT
  TO authenticated
  WITH CHECK ('admin' = ANY(public.get_user_roles(auth.uid())));

-- UPDATE: Admin only
CREATE POLICY "Admins can update brands"
  ON public.brands
  FOR UPDATE
  TO authenticated
  USING ('admin' = ANY(public.get_user_roles(auth.uid())))
  WITH CHECK ('admin' = ANY(public.get_user_roles(auth.uid())));

-- DELETE: Admin only
CREATE POLICY "Admins can delete brands"
  ON public.brands
  FOR DELETE
  TO authenticated
  USING ('admin' = ANY(public.get_user_roles(auth.uid())));

-- ============================================================
-- Row Level Security: product_lines
-- ============================================================
ALTER TABLE public.product_lines ENABLE ROW LEVEL SECURITY;

-- SELECT: Public read access (anon + authenticated)
CREATE POLICY "Anyone can view product lines"
  ON public.product_lines
  FOR SELECT
  USING (true);

-- INSERT: Admin only
CREATE POLICY "Admins can insert product lines"
  ON public.product_lines
  FOR INSERT
  TO authenticated
  WITH CHECK ('admin' = ANY(public.get_user_roles(auth.uid())));

-- UPDATE: Admin only
CREATE POLICY "Admins can update product lines"
  ON public.product_lines
  FOR UPDATE
  TO authenticated
  USING ('admin' = ANY(public.get_user_roles(auth.uid())))
  WITH CHECK ('admin' = ANY(public.get_user_roles(auth.uid())));

-- DELETE: Admin only
CREATE POLICY "Admins can delete product lines"
  ON public.product_lines
  FOR DELETE
  TO authenticated
  USING ('admin' = ANY(public.get_user_roles(auth.uid())));

-- ============================================================
-- Row Level Security: paints
-- ============================================================
ALTER TABLE public.paints ENABLE ROW LEVEL SECURITY;

-- SELECT: Public read access (anon + authenticated)
CREATE POLICY "Anyone can view paints"
  ON public.paints
  FOR SELECT
  USING (true);

-- INSERT: Admin only
CREATE POLICY "Admins can insert paints"
  ON public.paints
  FOR INSERT
  TO authenticated
  WITH CHECK ('admin' = ANY(public.get_user_roles(auth.uid())));

-- UPDATE: Admin only
CREATE POLICY "Admins can update paints"
  ON public.paints
  FOR UPDATE
  TO authenticated
  USING ('admin' = ANY(public.get_user_roles(auth.uid())))
  WITH CHECK ('admin' = ANY(public.get_user_roles(auth.uid())));

-- DELETE: Admin only
CREATE POLICY "Admins can delete paints"
  ON public.paints
  FOR DELETE
  TO authenticated
  USING ('admin' = ANY(public.get_user_roles(auth.uid())));

-- ============================================================
-- Row Level Security: paint_references
-- ============================================================
ALTER TABLE public.paint_references ENABLE ROW LEVEL SECURITY;

-- SELECT: Public read access (anon + authenticated)
CREATE POLICY "Anyone can view paint references"
  ON public.paint_references
  FOR SELECT
  USING (true);

-- INSERT: Admin only
CREATE POLICY "Admins can insert paint references"
  ON public.paint_references
  FOR INSERT
  TO authenticated
  WITH CHECK ('admin' = ANY(public.get_user_roles(auth.uid())));

-- UPDATE: Admin only
CREATE POLICY "Admins can update paint references"
  ON public.paint_references
  FOR UPDATE
  TO authenticated
  USING ('admin' = ANY(public.get_user_roles(auth.uid())))
  WITH CHECK ('admin' = ANY(public.get_user_roles(auth.uid())));

-- DELETE: Admin only
CREATE POLICY "Admins can delete paint references"
  ON public.paint_references
  FOR DELETE
  TO authenticated
  USING ('admin' = ANY(public.get_user_roles(auth.uid())));
