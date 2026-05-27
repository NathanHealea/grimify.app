CREATE TABLE public.armies (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   uuid        REFERENCES public.armies (id) ON DELETE RESTRICT,
  name        text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  slug        text        NOT NULL CHECK (char_length(slug) BETWEEN 1 AND 100),
  icon_url    text,
  sort_order  int,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Top-level slugs are globally unique
CREATE UNIQUE INDEX uq_armies_slug_top_level
  ON public.armies (slug) WHERE parent_id IS NULL;

-- Child slugs are unique within their parent
CREATE UNIQUE INDEX uq_armies_slug_within_parent
  ON public.armies (parent_id, slug) WHERE parent_id IS NOT NULL;

ALTER TABLE public.armies ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "armies_public_read"
  ON public.armies FOR SELECT
  USING (true);

-- Admin write: insert
CREATE POLICY "armies_admin_insert"
  ON public.armies FOR INSERT
  TO authenticated
  WITH CHECK ('admin' = ANY(public.get_user_roles(auth.uid())));

-- Admin write: update
CREATE POLICY "armies_admin_update"
  ON public.armies FOR UPDATE
  TO authenticated
  USING ('admin' = ANY(public.get_user_roles(auth.uid())))
  WITH CHECK ('admin' = ANY(public.get_user_roles(auth.uid())));

-- Admin write: delete
CREATE POLICY "armies_admin_delete"
  ON public.armies FOR DELETE
  TO authenticated
  USING ('admin' = ANY(public.get_user_roles(auth.uid())));

-- ============================================================
-- Storage bucket for army icons (public read, admin upload)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('army-icons', 'army-icons', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "army_icons_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'army-icons');

CREATE POLICY "army_icons_admin_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'army-icons'
    AND 'admin' = ANY(public.get_user_roles(auth.uid()))
  );

CREATE POLICY "army_icons_admin_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'army-icons'
    AND 'admin' = ANY(public.get_user_roles(auth.uid()))
  );

-- ============================================================
-- Seed: canonical 29 Warhammer 40,000 armies
-- ============================================================

-- Insert root alliances first
WITH roots AS (
  INSERT INTO public.armies (name, slug, sort_order)
  VALUES
    ('Imperium', 'imperium', 1),
    ('Chaos',    'chaos',    2),
    ('Xenos',    'xenos',    3)
  RETURNING id, slug
),
-- Insert factions (direct children of alliances)
factions AS (
  INSERT INTO public.armies (parent_id, name, slug)
  SELECT r.id, f.name, f.slug
  FROM (VALUES
    ('imperium', 'Adepta Sororitas',    'adepta-sororitas'),
    ('imperium', 'Adeptus Custodes',    'adeptus-custodes'),
    ('imperium', 'Adeptus Mechanicus',  'adeptus-mechanicus'),
    ('imperium', 'Astra Militarum',     'astra-militarum'),
    ('imperium', 'Grey Knights',        'grey-knights'),
    ('imperium', 'Imperial Knights',    'imperial-knights'),
    ('imperium', 'Space Marines',       'space-marines'),
    ('chaos',    'Chaos Daemons',       'chaos-daemons'),
    ('chaos',    'Chaos Knights',       'chaos-knights'),
    ('chaos',    'Chaos Space Marines', 'chaos-space-marines'),
    ('chaos',    'Death Guard',         'death-guard'),
    ('chaos',    'Thousand Sons',       'thousand-sons'),
    ('chaos',    'World Eaters',        'world-eaters'),
    ('xenos',    'Aeldari',             'aeldari'),
    ('xenos',    'Drukhari',            'drukhari'),
    ('xenos',    'Genestealer Cults',   'genestealer-cults'),
    ('xenos',    'Leagues of Votann',   'leagues-of-votann'),
    ('xenos',    'Necrons',             'necrons'),
    ('xenos',    'Orks',                'orks'),
    ('xenos',    'T''au Empire',        'tau-empire'),
    ('xenos',    'Tyranids',            'tyranids')
  ) AS f(parent_slug, name, slug)
  JOIN roots r ON r.slug = f.parent_slug
  RETURNING id, slug
)
-- Insert sub-factions (children of Space Marines)
INSERT INTO public.armies (parent_id, name, slug)
SELECT f.id, sf.name, sf.slug
FROM (VALUES
  ('space-marines', 'Black Templars', 'black-templars'),
  ('space-marines', 'Blood Angels',   'blood-angels'),
  ('space-marines', 'Dark Angels',    'dark-angels'),
  ('space-marines', 'Deathwatch',     'deathwatch'),
  ('space-marines', 'Space Wolves',   'space-wolves')
) AS sf(parent_slug, name, slug)
JOIN factions f ON f.slug = sf.parent_slug;
