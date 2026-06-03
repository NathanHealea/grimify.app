# Paint Explorer Sort Options (Hue, Lightness, Contrast)

**Epic:** Paint Data & Search
**Type:** Feature
**Status:** Completed
**Branch:** `feature/paint-explorer-sort`
**Merge into:** `main`

## Summary

Add sort controls to the public `/paints` explorer so users can order the catalog by **Hue**, **Lightness**, and **Contrast** in addition to the current default (name, ascending). Today there is no way to sort the grid — paints always come back alphabetical by name regardless of which hue or query is active, which makes browsing within a hue group hard ("show me the lightest reds first") and obscures the wheel-like reading order ("scan the catalog around the wheel").

This feature ships a server-side sort surface on `searchPaintsUnified` and a small sort control in `PaintExplorer`, mirroring the existing presentational `PaintSortBar` already used by the palette builder. It composes cleanly with the v2 paint-search rearchitecture and the in-flight filters feature (doc 10) without colliding on URL keys.

## Why now

- The explorer keeps growing in catalog size (6,000+ paints) and dimensional richness (hue + soon brand/type/line filters). Sort is the missing third leg.
- The user asked for it directly: "On the paint page there should be sort options, Hue, Lightness, Contracts." We interpret "Contracts" as a typo for "Contrast" — see the **Open question: what does "Contrast" mean?** section.
- `PaintSortBar` already exists at `src/modules/paints/components/paint-sort-bar.tsx` with `name | paint_type | hue | saturation | lightness`, and `sortPaints` / `sortPaintsBy` utilities already exist at `src/modules/paints/utils/sort-paints.ts`. The component is currently only wired into the palette builder. Reusing them on the explorer is a small lift.
- The filters plan (`10-paint-explorer-filters.md`) explicitly listed sort as out of scope in its **Out of Scope** section. This feature picks up that scope.

## Open question: what does "Contrast" mean?

The request says "Hue, Lightness, Contracts." We are reading "Contracts" as a typo for "Contrast", but **Contrast** has two plausible meanings in this app's domain:

| Interpretation | What it sorts by | Where the data lives | Notes |
|---|---|---|---|
| **A. Perceptual contrast (WCAG luminance)** | Relative luminance of the paint's hex color, computed as the standard sRGB → linear → `Y = 0.2126·R + 0.7152·G + 0.0722·B` formula. Equivalent to "darkest first" / "lightest first" but using human-perceptual weighting rather than HSL lightness. | Derived on-the-fly from `paints.r/g/b`. No new DB column needed. | Distinct from HSL Lightness — e.g. pure blue (`#0000ff`) and pure yellow (`#ffff00`) have the same HSL L (50%) but very different luminance (~7% vs ~93%). |
| **B. Citadel "Contrast" paint type** | A binary filter, not a sort. | `paints.paint_type = 'contrast'`. | "Contrast" is one of Citadel's brand-specific paint type values (see `paint_type` placeholder in `src/modules/admin/components/paint-form.tsx:314`). |

**Recommendation:** ship interpretation **A** (perceptual contrast / WCAG relative luminance). Reasoning:

- The request reads "**sort options**, Hue, Lightness, Contrast" — three peer items joined under "sort." Hue and Lightness are both color-attribute sorts; Contrast as a color-attribute sort is the consistent reading. Interpretation B would be a filter, not a sort, and it would already be covered by the brand/type popovers in doc 10 once that ships.
- Luminance is independent information from HSL L — sorting by it produces a visibly different and useful ordering, especially for picking high-contrast pairings on a miniature.
- Implementation is cheap: a single derived expression from `r`, `g`, `b`. No schema migration.

**To resolve before `/implement`:** confirm with the user. If interpretation B is what they wanted, this feature is a no-op (the filters feature already covers it) and we ship only Hue + Lightness sort here.

## What "sort" the schema supports

Sortable columns already present on `paints` (see `src/types/paint.ts:44-63`):

| Sort field | Source | Direction semantics | Tie-breaker | Ship in v1? |
|---|---|---|---|---|
| **Hue** | `paints.hue` (degrees, 0-360) | Asc = red → orange → yellow → green → blue → violet → wraps to red. Desc = reverse. | `paints.lightness`, then `paints.name` | **Yes** |
| **Lightness** | `paints.lightness` (percent, 0-100) | Asc = darkest first. Desc = lightest first. | `paints.hue`, then `paints.name` | **Yes** |
| **Contrast** (interpretation A) | Derived: `0.2126*r + 0.7152*g + 0.0722*b` from `paints.r/g/b` (each 0-255) | Asc = lowest luminance (darkest) first. Desc = highest luminance (lightest) first. | `paints.hue`, then `paints.name` | **Yes (pending Open Question resolution)** |
| Name | `paints.name` | Existing default. | `paints.id` | Keep — current default. |
| Saturation | `paints.saturation` | Already in `PaintSortBar`. | n/a | **Defer** — not in user ask. Can be added in a follow-up by exposing it in `SORT_FIELDS_EXPLORER` (see Phase 1). |
| Paint type | `paints.paint_type` | Already in `PaintSortBar`. | n/a | **Defer** — not in user ask. |

**v1 ships:** Name (default, existing), Hue, Lightness, Contrast.
**Composes with:** existing free-text query and hue filter, and (independently) the in-flight brand/type filters from doc 10.

### Sort direction semantics

- Both directions per field; the existing `PaintSortBar` already exposes a single ↑/↓ toggle button next to the field select.
- **Hue wraparound**: hue is conceptually circular (360 ≡ 0). For v1 we sort numerically without wraparound rotation — i.e. red (0°) is always at one end and red-violet (~330°) at the other. A future enhancement could anchor the sort at a chosen hue offset (see **Out of Scope**).
- **Null handling**: `paints.hue_id` may be `null` (uncategorized hue) but `paints.hue` itself is `NOT NULL` per the type definition — verify in the DB. If any row has a null hue/lightness/r/g/b, sort it to the end in both directions, matching the existing `sortPaintsBy` convention (nulls last) at `src/modules/paints/utils/sort-paints.ts:43-46`.

### Tie-breakers

Tie-breakers exist for a deterministic, paginated grid. The pattern is: primary sort field, then a stable secondary, then `name`, then `id` as the final stable resolver. Concretely in the Supabase query: `.order(primary, …).order(secondary, …).order('name', { ascending: true }).order('id', { ascending: true })`.

## Default sort

- **Today**: `searchPaintsUnified` always orders by `name` ascending (see `paint-service.ts:413` for the browse path and `:467` for the search path). The default never changes.
- **After this feature**: default stays `name` ascending — this preserves the current first-impression experience and the test the user already has for "where is paint X in the list." Sort is opt-in via the new control. When the user picks a non-default sort, the URL gets `?sort=…&dir=…`; when they pick the default again, those params drop from the URL.

## Interaction with filters and search

- **Sort applies after filter narrowing.** The Supabase query first applies WHERE clauses (hue, brand, type, query, etc.) then `ORDER BY`. This is true automatically — no special wiring needed.
- **Free-text query and sort compose.** Today's `searchPaintsUnified` search path uses an `.or(...)` filter and then `.order('name')`. We replace the hard-coded order with the user's pick. The query path does **not** rank by relevance — Supabase ilike doesn't produce a relevance score — so the user's sort order applies directly. There is no implicit relevance-override behavior to worry about.
- **Composes with the in-flight filters feature (doc 10).** That feature adds brand / paint-type / product-line / discontinued / metallic filters as new WHERE clauses on the same `searchPaintsUnified` call. Sort is orthogonal: it adds `ORDER BY`, not `WHERE`. The two features can ship independently and in either order.

## URL state contract

Extend the existing explorer URL contract with two new keys:

| Param | Type | Meaning | Default (omitted) |
|---|---|---|---|
| `q` | string | Free-text query (existing) | `''` |
| `hue` | `parent` or `parent,child` (existing) | Hue filter (existing) | `''` |
| `sort` | one of `name` / `hue` / `lightness` / `contrast` | Sort field | `name` |
| `dir` | one of `asc` / `desc` | Sort direction | `asc` |
| `page` | number (existing) | 1-based page | `1` |
| `size` | one of 25/50/100/200 (existing) | Page size | `50` |

**URL design rules:**

- Omit defaults to keep shareable URLs short. `?sort=name&dir=asc` → no params; `?sort=hue&dir=desc` → both written.
- Both keys are tagged `'push'` in `useSearchUrlState` so Back retraces sort changes (consistent with hue / page / size today).
- Changing the sort field or direction resets `page` to 1 — the URL position you're on under sort A isn't meaningful under sort B.
- Coexists cleanly with doc 10's proposed keys (`brand`, `type`, `line`, `disc`, `metal`) — no name collision.

**Shareable-URL example:**

```
/paints?q=red&hue=red&sort=lightness&dir=desc&size=100
```

## UX & component placement

### Layout

Place the sort control on the same row as the search input and the Clear-All button. The sort control is short (a Select + a direction toggle) and rendering it on its own line wastes vertical space on a list page.

```
[ search input ……………………… ] [ Sort: Name ▾ ] [ ↑Asc ] [ Clear All ]
[ HueFilterBar — parent pills ]
   [ child pills (when parent selected) ]
[ Paint grid ]
[ Pagination ]
```

When the filters feature (doc 10) also lands, the layout becomes:

```
[ search input ……………………… ] [ Sort: Name ▾ ] [ ↑Asc ] [ Clear All ]
[ FilterBar — Brand · Type · Line · Discontinued · Metallic · active chips ]
[ HueFilterBar — parent pills ]
   [ child pills (when parent selected) ]
[ Paint grid ]
[ Pagination ]
```

The sort control sits **above** the filter bar so that it reads "act on these results" → "narrow these results" → "the results" top-to-bottom. The Clear-All button continues to live at the right of the search row; this feature does not move it.

### Sort control component

Reuse the existing `PaintSortBar` at `src/modules/paints/components/paint-sort-bar.tsx`. It already renders the right primitives (a `Select` for the field and a `Button` for the asc/desc toggle), but it currently hardcodes its `FIELDS` to `['name', 'paint_type', 'hue', 'saturation', 'lightness']`.

This feature needs to expose only the explorer-relevant subset: `name`, `hue`, `lightness`, `contrast`. Two options:

- **(A) Add a `fields` prop to `PaintSortBar`** with a default of the current full list. The explorer passes `fields={['name', 'hue', 'lightness', 'contrast']}`. The palette builder keeps its current behavior by not passing `fields`. **Recommended** — non-breaking, lets each consumer choose.
- **(B) Build a parallel `PaintExplorerSortBar`.** Heavier, diverges the implementations. **Not recommended.**

We pick **(A)** and add `'contrast'` to the `PaintSortField` type (see Phase 1).

### Mobile

Three controls + Clear-All can wrap on a 360 px viewport. Use the existing flex-wrap pattern on the search row; if it crowds, push the sort control onto its own line via responsive utilities (`flex-wrap` already handles this for free). No new mobile-specific UI for v1.

## Domain module scope

This feature is contained inside the existing **`paints`** module. No new modules. No cross-module reads beyond what's already there.

### Affected files

| # | File | Role | Change |
|---|------|------|--------|
| 1 | `src/modules/paints/utils/sort-paints.ts` | utility | Add `'contrast'` to `PaintSortField`. Extend `SortablePaint` with the `r`, `g`, `b` fields needed for client-side contrast computation. Extend `sortPaintsBy` to compute `0.2126*r + 0.7152*g + 0.0722*b` when `field === 'contrast'`. JSDoc the new field. |
| 2 | `src/modules/paints/components/paint-sort-bar.tsx` | component | Add an optional `fields?: PaintSortField[]` prop that filters the rendered options. Add the `'Contrast'` label to `FIELD_LABELS`. Default behavior unchanged when `fields` is omitted (palette builder keeps working). |
| 3 | `src/modules/paints/services/paint-service.ts` | service | Add `sortBy?: 'name' \| 'hue' \| 'lightness' \| 'contrast'` and `sortDir?: 'asc' \| 'desc'` to `searchPaintsUnified` options. Replace the hard-coded `.order('name')` with a helper `applySort(query, sortBy, sortDir)` used by both the browse path (line 413) and the search path (line 467). Implement `contrast` as a `.order` on a computed expression — see **Service implementation notes**. |
| 4 | `src/modules/paints/actions/search-paints.ts` | action | Forward the new `sortBy` and `sortDir` options through to the service. |
| 5 | `src/modules/paints/hooks/use-paint-search.ts` | hook | Add `sortBy?` and `sortDir?` to the params; thread them into the `searchPaints` action call. Add to the `useEffect` deps. |
| 6 | `src/modules/paints/components/paint-explorer.tsx` | smart container | Add `sort` and `dir` to `ExplorerUrlState`, `hydrate`, `serialize`, and the `useSearchUrlState` keys map (both `'push'`). Render `<PaintSortBar>` next to the search input. Wire its `onChange` to call `update({ sort, dir, page: 1 }, { commit: true })`. Pass the values into `usePaintSearch`. Extend `handleClearAll` to reset sort to defaults. |
| 7 | `src/app/paints/page.tsx` | route page | Parse the new `sort` and `dir` search params (with enum validation falling back to `'name'` / `'asc'`). Pass them into the SSR `searchPaintsUnified` call so the first paint of HTML matches the URL. Pass `initialSort` and `initialDir` props to `<PaintExplorer>`. |

No changes to `HueFilterBar`, `PaintGrid`, `pagination-controls.tsx`, `use-hue-filter.ts`, `use-search-url-state.ts`, or the palette builder.

### Service implementation notes (contrast ordering)

Supabase's PostgREST `.order()` typically takes a column name, not an arbitrary expression. Two viable strategies for `sortBy === 'contrast'`:

- **(A) Generated column.** Add a generated column `relative_luminance double precision GENERATED ALWAYS AS (0.2126 * r + 0.7152 * g + 0.0722 * b) STORED` to the `paints` table via a migration, plus an index. `.order('relative_luminance')` becomes trivial. **Pros:** clean SQL, indexable, fast. **Cons:** new migration, new column to maintain in the type, every existing query selecting `*` now ships an extra field over the wire.
- **(B) RPC / view.** Add a `paints_with_luminance` view or a `search_paints_sorted` RPC that exposes the computed column and the existing filter set, called only when `sortBy === 'contrast'`. **Pros:** no schema column. **Cons:** divergent query paths for one sort option; the search-path's `.or(...)` filter expression has to be rebuilt inside the RPC; more code.
- **(C) Application-side fetch-then-sort.** Fetch a page's worth of paints sorted by name, then re-sort in Node before returning. **Broken** — pagination is wrong because the sort changes which rows are on which page; would require fetching the entire filtered set into memory before paginating. **Not viable** at 6,000+ paints.

**v1 picks (A)** — a generated `relative_luminance` column. It is the minimal, idiomatic Postgres solution and indexes cleanly. The migration is small:

```sql
ALTER TABLE paints
  ADD COLUMN relative_luminance double precision
  GENERATED ALWAYS AS (0.2126 * r + 0.7152 * g + 0.0722 * b) STORED;

CREATE INDEX paints_relative_luminance_idx ON paints (relative_luminance);
```

(The formula uses sRGB linear-luminance weights and operates on the 0-255 r/g/b values directly. Multiplying by ~1/255 would normalize to [0,1] but the sort order is identical either way — the linear scale factor doesn't matter for ORDER BY.)

If interpretation **B** of "Contrast" turns out to be what the user meant, drop this column and ship only Hue + Lightness sort.

## Implementation Plan

Phased so each phase ships green types/lint and can be split into a small PR if scope changes.

### Phase 0 — Resolve the Open Question

**Goal:** confirm with the user that "Contrast" means perceptual luminance (interpretation A), not the Citadel paint type (interpretation B).

- If **A** confirmed: proceed with all phases below.
- If **B** confirmed: skip Phases 1.3, 3.3, and the migration; ship only `hue` and `lightness` sort.

### Phase 1 — Utility, type, and component plumbing

**Goal:** extend the existing `PaintSortBar` and `sortPaints` util surface without touching the explorer yet.

1. In `src/modules/paints/utils/sort-paints.ts`:
   - Extend `PaintSortField` to include `'contrast'`.
   - Extend `SortablePaint` with `r: number; g: number; b: number`.
   - In `sortPaintsBy`, add a `field === 'contrast'` branch computing `(0.2126*r + 0.7152*g + 0.0722*b)` and comparing those values. Mirrors the existing numeric-field branch at line 60.
   - Update JSDoc on `SortablePaint` to mention the new fields and the formula. Cross-link the explorer doc.
2. In `src/modules/paints/components/paint-sort-bar.tsx`:
   - Add `'Contrast'` to `FIELD_LABELS`.
   - Add an optional `fields?: PaintSortField[]` prop. When provided, the `Select` renders only options in that list. When omitted, render all five labels (current behavior).
   - Add JSDoc for the new prop.

**Files touched:** 1 util edit, 1 component edit.

**Verification:** `npx tsc --noEmit`. Render the palette builder locally and confirm the new "Contrast" option appears in its sort select (regression check).

### Phase 2 — Service & action

**Goal:** make the data layer accept and apply the new sort.

1. Migration (only if Open Question resolves to interpretation A): add the generated `relative_luminance` column and its index as described in **Service implementation notes**. Apply via the project's standard Supabase migration tooling.
2. In `src/modules/paints/services/paint-service.ts`:
   - Add `sortBy?: 'name' | 'hue' | 'lightness' | 'contrast'` and `sortDir?: 'asc' | 'desc'` to the `searchPaintsUnified` options object.
   - Introduce a small private helper `applySort<Q>(query: Q, sortBy, sortDir): Q` that maps the union to the right column and appends the tie-breakers (e.g. for `hue`: `.order('hue', { ascending }).order('lightness').order('name').order('id')`).
   - Replace the bare `.order('name')` calls in both the browse path (line 413, also the count query if applicable) and the search path (line 467) with `applySort(query, sortBy, sortDir)`.
   - JSDoc the new options. Note that `sortBy === 'contrast'` maps to the `relative_luminance` generated column.
3. In `src/modules/paints/actions/search-paints.ts`:
   - Add `sortBy?` and `sortDir?` to the `options` parameter and forward them into the service call.

**Files touched:** 1 migration (conditional), 1 service edit, 1 action edit.

**Verification:** `npx tsc --noEmit`. Smoke test the service from a temporary route handler or REPL: confirm asc/desc reverses results, confirm sort by lightness lands the lightest paint at the top with `dir=desc`, confirm sort by contrast on (`#0000ff`, `#ffff00`, `#808080`) orders luminance-correctly (yellow > gray > blue).

### Phase 3 — Hook + smart container + route page

**Goal:** wire the sort URL state end-to-end.

1. In `src/modules/paints/hooks/use-paint-search.ts`:
   - Add `sortBy?: 'name' | 'hue' | 'lightness' | 'contrast'` and `sortDir?: 'asc' | 'desc'` to the params type.
   - Pass them into the `searchPaints` action call.
   - Add them to the `useEffect` deps array.
2. In `src/modules/paints/components/paint-explorer.tsx`:
   - Add `sort: 'name' | 'hue' | 'lightness' | 'contrast'` and `dir: 'asc' | 'desc'` to `ExplorerUrlState`.
   - In `hydrate`, parse `sp.get('sort')` with enum validation (fall back to `'name'`) and `sp.get('dir')` (fall back to `'asc'`).
   - In `serialize`, write `sort` and `dir` only when not the default.
   - Mark both keys as `'push'` in the `useSearchUrlState` `keys` map.
   - Accept `initialSort` and `initialDir` props (default `'name'` / `'asc'`).
   - Render `<PaintSortBar fields={['name', 'hue', 'lightness', 'contrast']} field={state.sort} direction={state.dir} onChange={handleSortChange} />` in the search row, between `SearchInput` and the `Clear All` button. Adjust the row layout so the search input still takes the available width (`flex-1` stays on the search wrapper; sort and clear sit shrunk to the right).
   - Implement `handleSortChange = useCallback((sort, dir) => update({ sort, dir, page: 1 }, { commit: true }), [update])`.
   - Pass `sortBy: state.sort, sortDir: state.dir` into the `usePaintSearch` call.
   - Extend `handleClearAll` to reset sort: `update({ q: '', hue: '', sort: 'name', dir: 'asc', page: 1 }, ...)`.
   - Extend `hasActiveFilters` to count a non-default sort as an active filter (i.e. show Clear All when sort is anything other than `name asc`). Optional — keeps the surface tidy.
3. In `src/app/paints/page.tsx`:
   - Add `sort?: string; dir?: string` to the `searchParams` type.
   - Parse them with enum validation (fall back to `'name'` / `'asc'`).
   - Pass `sortBy` and `sortDir` into the SSR `searchPaintsUnified` call.
   - Pass new props `initialSort` and `initialDir` into `<PaintExplorer>`.

**Files touched:** 1 hook edit, 1 explorer edit, 1 route page edit.

**Manual verification:**

- Pick "Hue" + asc → grid reorders red→violet, URL gets `?sort=hue`.
- Toggle direction → URL gets `?sort=hue&dir=desc`.
- Pick "Lightness" desc → lightest paint is first in the grid, page resets to 1.
- Pick "Contrast" desc → high-luminance paints (whites, light yellows) at the top; toggle to asc → blacks and dark blues at the top.
- Combine: `?q=red&hue=red&sort=lightness&dir=desc` → reds filter applied, lightest reds first.
- Back / Forward retraces sort changes (each commit is a `pushState` entry).
- Copy a URL with `?sort=contrast&dir=desc` into a fresh tab → SSR hydrates to that exact sort on first paint.
- Clear All resets sort to the default and drops `sort` / `dir` from the URL.

### Phase 4 — Cleanup & docs

1. JSDoc every new export / new option per `CLAUDE.md` conventions. Specifically: `applySort` helper, new `sortBy` / `sortDir` options on `searchPaintsUnified` and `searchPaints`, new `fields` prop on `PaintSortBar`, new `'contrast'` value on `PaintSortField`.
2. Verify zero new `tsc --noEmit` or `npm run lint` errors.
3. Update `src/app/paints/page.tsx` metadata description (optional): mention "sort by hue, lightness, or contrast" if it fits within the existing copy budget.
4. Update this doc's status to `In Progress` then `Completed` as work lands.

## Acceptance Criteria

- [ ] **Open Question resolved** with the user before implementation begins. Doc updated to record which interpretation of "Contrast" was chosen.
- [ ] Sort control rendered on `/paints` next to the search input, offering at minimum Name, Hue, Lightness, and Contrast (contingent on Open Question).
- [ ] Sort field selection writes `?sort=<field>` to the URL (omitted when `name`).
- [ ] Direction toggle writes `?dir=<asc|desc>` to the URL (omitted when `asc`).
- [ ] Sort applies server-side via `ORDER BY` on the paginated query; results across pages are globally ordered (not just per-page).
- [ ] Hue sort orders by `paints.hue` numerically, asc and desc both functional, with stable tie-breakers (lightness, then name, then id).
- [ ] Lightness sort orders by `paints.lightness`, asc and desc both functional.
- [ ] Contrast sort orders by relative luminance derived from `r`, `g`, `b` (contingent on Open Question A); asc and desc both functional.
- [ ] Sort composes with the existing query, hue filter, and pagination — changing sort resets `page` to 1 but leaves `q` and `hue` intact.
- [ ] Shareable URL with `?sort=…&dir=…` hydrates the UI to that exact sort on first paint (SSR).
- [ ] Back / Forward navigates through sort changes correctly (each sort change is a `pushState` entry).
- [ ] Clear All resets sort to the default (`name asc`) in addition to clearing query and hue.
- [ ] `PaintSortBar` accepts an optional `fields` prop; the palette builder's behavior is unchanged when the prop is omitted.
- [ ] No new TypeScript or lint errors.
- [ ] All new exports / new options have JSDoc per `CLAUDE.md`.

## Risks & Considerations

- **Open Question on "Contrast" meaning.** The single biggest implementation risk. Resolve before Phase 1. The plan is structured so dropping interpretation A is a clean trim (remove the migration, remove the `'contrast'` branch in three files).
- **Generated column maintenance.** Adding `relative_luminance` to `paints` means any existing `select('*')` query implicitly returns the new column. Audit usages of `select('*')` in `paint-service.ts` (e.g. lines 409, 459) for unwanted bloat — they all already select `*` so the column comes along for free, which is fine for the in-app callers but worth noting if a third party were to consume the table.
- **Default sort drift.** We are preserving today's default (`name asc`). Any user with a bookmarked `/paints?…` URL that omits `sort`/`dir` keeps the exact same view they had before this feature shipped. Verify this with one acceptance test (open a bookmark with the old URL shape; result order is unchanged).
- **`PaintSortBar` reuse risk.** The palette builder also uses `PaintSortBar` with the full field set. The proposed `fields` prop is additive (default unchanged when omitted), so the palette builder is unaffected. Add a small regression check to the manual verification list: open the palette builder, confirm its sort dropdown still shows all five labels including "Type" and "Saturation."
- **Hue sort wraparound.** Hue is conceptually circular — `0°` and `360°` are the same color, but a numeric `ORDER BY hue` puts violet (~330°) next to red (`0-30°`) across the wrap. Users who expect "warm colors first" may find the wraparound jarring. Acceptable for v1; document as an open enhancement: a `?anchor=<hue>` param to rotate the order would address it without changing the URL contract.
- **Tie-breaker overhead.** Adding three `.order(...)` clauses per query has negligible cost on indexed columns; `name` is already implicitly indexed via uniqueness constraints, and `id` is the primary key. No new indexes needed beyond `relative_luminance`.
- **Coordination with filters feature (doc 10).** Both features modify `searchPaintsUnified`, `searchPaints` (action), `usePaintSearch` (hook), `paint-explorer.tsx`, and `app/paints/page.tsx`. They touch *different lines and different options* in each of those files, so the merge conflicts should be mechanical, but whoever lands second will need to re-thread their options through the same call sites. The URL keys (`sort`, `dir`) don't overlap with the filters keys (`brand`, `type`, `line`, `disc`, `metal`).
- **Mobile width.** Adding two controls (Select + toggle) to the search row can push Clear All onto a wrap line on narrow screens. The existing flex container should handle this gracefully; spot-check at 360 px.
- **SSR-client mismatch.** Both `hydrate` and the route page's `searchParams` parser must validate enums the same way, or the first client render will reorder the grid (visible flash). Centralize the validation in one small util shared by both call sites — `parseSortField(s: string | undefined): 'name' | 'hue' | 'lightness' | 'contrast'` and the equivalent for `dir`.

## Out of Scope

- Sorting by **saturation** or **paint type** on the explorer — not in the user ask. (`PaintSortBar` already supports them for the palette builder; the explorer just opts out via the `fields` prop.)
- **Hue wraparound anchor** (rotating the hue sort to start at a user-chosen color). Tracked as a future enhancement.
- **Random / "shuffle" sort.** Not in the request.
- **Multi-column user-customizable sort** (e.g. "by brand, then by hue"). The current single-field + direction model is enough.
- **Per-user default sort preference** (storing the user's preferred sort in their profile). v1 keeps the default global.
- **Sorting on `/collection`, `/wheel`, or any other paint surface.** Those pages have their own URL state and presentation needs; out of scope for this feature.
- **Tests.** The project has no test framework configured (`CLAUDE.md` → `## Testing`), so verification is manual per the Phase-3 checklist.
