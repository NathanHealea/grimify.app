# Paint Data Migration

**Epic:** Paint Information
**Type:** Enhancement
**Status:** Todo

## Summary

Migrate brand and paint data from static JSON files to a database-backed system with versioning, local caching, and admin CRUD. Currently, 439 paints across 4 brands are stored as static JSON files (`src/data/paints/*.json`, `src/data/brands.json`) bundled into the app at build time. This enhancement moves the source of truth to a database while preserving fast client-side rendering through a versioned local cache.

Administrators should be able to add, edit, and delete paints and brands. Deleting a brand should cascade-delete all associated paints. When the app loads, it checks the database version against the local cache version — if different, the local cache is refreshed with the latest data.

## Acceptance Criteria

- [ ] Brand and paint data stored in Supabase database tables
- [ ] Version tracking table to track data changes
- [ ] On app load, version check compares local cache vs database version
- [ ] If versions differ, local cache is refreshed from the database
- [ ] Local cache persists paint/brand data for offline-capable, fast rendering
- [ ] Admin CRUD pages for brands (create, edit, delete)
- [ ] Admin CRUD pages for paints (create, edit, delete)
- [ ] Deleting a brand cascade-deletes all associated paints
- [ ] Existing color wheel rendering pipeline works with cached data (no regressions)
- [ ] Data seeded from current static JSON files via migration

## Approach Analysis

Three approaches were evaluated for this migration. Each is analyzed below with trade-offs.

### Approach 1: Exclusive External Database

**Description:** All paint and brand data lives exclusively in Supabase. Every page load fetches data directly from the database. No local caching layer.

**How it works:**
- Server components or API routes query Supabase on each request
- Data flows from Supabase → server → client on every load
- No localStorage or IndexedDB involved

**Pros:**
- Simplest architecture — single source of truth, no sync logic
- Admin changes are immediately visible to all users
- No stale data concerns

**Cons:**
- **Every page load requires a network round-trip** — slower initial render, especially on poor connections
- **No offline support** — app is non-functional without network access
- **Higher Supabase usage** — every user hits the database on every load (439+ rows per request)
- **Breaking change to current architecture** — the app is currently `"use client"` with synchronous data imports; switching to async database fetches requires significant refactoring of the data pipeline
- **Latency impact on color wheel** — the SVG wheel needs all paint data to render; waiting for a fetch delays the entire UI

**Verdict:** Not recommended. The cost of per-request fetching is too high for a dataset that changes infrequently, and it breaks the current synchronous rendering model.

### Approach 2: Split External and Local Database

**Description:** Supabase is the source of truth for paint/brand data. A versioned local cache (localStorage or IndexedDB) stores a copy. On load, the app checks the version — if stale, it fetches fresh data and updates the cache. Otherwise, it renders from the cache.

**How it works:**
1. Supabase tables: `brands`, `paints`, `data_version` (single row with a version number/timestamp)
2. On app load, fetch only the `data_version` row (lightweight query)
3. Compare against locally cached version in localStorage
4. If versions match → render from local cache (fast, no full fetch)
5. If versions differ → fetch all brands + paints, update local cache + version
6. Admin CRUD operations increment the version number after any change
7. The existing data pipeline (`Paint` → `ProcessedPaint` → SVG) consumes data from the cache the same way it currently consumes the static imports

**Pros:**
- **Fast repeat loads** — most loads serve from local cache with only a tiny version-check query
- **Offline-capable** — cached data allows the wheel to render without network
- **Minimal refactoring** — the `useOwnedPaints` hook already demonstrates the localStorage pattern; the data pipeline can consume cached data with the same shape as current static data
- **Low Supabase usage** — full data fetch only happens when data actually changes
- **Admin changes propagate naturally** — version bump triggers refresh on next load
- **Preserves current `"use client"` architecture** — data is loaded into state, not fetched server-side

**Cons:**
- More complex than a pure database approach — needs version checking and cache invalidation logic
- First-time users must wait for initial full fetch
- localStorage has a ~5MB limit (current data is well under this at ~100KB)
- Cache can technically be cleared by the user, requiring a re-fetch

**Verdict:** **Recommended approach.** Best balance of performance, simplicity, and user experience. Aligns with the existing client-side architecture and localStorage patterns.

### Approach 3: Static Files and LocalDB

**Description:** Keep paint/brand data as static JSON files deployed with the app (as today). Use a local database (IndexedDB via Dexie.js or similar) for the user's working copy. On load, compare a version hash baked into the static files against the local DB version.

**How it works:**
1. Static JSON files remain in `src/data/` and are deployed with each build
2. A version hash is generated at build time from the JSON content
3. On load, compare the build-time hash against the locally stored version
4. If different, re-seed the local IndexedDB from the static files
5. Admin changes require a code deployment (update JSON files, rebuild, deploy)

**Pros:**
- No external database dependency for paint data
- Zero network requests for data — everything is bundled or cached locally
- Simplest runtime behavior

**Cons:**
- **Admin CRUD requires code changes and redeployment** — defeats the purpose of admin management
- **No real-time updates** — data changes are tied to deploy cycles
- **IndexedDB adds complexity** (Dexie.js dependency) for minimal benefit over the current static approach
- **Doesn't satisfy the core requirement** — administrators cannot add/edit/delete paints through the UI

**Verdict:** Not recommended. While it preserves the current simplicity, it fundamentally cannot support the admin CRUD requirement without code deployments, which contradicts the goal.

## Recommended Approach: Split External and Local Database

Based on the analysis above, **Approach 2 (Split External and Local Database)** is recommended. The remainder of this implementation plan follows this approach.

## Implementation Plan

### Step 1: Create database migration for brands and paints

**`supabase/migrations/{timestamp}_create_paint_tables.sql`**

```sql
-- Data version tracking
CREATE TABLE public.data_version (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  version INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.data_version (version) VALUES (1);

-- Brands table
CREATE TABLE public.brands (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  icon TEXT,
  color TEXT NOT NULL,
  types TEXT[] NOT NULL DEFAULT '{}'
);

-- Paints table
CREATE TABLE public.paints (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  hex TEXT NOT NULL,
  type TEXT NOT NULL,
  brand_id INT REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL
);

CREATE INDEX idx_paints_brand_id ON public.paints(brand_id);

-- Enable RLS
ALTER TABLE public.data_version ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paints ENABLE ROW LEVEL SECURITY;

-- Public read access (no auth required for reading paint data)
CREATE POLICY "Anyone can read data_version"
  ON public.data_version FOR SELECT USING (true);

CREATE POLICY "Anyone can read brands"
  ON public.brands FOR SELECT USING (true);

CREATE POLICY "Anyone can read paints"
  ON public.paints FOR SELECT USING (true);

-- Admin write access
CREATE POLICY "Admins can insert brands"
  ON public.brands FOR INSERT TO authenticated
  WITH CHECK ('administrator' = ANY(public.get_user_roles(auth.uid())));

CREATE POLICY "Admins can update brands"
  ON public.brands FOR UPDATE TO authenticated
  USING ('administrator' = ANY(public.get_user_roles(auth.uid())));

CREATE POLICY "Admins can delete brands"
  ON public.brands FOR DELETE TO authenticated
  USING ('administrator' = ANY(public.get_user_roles(auth.uid())));

CREATE POLICY "Admins can insert paints"
  ON public.paints FOR INSERT TO authenticated
  WITH CHECK ('administrator' = ANY(public.get_user_roles(auth.uid())));

CREATE POLICY "Admins can update paints"
  ON public.paints FOR UPDATE TO authenticated
  USING ('administrator' = ANY(public.get_user_roles(auth.uid())));

CREATE POLICY "Admins can delete paints"
  ON public.paints FOR DELETE TO authenticated
  USING ('administrator' = ANY(public.get_user_roles(auth.uid())));

CREATE POLICY "Admins can update data_version"
  ON public.data_version FOR UPDATE TO authenticated
  USING ('administrator' = ANY(public.get_user_roles(auth.uid())));

-- Function to bump version on data changes
CREATE OR REPLACE FUNCTION bump_data_version()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.data_version SET version = version + 1, updated_at = now() WHERE id = 1;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers to auto-bump version
CREATE TRIGGER on_brand_change
  AFTER INSERT OR UPDATE OR DELETE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION bump_data_version();

CREATE TRIGGER on_paint_change
  AFTER INSERT OR UPDATE OR DELETE ON public.paints
  FOR EACH ROW EXECUTE FUNCTION bump_data_version();
```

### Step 2: Create seed migration

**`supabase/migrations/{timestamp}_seed_paint_data.sql`**

Generate SQL INSERT statements from the current JSON data files:
- Insert all 4 brands from `src/data/brands.json`
- Insert all 439 paints from `src/data/paints/*.json` with correct `brand_id` foreign keys

This ensures the database starts with the same data currently in the static files.

### Step 3: Create paint data types

**`src/types/paint.ts`** — Update to add database-aligned types:

```typescript
export interface BrandRow {
  id: number
  name: string
  icon: string | null
  color: string
  types: string[]
}

export interface PaintRow {
  id: number
  name: string
  hex: string
  type: string
  brand_id: number
}
```

The existing `Paint`, `ProcessedPaint`, and `PaintGroup` types remain unchanged — the cache layer maps `BrandRow`/`PaintRow` to the existing shapes.

### Step 4: Create paint data cache hook

**`src/hooks/usePaintData.ts`**

```typescript
// Manages versioned local cache of paint/brand data
// - On mount, fetches data_version from Supabase
// - Compares with localStorage cached version
// - If stale or missing, fetches all brands + paints, updates cache
// - Returns { brands, paints, loading } in the same shape as current static data
// - Falls back to static JSON files if Supabase is unavailable (graceful degradation)
```

localStorage keys:
- `colorwheel-paint-data-version` — cached version number
- `colorwheel-paint-data-brands` — cached brands JSON
- `colorwheel-paint-data-paints` — cached paints JSON

### Step 5: Integrate cache hook into data pipeline

**`src/app/page.tsx`** — Replace static import of paint data with `usePaintData()` hook:

```typescript
// Before:
import { brands, paints } from '@/data'

// After:
const { brands, paints, loading } = usePaintData()
```

Add a loading state while data is being fetched on first load. The rest of the data pipeline (`processPaint`, `paintToWheelPosition`, etc.) remains unchanged since the data shape is preserved.

### Step 6: Create admin brand management pages

**`src/app/admin/brands/page.tsx`** — List all brands with edit/delete actions.

**`src/app/admin/brands/new/page.tsx`** — Create new brand form (name, icon, color, types).

**`src/app/admin/brands/[id]/edit/page.tsx`** — Edit existing brand.

Server actions in **`src/app/admin/brands/actions.ts`**:
- `createBrand(formData)` — Insert brand
- `updateBrand(id, formData)` — Update brand
- `deleteBrand(id)` — Delete brand (cascade deletes paints)

### Step 7: Create admin paint management pages

**`src/app/admin/paints/page.tsx`** — List all paints with brand filter, edit/delete actions.

**`src/app/admin/paints/new/page.tsx`** — Create new paint form (name, hex with color picker, type, brand select).

**`src/app/admin/paints/[id]/edit/page.tsx`** — Edit existing paint.

Server actions in **`src/app/admin/paints/actions.ts`**:
- `createPaint(formData)` — Insert paint
- `updatePaint(id, formData)` — Update paint
- `deletePaint(id)` — Delete paint

### Step 8: Remove static data files (optional, deferred)

Once the database migration is confirmed working, the static JSON files in `src/data/` can be kept as a fallback or removed. Recommend keeping them initially for graceful degradation if Supabase is unavailable.

### Affected Files

| File | Changes |
|------|---------|
| `supabase/migrations/{timestamp}_create_paint_tables.sql` | New — brands, paints, data_version tables with RLS |
| `supabase/migrations/{timestamp}_seed_paint_data.sql` | New — seed data from static JSON files |
| `src/types/paint.ts` | Add `BrandRow`, `PaintRow` database types |
| `src/hooks/usePaintData.ts` | New — versioned cache hook |
| `src/app/page.tsx` | Replace static import with `usePaintData()` hook |
| `src/app/admin/brands/page.tsx` | New — brand list page |
| `src/app/admin/brands/new/page.tsx` | New — create brand page |
| `src/app/admin/brands/[id]/edit/page.tsx` | New — edit brand page |
| `src/app/admin/brands/actions.ts` | New — brand CRUD server actions |
| `src/app/admin/paints/page.tsx` | New — paint list page |
| `src/app/admin/paints/new/page.tsx` | New — create paint page |
| `src/app/admin/paints/[id]/edit/page.tsx` | New — edit paint page |
| `src/app/admin/paints/actions.ts` | New — paint CRUD server actions |

### Dependencies

This feature depends on:
- **Epic 8: User Authentication** — specifically [Supabase Setup](../user-authentication/supabase-setup.md) for the Supabase client and [Role-Based Authorization](../user-authentication/role-based-authorization.md) for admin role checks and the `get_user_roles()` function used in RLS policies.

### Risks & Considerations

- **RLS policies reference `get_user_roles()`** — this function is created in the Role-Based Authorization migration. The paint tables migration must run after that migration, or the policies must be added separately.
- **Version bump triggers fire per-row** — bulk inserts (like the seed migration) will bump the version many times. Consider disabling triggers during seed or using a single `AFTER STATEMENT` trigger instead.
- **localStorage size** — 439 paints at ~100 bytes each is ~44KB, well within the ~5MB localStorage limit. Even 10x growth is safe.
- **Graceful degradation** — if Supabase is down or unreachable, the app should fall back to cached data or static files so users aren't blocked.
- **First-time load** — users with no cache will need to fetch all data on first visit. This is a one-time cost of ~50KB.
- **Cascade delete** — deleting a brand removes all its paints at the database level. The admin UI should show a confirmation with the count of paints that will be deleted.
