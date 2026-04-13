-- ============================================================
-- Create Itten 12-hue color wheel reference table (self-referencing)
--
-- Top-level hues (parent_id IS NULL): the 12 Itten hues + Neutral
-- Child hues (parent_id IS NOT NULL): named colors within each group
-- ============================================================

-- ============================================================
-- itten_hues: self-referencing hierarchy of hues and colors
-- ============================================================
CREATE TABLE public.itten_hues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES public.itten_hues (id) ON DELETE CASCADE,
  name text NOT NULL,
  hex_code text NOT NULL,
  sort_order int,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================

-- Self-referencing FK lookup by parent
CREATE INDEX idx_itten_hues_parent_id ON public.itten_hues (parent_id);

-- Sort order for display (top-level hues)
CREATE INDEX idx_itten_hues_sort_order ON public.itten_hues (sort_order);

-- Hex code lookup
CREATE INDEX idx_itten_hues_hex_code ON public.itten_hues (hex_code);

-- ============================================================
-- Row Level Security: itten_hues
-- ============================================================
ALTER TABLE public.itten_hues ENABLE ROW LEVEL SECURITY;

-- SELECT: Public read access (anon + authenticated)
CREATE POLICY "Anyone can view itten hues"
  ON public.itten_hues
  FOR SELECT
  USING (true);

-- INSERT: Admin only
CREATE POLICY "Admins can insert itten hues"
  ON public.itten_hues
  FOR INSERT
  TO authenticated
  WITH CHECK ('admin' = ANY(public.get_user_roles(auth.uid())));

-- UPDATE: Admin only
CREATE POLICY "Admins can update itten hues"
  ON public.itten_hues
  FOR UPDATE
  TO authenticated
  USING ('admin' = ANY(public.get_user_roles(auth.uid())))
  WITH CHECK ('admin' = ANY(public.get_user_roles(auth.uid())));

-- DELETE: Admin only
CREATE POLICY "Admins can delete itten hues"
  ON public.itten_hues
  FOR DELETE
  TO authenticated
  USING ('admin' = ANY(public.get_user_roles(auth.uid())));

-- ============================================================
-- Seed the 12 Itten hues plus Neutral with stable UUIDs
-- ============================================================
INSERT INTO public.itten_hues (id, name, hex_code, sort_order) VALUES
  ('a4631f61-d48a-4dee-a0c3-3b8ec42fe2d0', 'Red',           '#FF0000',  1),
  ('661c8f72-e0ab-4c88-b7e3-32e21e7f6f82', 'Red-Orange',    '#FF4500',  2),
  ('864611f3-740a-4cd1-82ed-02511ce0364f', 'Orange',        '#FF8C00',  3),
  ('997638bd-2a73-4132-aab5-5b142bcd8d28', 'Yellow-Orange', '#FFB300',  4),
  ('22e275dc-790e-45e9-b312-76d0a197d58c', 'Yellow',        '#FFFF00',  5),
  ('79711489-3ff1-4fb0-ab0b-9574ac6e5faf', 'Yellow-Green',  '#9ACD32',  6),
  ('9fa7eb0a-f515-4732-8c53-8c29f8c3ff52', 'Green',         '#008000',  7),
  ('7c3be6b6-5b81-48c0-8a20-82020f0688d5', 'Blue-Green',    '#008080',  8),
  ('c58cfcbc-24ac-43df-b8a3-ac830bfeb29d', 'Blue',          '#0000FF',  9),
  ('fc51edc2-5551-48b2-8f0a-0213405ebd8d', 'Blue-Violet',   '#4B0082', 10),
  ('8aa71d98-3802-4c36-8405-23183ef824d1', 'Violet',        '#7F00FF', 11),
  ('abd254e1-ea84-4c4b-9f48-6ec16faf6419', 'Red-Violet',    '#FF00FF', 12),
  ('88c86d73-4a9d-43ab-b5a4-12aef90729b7', 'Neutral',       '#808080', 13);

-- ============================================================
-- Seed named colors as child hues (parent_id references top-level hue)
-- ============================================================

-- Red
INSERT INTO public.itten_hues (name, hex_code, parent_id) VALUES
  ('Red',        '#FF0000', 'a4631f61-d48a-4dee-a0c3-3b8ec42fe2d0'),
  ('Crimson',    '#DC143C', 'a4631f61-d48a-4dee-a0c3-3b8ec42fe2d0'),
  ('Scarlet',    '#FF2400', 'a4631f61-d48a-4dee-a0c3-3b8ec42fe2d0'),
  ('Blood Red',  '#660000', 'a4631f61-d48a-4dee-a0c3-3b8ec42fe2d0'),
  ('Cherry',     '#DE3163', 'a4631f61-d48a-4dee-a0c3-3b8ec42fe2d0');

-- Red-Orange
INSERT INTO public.itten_hues (name, hex_code, parent_id) VALUES
  ('Vermillion',    '#E34234', '661c8f72-e0ab-4c88-b7e3-32e21e7f6f82'),
  ('Rust',          '#B7410E', '661c8f72-e0ab-4c88-b7e3-32e21e7f6f82'),
  ('Burnt Sienna',  '#E97451', '661c8f72-e0ab-4c88-b7e3-32e21e7f6f82'),
  ('Terracotta',    '#E2725B', '661c8f72-e0ab-4c88-b7e3-32e21e7f6f82'),
  ('Coral',         '#FF7F50', '661c8f72-e0ab-4c88-b7e3-32e21e7f6f82');

-- Orange
INSERT INTO public.itten_hues (name, hex_code, parent_id) VALUES
  ('Orange',        '#FF8C00', '864611f3-740a-4cd1-82ed-02511ce0364f'),
  ('Burnt Orange',  '#CC5500', '864611f3-740a-4cd1-82ed-02511ce0364f'),
  ('Tangerine',     '#FF9966', '864611f3-740a-4cd1-82ed-02511ce0364f'),
  ('Pumpkin',       '#FF7518', '864611f3-740a-4cd1-82ed-02511ce0364f'),
  ('Copper',        '#B87333', '864611f3-740a-4cd1-82ed-02511ce0364f');

-- Yellow-Orange
INSERT INTO public.itten_hues (name, hex_code, parent_id) VALUES
  ('Amber',     '#FFBF00', '997638bd-2a73-4132-aab5-5b142bcd8d28'),
  ('Gold',      '#FFD700', '997638bd-2a73-4132-aab5-5b142bcd8d28'),
  ('Marigold',  '#EAA221', '997638bd-2a73-4132-aab5-5b142bcd8d28'),
  ('Honey',     '#EB9605', '997638bd-2a73-4132-aab5-5b142bcd8d28'),
  ('Saffron',   '#F4C430', '997638bd-2a73-4132-aab5-5b142bcd8d28');

-- Yellow
INSERT INTO public.itten_hues (name, hex_code, parent_id) VALUES
  ('Yellow',      '#FFFF00', '22e275dc-790e-45e9-b312-76d0a197d58c'),
  ('Lemon',       '#FFF44F', '22e275dc-790e-45e9-b312-76d0a197d58c'),
  ('Canary',      '#FFEF00', '22e275dc-790e-45e9-b312-76d0a197d58c'),
  ('Sunflower',   '#FFDA03', '22e275dc-790e-45e9-b312-76d0a197d58c'),
  ('Pale Yellow', '#FFFFBF', '22e275dc-790e-45e9-b312-76d0a197d58c');

-- Yellow-Green
INSERT INTO public.itten_hues (name, hex_code, parent_id) VALUES
  ('Lime',         '#32CD32', '79711489-3ff1-4fb0-ab0b-9574ac6e5faf'),
  ('Chartreuse',   '#7FFF00', '79711489-3ff1-4fb0-ab0b-9574ac6e5faf'),
  ('Spring Green', '#00FF7F', '79711489-3ff1-4fb0-ab0b-9574ac6e5faf'),
  ('Olive',        '#808000', '79711489-3ff1-4fb0-ab0b-9574ac6e5faf'),
  ('Moss',         '#8A9A5B', '79711489-3ff1-4fb0-ab0b-9574ac6e5faf');

-- Green
INSERT INTO public.itten_hues (name, hex_code, parent_id) VALUES
  ('Green',        '#008000', '9fa7eb0a-f515-4732-8c53-8c29f8c3ff52'),
  ('Forest Green', '#228B22', '9fa7eb0a-f515-4732-8c53-8c29f8c3ff52'),
  ('Dark Green',   '#006400', '9fa7eb0a-f515-4732-8c53-8c29f8c3ff52'),
  ('Emerald',      '#50C878', '9fa7eb0a-f515-4732-8c53-8c29f8c3ff52'),
  ('Hunter Green', '#355E3B', '9fa7eb0a-f515-4732-8c53-8c29f8c3ff52');

-- Blue-Green
INSERT INTO public.itten_hues (name, hex_code, parent_id) VALUES
  ('Teal',       '#008080', '7c3be6b6-5b81-48c0-8a20-82020f0688d5'),
  ('Turquoise',  '#40E0D0', '7c3be6b6-5b81-48c0-8a20-82020f0688d5'),
  ('Cyan',       '#00FFFF', '7c3be6b6-5b81-48c0-8a20-82020f0688d5'),
  ('Aquamarine', '#7FFFD4', '7c3be6b6-5b81-48c0-8a20-82020f0688d5'),
  ('Sea Green',  '#2E8B57', '7c3be6b6-5b81-48c0-8a20-82020f0688d5');

-- Blue
INSERT INTO public.itten_hues (name, hex_code, parent_id) VALUES
  ('Blue',       '#0000FF', 'c58cfcbc-24ac-43df-b8a3-ac830bfeb29d'),
  ('Navy',       '#000080', 'c58cfcbc-24ac-43df-b8a3-ac830bfeb29d'),
  ('Royal Blue', '#4169E1', 'c58cfcbc-24ac-43df-b8a3-ac830bfeb29d'),
  ('Sky Blue',   '#87CEEB', 'c58cfcbc-24ac-43df-b8a3-ac830bfeb29d'),
  ('Cobalt',     '#0047AB', 'c58cfcbc-24ac-43df-b8a3-ac830bfeb29d');

-- Blue-Violet
INSERT INTO public.itten_hues (name, hex_code, parent_id) VALUES
  ('Indigo',        '#4B0082', 'fc51edc2-5551-48b2-8f0a-0213405ebd8d'),
  ('Ultramarine',   '#3F00FF', 'fc51edc2-5551-48b2-8f0a-0213405ebd8d'),
  ('Periwinkle',    '#CCCCFF', 'fc51edc2-5551-48b2-8f0a-0213405ebd8d'),
  ('Slate Blue',    '#6A5ACD', 'fc51edc2-5551-48b2-8f0a-0213405ebd8d'),
  ('Midnight Blue', '#191970', 'fc51edc2-5551-48b2-8f0a-0213405ebd8d');

-- Violet
INSERT INTO public.itten_hues (name, hex_code, parent_id) VALUES
  ('Violet',   '#7F00FF', '8aa71d98-3802-4c36-8405-23183ef824d1'),
  ('Purple',   '#800080', '8aa71d98-3802-4c36-8405-23183ef824d1'),
  ('Plum',     '#8E4585', '8aa71d98-3802-4c36-8405-23183ef824d1'),
  ('Amethyst', '#9966CC', '8aa71d98-3802-4c36-8405-23183ef824d1'),
  ('Lavender', '#B57EDC', '8aa71d98-3802-4c36-8405-23183ef824d1');

-- Red-Violet
INSERT INTO public.itten_hues (name, hex_code, parent_id) VALUES
  ('Magenta',   '#FF00FF', 'abd254e1-ea84-4c4b-9f48-6ec16faf6419'),
  ('Rose',      '#FF007F', 'abd254e1-ea84-4c4b-9f48-6ec16faf6419'),
  ('Fuchsia',   '#FF77FF', 'abd254e1-ea84-4c4b-9f48-6ec16faf6419'),
  ('Hot Pink',  '#FF69B4', 'abd254e1-ea84-4c4b-9f48-6ec16faf6419'),
  ('Raspberry', '#E30B5C', 'abd254e1-ea84-4c4b-9f48-6ec16faf6419');

-- Neutral (achromatic)
INSERT INTO public.itten_hues (name, hex_code, parent_id) VALUES
  ('Black',      '#000000', '88c86d73-4a9d-43ab-b5a4-12aef90729b7'),
  ('White',      '#FFFFFF', '88c86d73-4a9d-43ab-b5a4-12aef90729b7'),
  ('Grey',       '#808080', '88c86d73-4a9d-43ab-b5a4-12aef90729b7'),
  ('Dark Grey',  '#404040', '88c86d73-4a9d-43ab-b5a4-12aef90729b7'),
  ('Light Grey', '#C0C0C0', '88c86d73-4a9d-43ab-b5a4-12aef90729b7'),
  ('Ivory',      '#FFFFF0', '88c86d73-4a9d-43ab-b5a4-12aef90729b7'),
  ('Bone',       '#E3DAC9', '88c86d73-4a9d-43ab-b5a4-12aef90729b7'),
  ('Silver',     '#C0C0C0', '88c86d73-4a9d-43ab-b5a4-12aef90729b7'),
  ('Brown',      '#8B4513', '88c86d73-4a9d-43ab-b5a4-12aef90729b7'),
  ('Dark Brown', '#3B2F2F', '88c86d73-4a9d-43ab-b5a4-12aef90729b7'),
  ('Tan',        '#D2B48C', '88c86d73-4a9d-43ab-b5a4-12aef90729b7'),
  ('Beige',      '#F5F5DC', '88c86d73-4a9d-43ab-b5a4-12aef90729b7');

-- ============================================================
-- Add itten_hue_id FK to paints table (points to color-level row)
-- ============================================================
ALTER TABLE public.paints
  ADD COLUMN itten_hue_id uuid REFERENCES public.itten_hues (id) ON DELETE SET NULL;

CREATE INDEX idx_paints_itten_hue_id ON public.paints (itten_hue_id);
