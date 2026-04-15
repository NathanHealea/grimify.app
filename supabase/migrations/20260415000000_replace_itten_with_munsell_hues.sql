-- ============================================================
-- Replace Itten 12-hue system with Munsell 10 principal hue system
--
-- Drops the `itten_hues` table and `itten_hue_id` FK on paints,
-- then creates a new `hues` table with Munsell principal hues,
-- ISCC-NBS sub-hues, and a `slug` column for URL-friendly lookups.
-- ============================================================

-- ============================================================
-- 1. Drop itten_hue_id from paints (removes FK constraint)
-- ============================================================
DROP INDEX IF EXISTS idx_paints_itten_hue_id;
ALTER TABLE public.paints DROP COLUMN IF EXISTS itten_hue_id;

-- ============================================================
-- 2. Drop itten_hues table (cascade drops indexes and RLS policies)
-- ============================================================
DROP TABLE IF EXISTS public.itten_hues CASCADE;

-- ============================================================
-- 3. Create hues table
-- ============================================================
CREATE TABLE public.hues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES public.hues (id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  hex_code text NOT NULL,
  sort_order int,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. Unique constraints
-- ============================================================

-- Top-level slugs are globally unique
CREATE UNIQUE INDEX uq_hues_slug_top_level
  ON public.hues (slug) WHERE parent_id IS NULL;

-- Child slugs are unique within their parent
CREATE UNIQUE INDEX uq_hues_slug_within_parent
  ON public.hues (parent_id, slug) WHERE parent_id IS NOT NULL;

-- ============================================================
-- 5. Indexes
-- ============================================================
CREATE INDEX idx_hues_parent_id ON public.hues (parent_id);
CREATE INDEX idx_hues_sort_order ON public.hues (sort_order);
CREATE INDEX idx_hues_slug ON public.hues (slug);
CREATE INDEX idx_hues_hex_code ON public.hues (hex_code);

-- ============================================================
-- 6. Row Level Security
-- ============================================================
ALTER TABLE public.hues ENABLE ROW LEVEL SECURITY;

-- SELECT: Public read access (anon + authenticated)
CREATE POLICY "Anyone can view hues"
  ON public.hues
  FOR SELECT
  USING (true);

-- INSERT: Admin only
CREATE POLICY "Admins can insert hues"
  ON public.hues
  FOR INSERT
  TO authenticated
  WITH CHECK ('admin' = ANY(public.get_user_roles(auth.uid())));

-- UPDATE: Admin only
CREATE POLICY "Admins can update hues"
  ON public.hues
  FOR UPDATE
  TO authenticated
  USING ('admin' = ANY(public.get_user_roles(auth.uid())))
  WITH CHECK ('admin' = ANY(public.get_user_roles(auth.uid())));

-- DELETE: Admin only
CREATE POLICY "Admins can delete hues"
  ON public.hues
  FOR DELETE
  TO authenticated
  USING ('admin' = ANY(public.get_user_roles(auth.uid())));

-- ============================================================
-- 7. Seed 11 top-level hues (10 Munsell principal hues + Neutral)
-- ============================================================
INSERT INTO public.hues (id, name, slug, hex_code, sort_order) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Red',          'red',          '#FF0000',  1),
  ('10000000-0000-0000-0000-000000000002', 'Yellow-Red',   'yellow-red',   '#FF8C00',  2),
  ('10000000-0000-0000-0000-000000000003', 'Yellow',       'yellow',       '#FFFF00',  3),
  ('10000000-0000-0000-0000-000000000004', 'Green-Yellow', 'green-yellow', '#9ACD32',  4),
  ('10000000-0000-0000-0000-000000000005', 'Green',        'green',        '#008000',  5),
  ('10000000-0000-0000-0000-000000000006', 'Blue-Green',   'blue-green',   '#008080',  6),
  ('10000000-0000-0000-0000-000000000007', 'Blue',         'blue',         '#0000FF',  7),
  ('10000000-0000-0000-0000-000000000008', 'Purple-Blue',  'purple-blue',  '#4B0082',  8),
  ('10000000-0000-0000-0000-000000000009', 'Purple',       'purple',       '#800080',  9),
  ('10000000-0000-0000-0000-00000000000a', 'Red-Purple',   'red-purple',   '#FF00FF', 10),
  ('10000000-0000-0000-0000-00000000000b', 'Neutral',      'neutral',      '#808080', 11);

-- ============================================================
-- 8. Seed ISCC-NBS sub-hues (11 per principal hue = 110 rows)
-- ============================================================

-- Red sub-hues
INSERT INTO public.hues (parent_id, name, slug, hex_code, sort_order) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Vivid Red', 'vivid-red', '#FF0000', 1),
  ('10000000-0000-0000-0000-000000000001', 'Strong Red', 'strong-red', '#CF1717', 2),
  ('10000000-0000-0000-0000-000000000001', 'Deep Red', 'deep-red', '#8A0F0F', 3),
  ('10000000-0000-0000-0000-000000000001', 'Very Deep Red', 'very-deep-red', '#500B0B', 4),
  ('10000000-0000-0000-0000-000000000001', 'Moderate Red', 'moderate-red', '#BF4040', 5),
  ('10000000-0000-0000-0000-000000000001', 'Dark Red', 'dark-red', '#6F2A2A', 6),
  ('10000000-0000-0000-0000-000000000001', 'Very Dark Red', 'very-dark-red', '#361717', 7),
  ('10000000-0000-0000-0000-000000000001', 'Light Greyish Red', 'light-greyish-red', '#CCB3B3', 8),
  ('10000000-0000-0000-0000-000000000001', 'Greyish Red', 'greyish-red', '#996666', 9),
  ('10000000-0000-0000-0000-000000000001', 'Dark Greyish Red', 'dark-greyish-red', '#584141', 10),
  ('10000000-0000-0000-0000-000000000001', 'Blackish Red', 'blackish-red', '#221C1C', 11);

-- Yellow-Red sub-hues
INSERT INTO public.hues (parent_id, name, slug, hex_code, sort_order) VALUES
  ('10000000-0000-0000-0000-000000000002', 'Vivid Yellow-Red', 'vivid-yellow-red', '#FF8C00', 1),
  ('10000000-0000-0000-0000-000000000002', 'Strong Yellow-Red', 'strong-yellow-red', '#CF7C17', 2),
  ('10000000-0000-0000-0000-000000000002', 'Deep Yellow-Red', 'deep-yellow-red', '#8A530F', 3),
  ('10000000-0000-0000-0000-000000000002', 'Very Deep Yellow-Red', 'very-deep-yellow-red', '#50310B', 4),
  ('10000000-0000-0000-0000-000000000002', 'Moderate Yellow-Red', 'moderate-yellow-red', '#BF8640', 5),
  ('10000000-0000-0000-0000-000000000002', 'Dark Yellow-Red', 'dark-yellow-red', '#6F502A', 6),
  ('10000000-0000-0000-0000-000000000002', 'Very Dark Yellow-Red', 'very-dark-yellow-red', '#362817', 7),
  ('10000000-0000-0000-0000-000000000002', 'Light Greyish Yellow-Red', 'light-greyish-yellow-red', '#CCC1B3', 8),
  ('10000000-0000-0000-0000-000000000002', 'Greyish Yellow-Red', 'greyish-yellow-red', '#998266', 9),
  ('10000000-0000-0000-0000-000000000002', 'Dark Greyish Yellow-Red', 'dark-greyish-yellow-red', '#584E41', 10),
  ('10000000-0000-0000-0000-000000000002', 'Blackish Yellow-Red', 'blackish-yellow-red', '#221F1C', 11);

-- Yellow sub-hues
INSERT INTO public.hues (parent_id, name, slug, hex_code, sort_order) VALUES
  ('10000000-0000-0000-0000-000000000003', 'Vivid Yellow', 'vivid-yellow', '#FFFF00', 1),
  ('10000000-0000-0000-0000-000000000003', 'Strong Yellow', 'strong-yellow', '#CFCF17', 2),
  ('10000000-0000-0000-0000-000000000003', 'Deep Yellow', 'deep-yellow', '#8A8A0F', 3),
  ('10000000-0000-0000-0000-000000000003', 'Very Deep Yellow', 'very-deep-yellow', '#50500B', 4),
  ('10000000-0000-0000-0000-000000000003', 'Moderate Yellow', 'moderate-yellow', '#BFBF40', 5),
  ('10000000-0000-0000-0000-000000000003', 'Dark Yellow', 'dark-yellow', '#6F6F2A', 6),
  ('10000000-0000-0000-0000-000000000003', 'Very Dark Yellow', 'very-dark-yellow', '#363617', 7),
  ('10000000-0000-0000-0000-000000000003', 'Light Greyish Yellow', 'light-greyish-yellow', '#CCCCB3', 8),
  ('10000000-0000-0000-0000-000000000003', 'Greyish Yellow', 'greyish-yellow', '#999966', 9),
  ('10000000-0000-0000-0000-000000000003', 'Dark Greyish Yellow', 'dark-greyish-yellow', '#585841', 10),
  ('10000000-0000-0000-0000-000000000003', 'Blackish Yellow', 'blackish-yellow', '#22221C', 11);

-- Green-Yellow sub-hues
INSERT INTO public.hues (parent_id, name, slug, hex_code, sort_order) VALUES
  ('10000000-0000-0000-0000-000000000004', 'Vivid Green-Yellow', 'vivid-green-yellow', '#AAFF00', 1),
  ('10000000-0000-0000-0000-000000000004', 'Strong Green-Yellow', 'strong-green-yellow', '#91CF17', 2),
  ('10000000-0000-0000-0000-000000000004', 'Deep Green-Yellow', 'deep-green-yellow', '#618A0F', 3),
  ('10000000-0000-0000-0000-000000000004', 'Very Deep Green-Yellow', 'very-deep-green-yellow', '#39500B', 4),
  ('10000000-0000-0000-0000-000000000004', 'Moderate Green-Yellow', 'moderate-green-yellow', '#95BF40', 5),
  ('10000000-0000-0000-0000-000000000004', 'Dark Green-Yellow', 'dark-green-yellow', '#586F2A', 6),
  ('10000000-0000-0000-0000-000000000004', 'Very Dark Green-Yellow', 'very-dark-green-yellow', '#2B3617', 7),
  ('10000000-0000-0000-0000-000000000004', 'Light Greyish Green-Yellow', 'light-greyish-green-yellow', '#C4CCB3', 8),
  ('10000000-0000-0000-0000-000000000004', 'Greyish Green-Yellow', 'greyish-green-yellow', '#889966', 9),
  ('10000000-0000-0000-0000-000000000004', 'Dark Greyish Green-Yellow', 'dark-greyish-green-yellow', '#505841', 10),
  ('10000000-0000-0000-0000-000000000004', 'Blackish Green-Yellow', 'blackish-green-yellow', '#20221C', 11);

-- Green sub-hues
INSERT INTO public.hues (parent_id, name, slug, hex_code, sort_order) VALUES
  ('10000000-0000-0000-0000-000000000005', 'Vivid Green', 'vivid-green', '#00FF00', 1),
  ('10000000-0000-0000-0000-000000000005', 'Strong Green', 'strong-green', '#17CF17', 2),
  ('10000000-0000-0000-0000-000000000005', 'Deep Green', 'deep-green', '#0F8A0F', 3),
  ('10000000-0000-0000-0000-000000000005', 'Very Deep Green', 'very-deep-green', '#0B500B', 4),
  ('10000000-0000-0000-0000-000000000005', 'Moderate Green', 'moderate-green', '#40BF40', 5),
  ('10000000-0000-0000-0000-000000000005', 'Dark Green', 'dark-green', '#2A6F2A', 6),
  ('10000000-0000-0000-0000-000000000005', 'Very Dark Green', 'very-dark-green', '#173617', 7),
  ('10000000-0000-0000-0000-000000000005', 'Light Greyish Green', 'light-greyish-green', '#B3CCB3', 8),
  ('10000000-0000-0000-0000-000000000005', 'Greyish Green', 'greyish-green', '#669966', 9),
  ('10000000-0000-0000-0000-000000000005', 'Dark Greyish Green', 'dark-greyish-green', '#415841', 10),
  ('10000000-0000-0000-0000-000000000005', 'Blackish Green', 'blackish-green', '#1C221C', 11);

-- Blue-Green sub-hues
INSERT INTO public.hues (parent_id, name, slug, hex_code, sort_order) VALUES
  ('10000000-0000-0000-0000-000000000006', 'Vivid Blue-Green', 'vivid-blue-green', '#00FFFF', 1),
  ('10000000-0000-0000-0000-000000000006', 'Strong Blue-Green', 'strong-blue-green', '#17CFCF', 2),
  ('10000000-0000-0000-0000-000000000006', 'Deep Blue-Green', 'deep-blue-green', '#0F8A8A', 3),
  ('10000000-0000-0000-0000-000000000006', 'Very Deep Blue-Green', 'very-deep-blue-green', '#0B5050', 4),
  ('10000000-0000-0000-0000-000000000006', 'Moderate Blue-Green', 'moderate-blue-green', '#40BFBF', 5),
  ('10000000-0000-0000-0000-000000000006', 'Dark Blue-Green', 'dark-blue-green', '#2A6F6F', 6),
  ('10000000-0000-0000-0000-000000000006', 'Very Dark Blue-Green', 'very-dark-blue-green', '#173636', 7),
  ('10000000-0000-0000-0000-000000000006', 'Light Greyish Blue-Green', 'light-greyish-blue-green', '#B3CCCC', 8),
  ('10000000-0000-0000-0000-000000000006', 'Greyish Blue-Green', 'greyish-blue-green', '#669999', 9),
  ('10000000-0000-0000-0000-000000000006', 'Dark Greyish Blue-Green', 'dark-greyish-blue-green', '#415858', 10),
  ('10000000-0000-0000-0000-000000000006', 'Blackish Blue-Green', 'blackish-blue-green', '#1C2222', 11);

-- Blue sub-hues
INSERT INTO public.hues (parent_id, name, slug, hex_code, sort_order) VALUES
  ('10000000-0000-0000-0000-000000000007', 'Vivid Blue', 'vivid-blue', '#0000FF', 1),
  ('10000000-0000-0000-0000-000000000007', 'Strong Blue', 'strong-blue', '#1717CF', 2),
  ('10000000-0000-0000-0000-000000000007', 'Deep Blue', 'deep-blue', '#0F0F8A', 3),
  ('10000000-0000-0000-0000-000000000007', 'Very Deep Blue', 'very-deep-blue', '#0B0B50', 4),
  ('10000000-0000-0000-0000-000000000007', 'Moderate Blue', 'moderate-blue', '#4040BF', 5),
  ('10000000-0000-0000-0000-000000000007', 'Dark Blue', 'dark-blue', '#2A2A6F', 6),
  ('10000000-0000-0000-0000-000000000007', 'Very Dark Blue', 'very-dark-blue', '#171736', 7),
  ('10000000-0000-0000-0000-000000000007', 'Light Greyish Blue', 'light-greyish-blue', '#B3B3CC', 8),
  ('10000000-0000-0000-0000-000000000007', 'Greyish Blue', 'greyish-blue', '#666699', 9),
  ('10000000-0000-0000-0000-000000000007', 'Dark Greyish Blue', 'dark-greyish-blue', '#414158', 10),
  ('10000000-0000-0000-0000-000000000007', 'Blackish Blue', 'blackish-blue', '#1C1C22', 11);

-- Purple-Blue sub-hues
INSERT INTO public.hues (parent_id, name, slug, hex_code, sort_order) VALUES
  ('10000000-0000-0000-0000-000000000008', 'Vivid Purple-Blue', 'vivid-purple-blue', '#5500FF', 1),
  ('10000000-0000-0000-0000-000000000008', 'Strong Purple-Blue', 'strong-purple-blue', '#5417CF', 2),
  ('10000000-0000-0000-0000-000000000008', 'Deep Purple-Blue', 'deep-purple-blue', '#380F8A', 3),
  ('10000000-0000-0000-0000-000000000008', 'Very Deep Purple-Blue', 'very-deep-purple-blue', '#220B50', 4),
  ('10000000-0000-0000-0000-000000000008', 'Moderate Purple-Blue', 'moderate-purple-blue', '#6A40BF', 5),
  ('10000000-0000-0000-0000-000000000008', 'Dark Purple-Blue', 'dark-purple-blue', '#412A6F', 6),
  ('10000000-0000-0000-0000-000000000008', 'Very Dark Purple-Blue', 'very-dark-purple-blue', '#211736', 7),
  ('10000000-0000-0000-0000-000000000008', 'Light Greyish Purple-Blue', 'light-greyish-purple-blue', '#BBB3CC', 8),
  ('10000000-0000-0000-0000-000000000008', 'Greyish Purple-Blue', 'greyish-purple-blue', '#776699', 9),
  ('10000000-0000-0000-0000-000000000008', 'Dark Greyish Purple-Blue', 'dark-greyish-purple-blue', '#494158', 10),
  ('10000000-0000-0000-0000-000000000008', 'Blackish Purple-Blue', 'blackish-purple-blue', '#1E1C22', 11);

-- Purple sub-hues
INSERT INTO public.hues (parent_id, name, slug, hex_code, sort_order) VALUES
  ('10000000-0000-0000-0000-000000000009', 'Vivid Purple', 'vivid-purple', '#FF00FF', 1),
  ('10000000-0000-0000-0000-000000000009', 'Strong Purple', 'strong-purple', '#CF17CF', 2),
  ('10000000-0000-0000-0000-000000000009', 'Deep Purple', 'deep-purple', '#8A0F8A', 3),
  ('10000000-0000-0000-0000-000000000009', 'Very Deep Purple', 'very-deep-purple', '#500B50', 4),
  ('10000000-0000-0000-0000-000000000009', 'Moderate Purple', 'moderate-purple', '#BF40BF', 5),
  ('10000000-0000-0000-0000-000000000009', 'Dark Purple', 'dark-purple', '#6F2A6F', 6),
  ('10000000-0000-0000-0000-000000000009', 'Very Dark Purple', 'very-dark-purple', '#361736', 7),
  ('10000000-0000-0000-0000-000000000009', 'Light Greyish Purple', 'light-greyish-purple', '#CCB3CC', 8),
  ('10000000-0000-0000-0000-000000000009', 'Greyish Purple', 'greyish-purple', '#996699', 9),
  ('10000000-0000-0000-0000-000000000009', 'Dark Greyish Purple', 'dark-greyish-purple', '#584158', 10),
  ('10000000-0000-0000-0000-000000000009', 'Blackish Purple', 'blackish-purple', '#221C22', 11);

-- Red-Purple sub-hues
INSERT INTO public.hues (parent_id, name, slug, hex_code, sort_order) VALUES
  ('10000000-0000-0000-0000-00000000000a', 'Vivid Red-Purple', 'vivid-red-purple', '#FF0080', 1),
  ('10000000-0000-0000-0000-00000000000a', 'Strong Red-Purple', 'strong-red-purple', '#CF1773', 2),
  ('10000000-0000-0000-0000-00000000000a', 'Deep Red-Purple', 'deep-red-purple', '#8A0F4D', 3),
  ('10000000-0000-0000-0000-00000000000a', 'Very Deep Red-Purple', 'very-deep-red-purple', '#500B2E', 4),
  ('10000000-0000-0000-0000-00000000000a', 'Moderate Red-Purple', 'moderate-red-purple', '#BF4080', 5),
  ('10000000-0000-0000-0000-00000000000a', 'Dark Red-Purple', 'dark-red-purple', '#6F2A4D', 6),
  ('10000000-0000-0000-0000-00000000000a', 'Very Dark Red-Purple', 'very-dark-red-purple', '#361726', 7),
  ('10000000-0000-0000-0000-00000000000a', 'Light Greyish Red-Purple', 'light-greyish-red-purple', '#CCB3BF', 8),
  ('10000000-0000-0000-0000-00000000000a', 'Greyish Red-Purple', 'greyish-red-purple', '#996680', 9),
  ('10000000-0000-0000-0000-00000000000a', 'Dark Greyish Red-Purple', 'dark-greyish-red-purple', '#58414D', 10),
  ('10000000-0000-0000-0000-00000000000a', 'Blackish Red-Purple', 'blackish-red-purple', '#221C1F', 11);

-- Neutral sub-hues (~11 achromatic/near-achromatic)
INSERT INTO public.hues (parent_id, name, slug, hex_code, sort_order) VALUES
  ('10000000-0000-0000-0000-00000000000b', 'White', 'white', '#FFFFFF', 1),
  ('10000000-0000-0000-0000-00000000000b', 'Near White', 'near-white', '#F5F5F5', 2),
  ('10000000-0000-0000-0000-00000000000b', 'Light Grey', 'light-grey', '#C0C0C0', 3),
  ('10000000-0000-0000-0000-00000000000b', 'Medium Grey', 'medium-grey', '#808080', 4),
  ('10000000-0000-0000-0000-00000000000b', 'Dark Grey', 'dark-grey', '#404040', 5),
  ('10000000-0000-0000-0000-00000000000b', 'Near Black', 'near-black', '#1A1A1A', 6),
  ('10000000-0000-0000-0000-00000000000b', 'Black', 'black', '#000000', 7),
  ('10000000-0000-0000-0000-00000000000b', 'Brown', 'brown', '#8B4513', 8),
  ('10000000-0000-0000-0000-00000000000b', 'Dark Brown', 'dark-brown', '#3B2F2F', 9),
  ('10000000-0000-0000-0000-00000000000b', 'Light Brown', 'light-brown', '#D2B48C', 10),
  ('10000000-0000-0000-0000-00000000000b', 'Ivory', 'ivory', '#FFFFF0', 11);

-- ============================================================
-- 9. Add hue_id column to paints
-- ============================================================
ALTER TABLE public.paints
  ADD COLUMN hue_id uuid REFERENCES public.hues (id) ON DELETE SET NULL;

-- ============================================================
-- 10. Create idx_paints_hue_id index
-- ============================================================
CREATE INDEX idx_paints_hue_id ON public.paints (hue_id);
