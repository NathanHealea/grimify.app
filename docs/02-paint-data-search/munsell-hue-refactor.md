# Munsell Hue System Refactor

**Epic:** Paint Data & Search
**Type:** Refactor
**Status:** Completed
**Branch:** `refactor/munsell-hue-refactor`
**Merge into:** `v1/main`

## Summary

Replace the Itten 12-hue color wheel system with a Munsell-based 10 principal hue system using ISCC-NBS naming conventions for sub-hues. The database table is renamed from `itten_hues` to `hues`, the foreign key on `paints` is renamed from `itten_hue_id` to `hue_id`, and a `slug` column is added to `hues` for URL-friendly identification.

### Before

```
itten_hues (85 rows = 13 top-level + 72 child colors)
  id          uuid PK
  parent_id   uuid FK → self
  name        text
  hex_code    text
  sort_order  int (nullable)
  created_at  timestamptz

paints.itten_hue_id → itten_hues.id
```

13 Itten hues (Red, Red-Orange, Orange, Yellow-Orange, Yellow, Yellow-Green, Green, Blue-Green, Blue, Blue-Violet, Violet, Red-Violet, Neutral) with 72 child colors using common color names (Crimson, Scarlet, Navy, etc.).

### After

```
hues (132 rows = 11 top-level + 121 child sub-hues)
  id          uuid PK
  parent_id   uuid FK → self
  name        text
  slug        text (new)
  hex_code    text
  sort_order  int (nullable)
  created_at  timestamptz

paints.hue_id → hues.id
```

10 Munsell principal hues + Neutral (11 top-level) with ISCC-NBS sub-hues (11 per principal hue, ~10 for Neutral).

## Motivation

- **Industry-standard hue system** — Munsell's 10 principal hues are the foundation of the ISCC-NBS color naming system, widely used in color science and standardized by the US National Bureau of Standards.
- **Descriptive sub-hue names** — ISCC-NBS modifiers (Vivid, Strong, Deep, Moderate, Dark, Greyish, Blackish) communicate value and chroma in the name itself, making sub-hues self-describing for painters.
- **Better paint classification** — The ISCC-NBS system distinguishes paints by saturation/value characteristics (e.g., "Deep Red" vs "Greyish Red"), which is more useful for painters than arbitrary common names (e.g., "Crimson" vs "Scarlet").
- **URL-friendly slugs** — Adding a `slug` column enables cleaner URLs (`/hues/vivid-red` vs `/hues/{uuid}`).
- **Cleaner naming** — Renaming `itten_hues` → `hues` and `itten_hue_id` → `hue_id` removes the color-theory-specific prefix from the schema.

## The 10 Munsell Principal Hues

| Sort | Name | Abbreviation | Slug | Hex Code |
| ---- | ---- | ------------ | ---- | -------- |
| 1 | Red | R | `red` | `#FF0000` |
| 2 | Yellow-Red | YR | `yellow-red` | `#FF8C00` |
| 3 | Yellow | Y | `yellow` | `#FFFF00` |
| 4 | Green-Yellow | GY | `green-yellow` | `#9ACD32` |
| 5 | Green | G | `green` | `#008000` |
| 6 | Blue-Green | BG | `blue-green` | `#008080` |
| 7 | Blue | B | `blue` | `#0000FF` |
| 8 | Purple-Blue | PB | `purple-blue` | `#4B0082` |
| 9 | Purple | P | `purple` | `#800080` |
| 10 | Red-Purple | RP | `red-purple` | `#FF00FF` |
| 11 | Neutral | N | `neutral` | `#808080` |

## ISCC-NBS Sub-Hue Pattern

Each of the 10 principal hues gets 11 sub-hues following the ISCC-NBS naming system. The sub-hue names combine a modifier with the parent hue name. Modifiers describe the value (lightness) and chroma (saturation) of the color.

| Modifier | Value | Chroma | Description | Slug Prefix |
| -------- | ----- | ------ | ----------- | ----------- |
| Vivid | Mid | Very High | Pure, intense, saturated | `vivid-` |
| Strong | Mid | High | Rich, full | `strong-` |
| Deep | Low-Mid | High | Dark but still saturated | `deep-` |
| Very Deep | Very Low | High | Very dark, saturated | `very-deep-` |
| Moderate | Mid | Medium | Average, everyday | `moderate-` |
| Dark | Low | Medium | Darker, less vivid | `dark-` |
| Very Dark | Very Low | Medium | Near black, some hue | `very-dark-` |
| Light Greyish | High | Low | Pale, washed out | `light-greyish-` |
| Greyish | Mid | Low | Muted, dusty | `greyish-` |
| Dark Greyish | Low | Low | Dark and dull | `dark-greyish-` |
| Blackish | Very Low | Very Low | Nearly black with hue tint | `blackish-` |

### Example: Red Sub-Hues

| Name | Slug | Hex Code | Description |
| ---- | ---- | -------- | ----------- |
| Vivid Red | `vivid-red` | `#FF0000` | Pure, intense, saturated red |
| Strong Red | `strong-red` | `#CC2233` | Rich, full red |
| Deep Red | `deep-red` | `#8B0000` | Dark but still saturated |
| Very Deep Red | `very-deep-red` | `#5C0000` | Almost maroon |
| Moderate Red | `moderate-red` | `#CD5C5C` | Average everyday red |
| Dark Red | `dark-red` | `#8B3A3A` | Darker, less vivid |
| Very Dark Red | `very-dark-red` | `#4A1010` | Near black-red |
| Light Greyish Red | `light-greyish-red` | `#D8A0A0` | Pale, washed out pinkish |
| Greyish Red | `greyish-red` | `#A06060` | Muted, dusty red |
| Dark Greyish Red | `dark-greyish-red` | `#6B3A3A` | Dark and dull red |
| Blackish Red | `blackish-red` | `#3D1010` | Nearly black with red tint |

All 10 principal hues follow this same pattern, with hex codes computed to represent the described value/chroma combination for each hue angle.

### Neutral Sub-Hues

Neutral (achromatic and near-achromatic) uses a different set of names:

| Name | Slug | Hex Code | Description |
| ---- | ---- | -------- | ----------- |
| White | `white` | `#FFFFFF` | Pure white |
| Near White | `near-white` | `#F5F5F5` | Off-white |
| Light Grey | `light-grey` | `#C0C0C0` | Light achromatic |
| Medium Grey | `medium-grey` | `#808080` | Mid achromatic |
| Dark Grey | `dark-grey` | `#404040` | Dark achromatic |
| Near Black | `near-black` | `#1A1A1A` | Almost black |
| Black | `black` | `#000000` | Pure black |
| Brown | `brown` | `#8B4513` | Warm dark neutral |
| Dark Brown | `dark-brown` | `#3B2F2F` | Very dark warm neutral |
| Light Brown | `light-brown` | `#D2B48C` | Tan/light warm neutral |
| Ivory | `ivory` | `#FFFFF0` | Warm off-white |

## Acceptance Criteria

- [x] `itten_hues` table is dropped and replaced with a `hues` table
- [x] `hues` table has a `slug` column (text, not null) with unique constraint scoped to `(parent_id, slug)`
- [x] `hues` table retains the self-referencing `parent_id` pattern
- [x] 10 Munsell principal hues + Neutral are seeded as top-level rows (`parent_id = NULL`)
- [x] 11 ISCC-NBS sub-hues per principal hue are seeded as child rows
- [x] Neutral has ~11 achromatic/near-achromatic sub-hues
- [x] `paints.itten_hue_id` column is renamed to `paints.hue_id`
- [x] `IttenHue` TypeScript type is renamed to `Hue` with a `slug: string` field added
- [x] `Paint` TypeScript type uses `hue_id` instead of `itten_hue_id`
- [x] Hue service methods are renamed: `getIttenHues` → `getHues`, `getIttenHueById` → `getHueById`
- [x] Paint service methods are renamed: all `IttenHue` references become `Hue`, `itten_hue_id` becomes `hue_id`
- [x] Components (`itten-hue-card.tsx`, `child-hue-card.tsx`, `paint-explorer.tsx`) use the `Hue` type
- [x] Route pages (`/hues/[id]`, `/paints`) use updated service method names
- [x] Seed generator (`scripts/generate-seed.ts`) uses the new color catalog and table name
- [x] RLS policies on `hues` match the previous policies (public SELECT, admin-only mutations)
- [x] `npm run build` and `npm run lint` pass with no errors

## Database Changes

### New `hues` Table

```sql
CREATE TABLE public.hues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES public.hues (id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  hex_code text NOT NULL,
  sort_order int,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

**Constraints:**
- Unique on `slug` where `parent_id IS NULL` (top-level slugs are globally unique)
- Unique on `(parent_id, slug)` where `parent_id IS NOT NULL` (child slugs unique within parent)

**Indexes:**
- `idx_hues_parent_id` — self-referencing FK lookup
- `idx_hues_sort_order` — display ordering for top-level hues
- `idx_hues_slug` — slug lookup
- `idx_hues_hex_code` — hex code lookup

### `paints` Table Changes

```sql
-- Drop old column and index
DROP INDEX IF EXISTS idx_paints_itten_hue_id;
ALTER TABLE public.paints DROP COLUMN IF EXISTS itten_hue_id;

-- Add new column
ALTER TABLE public.paints
  ADD COLUMN hue_id uuid REFERENCES public.hues (id) ON DELETE SET NULL;

CREATE INDEX idx_paints_hue_id ON public.paints (hue_id);
```

### Row Level Security

Same policies as current `itten_hues`:

- **SELECT**: Public read (`USING (true)`)
- **INSERT**: Admin only (`WITH CHECK ('admin' = ANY(public.get_user_roles(auth.uid())))`)
- **UPDATE**: Admin only
- **DELETE**: Admin only

## Implementation Plan

### Step 1: Database migration

Create `supabase/migrations/20260415000000_replace_itten_with_munsell_hues.sql`:

1. **Drop `itten_hue_id` from paints** — removes FK constraint to allow dropping `itten_hues`
2. **Drop `itten_hues` table** — cascade drops indexes and RLS policies
3. **Create `hues` table** — with `id`, `parent_id`, `name`, `slug`, `hex_code`, `sort_order`, `created_at`
4. **Add unique constraints** — partial unique index on `slug` for top-level rows; composite unique on `(parent_id, slug)` for children
5. **Create indexes** — `parent_id`, `sort_order`, `slug`, `hex_code`
6. **Enable RLS and create policies** — matching the previous policy pattern
7. **Seed 11 top-level hues** — 10 Munsell principal hues + Neutral with stable UUIDs and slugs
8. **Seed ISCC-NBS sub-hues** — 11 per principal hue (110 rows) + ~11 Neutral sub-hues
9. **Add `hue_id` column to paints** — `uuid REFERENCES public.hues (id) ON DELETE SET NULL`
10. **Create `idx_paints_hue_id` index**

The hex codes for each sub-hue should be computed programmatically to represent the correct value/chroma combination. Use HSL manipulation: start from the parent hue's base hue angle, then adjust lightness and saturation per ISCC-NBS modifier:

| Modifier | Lightness | Saturation |
| -------- | --------- | ---------- |
| Vivid | 50% | 100% |
| Strong | 45% | 80% |
| Deep | 30% | 80% |
| Very Deep | 18% | 75% |
| Moderate | 50% | 50% |
| Dark | 30% | 45% |
| Very Dark | 15% | 40% |
| Light Greyish | 75% | 20% |
| Greyish | 50% | 20% |
| Dark Greyish | 30% | 15% |
| Blackish | 12% | 10% |

### Step 2: Update TypeScript types

**File: `src/types/color.ts`**

Rename `IttenHue` → `Hue`, add `slug` field:

```typescript
/**
 * An entry in the self-referencing Munsell hue hierarchy.
 *
 * Top-level hues (the 10 Munsell principal hues plus Neutral) have
 * `parent_id = null` and a non-null `sort_order`. Child entries represent
 * ISCC-NBS sub-hues (e.g., "Vivid Red" under "Red") and have
 * `parent_id` set to their parent hue's ID with `sort_order = null`.
 */
export type Hue = {
  id: string
  parent_id: string | null
  name: string
  slug: string
  hex_code: string
  sort_order: number | null
  created_at: string
}
```

**File: `src/types/paint.ts`**

Rename `itten_hue_id` → `hue_id`:

```typescript
export type Paint = {
  // ... existing fields ...
  hue_id: string | null  // was itten_hue_id
  // ... existing fields ...
}
```

### Step 3: Update hue service

**File: `src/modules/hues/services/hue-service.ts`**

| Current | New | Change |
|---------|-----|--------|
| `import type { IttenHue }` | `import type { Hue }` | Type rename |
| `.from('itten_hues')` | `.from('hues')` | Table rename (3 occurrences) |
| `getIttenHues(): Promise<IttenHue[]>` | `getHues(): Promise<Hue[]>` | Method + return type rename |
| `getIttenHueById(id): Promise<IttenHue \| null>` | `getHueById(id): Promise<Hue \| null>` | Method + return type rename |
| `getChildHues(parentId): Promise<IttenHue[]>` | `getChildHues(parentId): Promise<Hue[]>` | Return type rename only |
| `HueService` type | `HueService` type | No change |

Update JSDoc to reference Munsell/ISCC-NBS instead of Itten.

**Files: `hue-service.server.ts`, `hue-service.client.ts`** — No changes needed (they delegate to `createHueService`).

### Step 4: Update paint service

**File: `src/modules/paints/services/paint-service.ts`**

| Current | New | Change |
|---------|-----|--------|
| `.from('itten_hues')` | `.from('hues')` | Table rename (2 occurrences: `getPaintsByHueGroup`, `getPaintCountByHueGroup`) |
| `.eq('itten_hue_id', ...)` | `.eq('hue_id', ...)` | Column rename (5 occurrences) |
| `.in('itten_hue_id', ...)` | `.in('hue_id', ...)` | Column rename (4 occurrences) |
| `getPaintsByIttenHueId()` | `getPaintsByHueId()` | Method rename |
| `getPaintCountByIttenHueId()` | `getPaintCountByHueId()` | Method rename |
| `getPaintCountsByIttenHue()` | `getPaintCountsByHue()` | Method rename |

Update all JSDoc comments to remove "Itten" references.

### Step 5: Update components

**File: `src/modules/hues/components/itten-hue-card.tsx`**

- Rename file to `hue-card.tsx` (or keep as-is — the component name `IttenHueCard` becomes `HueCard`)
- Update import: `IttenHue` → `Hue`
- Rename component: `IttenHueCard` → `HueCard`
- Update prop type: `hue: IttenHue` → `hue: Hue`

**File: `src/modules/hues/components/child-hue-card.tsx`**

- Update import: `IttenHue` → `Hue`
- Update prop type: `hue: IttenHue` → `hue: Hue`

**File: `src/modules/paints/components/paint-explorer.tsx`**

- Update imports: `IttenHue` → `Hue`, `IttenHueCard` → `HueCard`
- Rename prop: `ittenHues` → `hues`
- Rename all internal references: `ittenHues` → `hues`
- Update service calls: `getPaintCountByIttenHueId` → `getPaintCountByHueId`
- Update JSDoc

**File: `src/modules/paints/components/hue-group-paint-grid.tsx`**

- Update JSDoc to remove "Itten" references

**File: `src/modules/paints/components/hue-paint-grid.tsx`**

- Update service call: `getPaintsByIttenHueId` → `getPaintsByHueId`
- Update JSDoc

### Step 6: Update route pages

**File: `src/app/hues/[id]/page.tsx`**

- Update service calls: `getIttenHueById` → `getHueById`
- Update service calls: `getPaintCountsByIttenHue` → `getPaintCountsByHue`

**File: `src/app/paints/page.tsx`**

- Update imports: `IttenHue` → `Hue`
- Update service calls: `getIttenHues` → `getHues`
- Update service calls: `getPaintCountByIttenHueId` → `getPaintCountByHueId`
- Rename prop passed to `PaintExplorer`: `ittenHues` → `hues`

**File: `src/app/paints/[id]/page.tsx`** — No changes needed (uses `getPaintById` which returns the full paint object).

### Step 7: Update seed generator

**File: `scripts/generate-seed.ts`**

1. **Replace `COLOR_CATALOG`** — Swap the 72 Itten child color entries with the ~121 ISCC-NBS sub-hue entries. Each entry has `{ name, slug, hex }`.
2. **Update `findClosestColor`** — Returns the closest sub-hue name (already works via RGB distance).
3. **Update SQL template** — Change `itten_hue_id` to `hue_id` and `itten_hues` to `hues` in the generated INSERT statement.
4. **Update the subquery** — Change `SELECT id FROM public.itten_hues WHERE name = '...' AND parent_id IS NOT NULL LIMIT 1` to `SELECT id FROM public.hues WHERE slug = '...' AND parent_id IS NOT NULL LIMIT 1` (use slug instead of name for reliable lookups).

### Step 8: Regenerate Supabase types and verify

1. Run `npm run db:reset` to apply migration + seed
2. Run `npm run db:types` to regenerate `src/types/supabase.ts`
3. Run `npm run db:seed:generate` to regenerate `supabase/seed.sql`
4. Run `npm run db:reset` again to apply the updated seed
5. Run `npm run build` and `npm run lint` to verify

### Affected Files

| File | Changes |
|------|---------|
| `supabase/migrations/20260415000000_replace_itten_with_munsell_hues.sql` | **New** — Drop `itten_hues`, create `hues` with Munsell/ISCC-NBS data |
| `src/types/color.ts` | **Modify** — Rename `IttenHue` → `Hue`, add `slug` field |
| `src/types/paint.ts` | **Modify** — Rename `itten_hue_id` → `hue_id` |
| `src/modules/hues/services/hue-service.ts` | **Modify** — Table name, method names, types |
| `src/modules/paints/services/paint-service.ts` | **Modify** — Column name, table name, method names |
| `src/modules/hues/components/itten-hue-card.tsx` | **Rename** → `hue-card.tsx`, rename component + type |
| `src/modules/hues/components/child-hue-card.tsx` | **Modify** — Type import |
| `src/modules/paints/components/paint-explorer.tsx` | **Modify** — Imports, prop names, service calls |
| `src/modules/paints/components/hue-group-paint-grid.tsx` | **Modify** — JSDoc updates |
| `src/modules/paints/components/hue-paint-grid.tsx` | **Modify** — Service call rename |
| `src/app/hues/[id]/page.tsx` | **Modify** — Service call renames |
| `src/app/paints/page.tsx` | **Modify** — Service calls, prop name |
| `scripts/generate-seed.ts` | **Modify** — Color catalog, table/column references |
| `supabase/seed.sql` | **Regenerated** — Updated by seed generator |
| `src/types/supabase.ts` | **Regenerated** — Updated by `npm run db:types` |

### Risks & Considerations

- **Paint-to-hue reassignment** — All existing paint assignments are lost when `itten_hue_id` is dropped. The seed generator re-maps paints to the new ISCC-NBS sub-hues via closest-color matching. Verify paint assignments make sense after re-seeding.
- **ISCC-NBS hex values** — The sub-hue hex codes are computed from HSL transformations of the parent hue. These are representative colors for display, not authoritative ISCC-NBS color chip values. Fine for the UI but could be refined later.
- **More sub-hues = better classification** — Going from 72 child colors to ~121 ISCC-NBS sub-hues means paints are classified more precisely, but some sub-hues may have zero assigned paints. The UI already handles empty states.
- **Neutral sub-hues** — Neutral is not a Munsell hue; it's the achromatic axis. The sub-hues for Neutral use value-based names (White, Grey, Black, Brown) rather than ISCC-NBS modifiers. This is a deliberate deviation.
- **URL compatibility** — Any bookmarked `/hues/{uuid}` links will break since the `itten_hues` table UUIDs no longer exist. New UUIDs are generated in the `hues` table. This is acceptable for a pre-production app.
- **Slug-based URL params** — The `PaintExplorer` component currently uses hue names (lowercased) in the `?hue=` URL param. After this refactor, consider switching to slugs for consistency, since sub-hue slugs are now available and guaranteed unique within their parent.
- **Seed generator `COLOR_CATALOG`** — The catalog doubles in size. The `findClosestColor` function performance is O(n) per paint and remains fast for 121 entries × 2,337 paints.

## Notes

- The Munsell system uses 5 principal and 5 intermediate hues (10 total), which is fewer than Itten's 12. This is compensated by having more descriptive sub-hues.
- Brown is classified under Neutral rather than as a separate hue, following color science convention where brown is a low-lightness orange/yellow-red. Paints perceived as "brown" will map to Dark/Very Dark Yellow-Red or Neutral sub-hues depending on their saturation.
- The ISCC-NBS system was developed by the Inter-Society Color Council and the National Bureau of Standards. It provides a systematic vocabulary for color naming that maps directly to Munsell coordinates.
