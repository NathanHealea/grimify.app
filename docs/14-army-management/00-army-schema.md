# Army Database Schema & Module Foundation

**Epic:** Army Management
**Type:** Feature
**Status:** Completed
**Branch:** `feature/army-schema`
**Merge Into:** `epic/army-management`

## Summary

Create the `armies` table with a self-referential `parent_id` to support unlimited hierarchical depth (alliance → faction → sub-faction), an optional `icon_url` for per-army icons/images, RLS policies matching the hues pattern (public read, admin write), a public Supabase storage bucket for army icon uploads, and scaffold the `armies` domain module with types and services.

## Acceptance Criteria

- [x] `armies` table exists with `id`, `parent_id` (nullable self-ref FK), `name`, `slug`, `icon_url`, `sort_order`, and `created_at` columns
- [x] Slug uniqueness is enforced per level: top-level slugs are globally unique; child slugs are unique within their parent
- [x] `ON DELETE RESTRICT` on `parent_id` prevents deleting a parent that still has children
- [x] RLS is enabled: all authenticated and anonymous users can read armies; only admins can insert, update, or delete
- [x] A public Supabase storage bucket named `army-icons` exists for icon/image uploads
- [x] `src/modules/armies/` module exists with `types/army.ts`, `types/army-node.ts`, and `services/army-service.ts`
- [x] `ArmyService` exports: `getRootArmies()`, `getChildArmies(parentId)`, `getArmyTree()`, `getArmyById(id)`, `getAllArmiesFlat()`
- [x] All exported types and service functions have JSDoc comments
- [x] The 29 canonical armies from the seed data below are inserted by the migration

## Reference Army Hierarchy

Source: [grimdark.nathanhealea.com](https://grimdark.nathanhealea.com) — the authoritative Warhammer 40,000 faction tree this app mirrors.

```
Imperium (alliance)
├── Adepta Sororitas
├── Adeptus Custodes
├── Adeptus Mechanicus
├── Astra Militarum
├── Grey Knights
├── Imperial Knights
└── Space Marines
    ├── Black Templars
    ├── Blood Angels
    ├── Dark Angels
    ├── Deathwatch
    └── Space Wolves

Chaos (alliance)
├── Chaos Daemons
├── Chaos Knights
├── Chaos Space Marines
├── Death Guard
├── Thousand Sons
└── World Eaters

Xenos (alliance)
├── Aeldari
├── Drukhari
├── Genestealer Cults
├── Leagues of Votann
├── Necrons
├── Orks
├── T'au Empire
└── Tyranids
```

**Totals:** 3 root alliances · 21 factions · 5 sub-factions (all under Space Marines) · 29 entries

## Implementation Plan

### 1. Supabase migration

Create `supabase/migrations/20260520000000_add_armies_table.sql`:

```sql
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
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- Admin write: update
CREATE POLICY "armies_admin_update"
  ON public.armies FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- Admin write: delete
CREATE POLICY "armies_admin_delete"
  ON public.armies FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- Storage bucket for army icons (public read, admin upload)
INSERT INTO storage.buckets (id, name, public)
VALUES ('army-icons', 'army-icons', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "army_icons_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'army-icons');

CREATE POLICY "army_icons_admin_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'army-icons' AND
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );

CREATE POLICY "army_icons_admin_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'army-icons' AND
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name = 'admin'
    )
  );
```

Verify RLS policy SQL matches the exact pattern used in the hues migration before running.

### 2. Seed data

Insert the canonical 29 armies at the end of the same migration using a CTE to resolve parent UUIDs by slug:

```sql
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
    ('imperium', 'Adepta Sororitas',   'adepta-sororitas'),
    ('imperium', 'Adeptus Custodes',   'adeptus-custodes'),
    ('imperium', 'Adeptus Mechanicus', 'adeptus-mechanicus'),
    ('imperium', 'Astra Militarum',    'astra-militarum'),
    ('imperium', 'Grey Knights',       'grey-knights'),
    ('imperium', 'Imperial Knights',   'imperial-knights'),
    ('imperium', 'Space Marines',      'space-marines'),
    ('chaos',    'Chaos Daemons',      'chaos-daemons'),
    ('chaos',    'Chaos Knights',      'chaos-knights'),
    ('chaos',    'Chaos Space Marines','chaos-space-marines'),
    ('chaos',    'Death Guard',        'death-guard'),
    ('chaos',    'Thousand Sons',      'thousand-sons'),
    ('chaos',    'World Eaters',       'world-eaters'),
    ('xenos',    'Aeldari',            'aeldari'),
    ('xenos',    'Drukhari',           'drukhari'),
    ('xenos',    'Genestealer Cults',  'genestealer-cults'),
    ('xenos',    'Leagues of Votann',  'leagues-of-votann'),
    ('xenos',    'Necrons',            'necrons'),
    ('xenos',    'Orks',               'orks'),
    ('xenos',    'T''au Empire',       'tau-empire'),
    ('xenos',    'Tyranids',           'tyranids')
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
```

### 3. Army type (`src/modules/armies/types/army.ts`)

Mirror the DB columns as a TypeScript type. `parent_id` is `string | null` (null for root armies). `sort_order` is `number | null`. `icon_url` is `string | null`.

### 4. ArmyNode type (`src/modules/armies/types/army-node.ts`)

Extends `Army` with a `children: ArmyNode[]` field for recursive tree rendering. Used by admin tree lists and the palette army combobox.

### 5. Army service (`src/modules/armies/services/army-service.ts`)

All functions query the `armies` table via the Supabase server client. Key functions:

- **`getRootArmies()`** — `SELECT * FROM armies WHERE parent_id IS NULL ORDER BY sort_order ASC NULLS LAST, name ASC`
- **`getChildArmies(parentId: string)`** — `SELECT * FROM armies WHERE parent_id = $1 ORDER BY sort_order ASC NULLS LAST, name ASC`
- **`getAllArmiesFlat()`** — `SELECT * FROM armies ORDER BY sort_order ASC NULLS LAST, name ASC` — used to build trees in JS and for flat combobox lists
- **`getArmyById(id: string)`** — single row with optional parent join: `SELECT armies.*, parent:armies!parent_id(*) FROM armies WHERE id = $1`
- **`getArmyTree()`** — calls `getAllArmiesFlat()` and assembles into a nested `ArmyNode[]` tree in JS (group by parent_id, recurse from roots)

The `icon_url` field is included in all select results — no additional mapping needed.

### Affected Files

| File | Changes |
|------|---------|
| `supabase/migrations/20260520000000_add_armies_table.sql` | New — armies table, icon_url column, storage bucket, RLS policies, seed data |
| `src/modules/armies/types/army.ts` | New — `Army` type |
| `src/modules/armies/types/army-node.ts` | New — `ArmyNode` type (Army + children) |
| `src/modules/armies/services/army-service.ts` | New — army service with read functions |

### Risks & Considerations

- Confirm that the admin RLS policy SQL matches the exact column and table names used in the existing hues or brands policies — inconsistencies will cause silent access failures.
- `ON DELETE RESTRICT` on `parent_id` means the admin UI must warn and block deletion of any army that has children. Implement this check in the delete action (Feature 01) before attempting the DB delete.
- `sort_order` is nullable; ordering uses `NULLS LAST` so unordered armies always fall after explicitly ordered ones.
- The `getArmyTree()` JS assembly approach avoids a recursive SQL CTE, keeping the query simple. For very large army lists (hundreds of nodes) this is still acceptable — the data set is admin-maintained and bounded.
- `icon_url` stores a Supabase storage public URL or any external image URL. The admin upload flow (Feature 01) should use the `army-icons` bucket and write the resulting public URL back to this field.
- The seed data uses a CTE-based insert to resolve parent UUIDs by slug — test this against a fresh local Supabase instance before merging to confirm the three-step insert chain works correctly.
