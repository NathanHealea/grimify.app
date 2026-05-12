# Substitute Suggestions for Discontinued Paints

**Epic:** Cross-Brand Comparison
**Type:** Feature
**Status:** Todo
**Branch:** `feature/substitute-suggestions`
**Merge into:** `main`

## Summary

Surface substitute paints for discontinued paints. The `paints.is_discontinued` flag (already present in the schema, indexed) is the trigger: detail pages for discontinued paints get a "Substitutes" section, and a new `/discontinued` browse page lists every discontinued paint with its top substitutes inline. All ranking goes through the `findPaintMatches` action from feature 00 with `excludeDiscontinued: true`.

## Acceptance Criteria

- [ ] A `Discontinued` badge already renders on `PaintDetail` (existing). Add the same badge to `PaintCard` so discontinued paints are visually marked in search results too.
- [ ] On `/paints/[id]` for any paint where `is_discontinued = true`, a "Substitutes" section renders the top 5 non-discontinued matches with ΔE scores, ranked across all brands by default.
- [ ] The substitutes section has a brand filter (Radix `Select`, multi-brand via chips or a simple dropdown — multi is preferred but a single-brand dropdown is acceptable for v1).
- [ ] A `/discontinued` route lists every discontinued paint paginated; each row shows the discontinued paint and its top 3 substitutes inline.
- [ ] JSDoc on every exported type, function, component, and action per `CLAUDE.md`.
- [ ] `npm run build` and `npm run lint` pass with no errors.

## Dependencies

- **Requires feature 00** (color-matching-engine) — the substitutes section and the `/discontinued` rows both call `findPaintMatches`.
- Independent of feature 01.

## Schema Status

No migration required. The `paints` table already has:

- `is_discontinued boolean NOT NULL DEFAULT false`
- `CREATE INDEX idx_paints_is_discontinued ON public.paints (is_discontinued) WHERE is_discontinued = true;`

(See `supabase/migrations/20260413000000_create_paint_tables.sql`.)

The `PaintDetail` component already renders a `Discontinued` badge. The flag is also honoured by `getColorWheelPaints()` (filters out discontinued).

## Domain Module

Lives in `src/modules/paints/`. No new module.

## Routes

| Route           | Description                                     |
| --------------- | ----------------------------------------------- |
| `/discontinued` | Paginated listing of discontinued paints, each with its top 3 substitutes inline. |

## Key Files

| Action | File                                                                          | Description                                                                          |
| ------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Create | `src/app/discontinued/page.tsx`                                               | Thin route page: pagination, SSR fetch (including bulk substitute pre-resolution), renders the listing component. |
| Create | `src/app/discontinued/loading.tsx`                                            | Skeleton — mirror `src/app/paints/loading.tsx`.                                      |
| Create | `src/modules/paints/components/paint-substitutes.tsx`                         | Thin renderer: brand-filter UI + substitute grid. Delegates state and fetching to `usePaintSubstitutes`. |
| Create | `src/modules/paints/components/discontinued-paint-listing.tsx`                | Thin renderer: maps discontinued paints to row components; substitutes come pre-resolved from SSR. |
| Create | `src/modules/paints/components/discontinued-badge.tsx`                        | Shared `Discontinued` badge (extracted from `paint-detail.tsx` so `paint-card.tsx` can reuse it). |
| Create | `src/modules/paints/components/substitute-paint-card.tsx`                     | Thin wrapper around `PaintCard` that appends a `ΔE x.x` caption. |
| Create | `src/modules/paints/hooks/use-paint-substitutes.ts`                           | Client hook — owns selected brand filter, calls `findPaintMatches`, manages `isPending`/`error`/`matches` state. Returns `{ matches, selectedBrandIds, setSelectedBrandIds, isPending, error }`. |
| Create | `src/modules/paints/services/discontinued-service.ts`                         | `listDiscontinuedPaints({ limit, offset })` and `countDiscontinuedPaints()` queries. |
| Create | `src/modules/paints/services/discontinued-service.server.ts`                  | Server wrapper around the service.                                                   |
| Reuse  | `src/modules/paints/actions/find-matches-for-paints.ts` (feature 00)          | Bulk substitute fetch called from `/discontinued/page.tsx` SSR — keeps the listing page off N parallel client actions. |
| Modify | `src/modules/paints/services/paint-service.ts`                                | If the previous service feels too small, consider adding `listDiscontinuedPaints` directly to `paint-service` instead (judgement call — pick one location and document). |
| Modify | `src/modules/paints/components/paint-card.tsx`                                | Render `<DiscontinuedBadge />` when `isDiscontinued` is true. Add an `isDiscontinued?: boolean` prop. |
| Modify | `src/modules/paints/components/paint-detail.tsx`                              | Extract the inline `Discontinued` span to `<DiscontinuedBadge />` and, when `paint.is_discontinued`, render `<PaintSubstitutes sourcePaintId={paint.id} sourceBrandId={brand.id} />` below the existing detail body. |
| Modify | `src/app/paints/[id]/page.tsx`                                                | No change needed if `PaintDetail` owns the substitutes section. (If the section needs SSR data, fetch and pass via props instead.) |
| Modify | All `PaintCard` call-sites (e.g. `paint-references.tsx`, `paginated-paint-grid.tsx`, etc.) | Pass the new `isDiscontinued` prop where the caller has access to it. Defaults to `false` so existing call-sites compile. |

## Existing Building Blocks (Reuse)

| Building block                            | Path                                                            | Use in this feature                                          |
| ----------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------ |
| `findPaintMatches`                        | `src/modules/paints/actions/find-paint-matches.ts` (feature 00) | Called only from `usePaintSubstitutes`. Pass `excludeDiscontinued: true`, optional `brandIds` from the filter, and `limit: 5` (detail) or `limit: 3` (listing rows). |
| `findMatchesForPaints` (bulk)             | `src/modules/paints/actions/find-matches-for-paints.ts` (feature 00) | Called once from `/discontinued/page.tsx` SSR with all the page's discontinued paint IDs to pre-resolve substitutes. |
| `is_discontinued` column + index          | `supabase/migrations/20260413000000_create_paint_tables.sql`    | Already there. No migration.                                 |
| `getAllBrands`                            | `src/modules/brands/services/brand-service.ts`                  | Populates the substitutes brand-filter dropdown.             |
| `Select` from `@radix-ui/react-select`    | `src/components/ui/select.tsx`, `package.json`                  | Brand filter — no native `<select>` per `CLAUDE.md`.         |
| `PaintCard`                               | `src/modules/paints/components/paint-card.tsx`                  | Substitute thumbnails.                                       |
| `Main`, `PageHeader`, `Breadcrumbs`       | `src/components/`                                               | `/discontinued` page chrome.                                 |
| `PaginationControls`                      | `src/modules/paints/components/pagination-controls.tsx`         | Pager for `/discontinued`.                                   |

## Implementation Plan

### Reusable extraction summary

Substitutes logic is lifted out of the components so `PaintSubstitutes` and `DiscontinuedPaintListing` are thin renderers. The codebase places hooks under `src/modules/<module>/hooks/` (e.g. `use-paint-search.ts`, `use-search-url-state.ts`); there is no shared `src/hooks/` directory.

| Kind     | Name                                                | Location                                                        | Owner | Used by                                                                  |
| -------- | --------------------------------------------------- | --------------------------------------------------------------- | ----- | ------------------------------------------------------------------------ |
| Hook     | `usePaintSubstitutes`                               | `src/modules/paints/hooks/use-paint-substitutes.ts`             | 02    | `PaintSubstitutes`. Wraps `findPaintMatches` (feature 00) with brand-filter state, `useTransition`, and error handling. |
| Service  | `createDiscontinuedService(supabase)`               | `src/modules/paints/services/discontinued-service.ts`           | 02    | `/discontinued` route SSR and any future admin tooling.                  |
| Component | `SubstitutePaintCard`                              | `src/modules/paints/components/substitute-paint-card.tsx`       | 02    | `PaintSubstitutes` and listing rows — composes `PaintCard` with a ΔE caption rather than bloating `PaintCard`. |
| Reused   | `findPaintMatches`, `findMatchesForPaints`          | `src/modules/paints/actions/` (feature 00)                      | 00    | The per-paint action is called from the hook; the bulk action is called once in `/discontinued` SSR. |

**Cross-doc note (vs feature 01):** both features call `findPaintMatches`, but they wrap it differently because the call sites have different shapes. Feature 01's `useFindSimilarPaints` is a "fetch then navigate" hook; feature 02's `usePaintSubstitutes` is a "fetch and render with filter state" hook. We intentionally do **not** create a shared `useFindMatches` super-hook — the call sites' state shapes diverge enough that a single hook would be a lowest-common-denominator. The shared contract is the **action**, which feature 00 owns.

**Component contract:** `PaintSubstitutes` renders props only — no `useState`, no `useEffect` fetching, no direct action calls. Same for `DiscontinuedPaintListing`: it receives `Record<paintId, PaintMatch[]>` from SSR and renders rows.

### 1. Extract `DiscontinuedBadge`

Create `src/modules/paints/components/discontinued-badge.tsx`:

- Move the existing `<span className="rounded-full bg-destructive/10 ...">Discontinued</span>` from `paint-detail.tsx` into the new component.
- Accept an optional `size?: 'sm' | 'md'` prop (small for `PaintCard`, default `md` for `PaintDetail`).
- JSDoc the component.

Update `paint-detail.tsx` to render `<DiscontinuedBadge />` in place of the inline span.

### 2. Add the badge to `PaintCard`

Edit `src/modules/paints/components/paint-card.tsx`:

- Add `isDiscontinued?: boolean` prop (default `false`).
- When `true`, render `<DiscontinuedBadge size="sm" />` over the swatch (top-right) or as a small chip below the name. Keep it visually distinct without breaking the card grid.

Then update each call-site that has access to the discontinued flag to pass it through. The current call-sites are:

- `src/modules/paints/components/paint-references.tsx` — has `ref.related_paint.is_discontinued`.
- `src/modules/paints/components/paginated-paint-grid.tsx` and other grids — check whether `PaintWithBrand` already exposes the flag (it does, via the `Paint` row spread).

The change is additive (default `false`), so unrelated call-sites are safe to leave for a follow-up.

### 3. Service layer

Create `src/modules/paints/services/discontinued-service.ts`:

- `createDiscontinuedService(supabase)` factory.
- `listDiscontinuedPaints({ limit, offset })` — selects `*, product_lines(brands(*))` where `is_discontinued = true`, ordered by name, paginated.
- `countDiscontinuedPaints()` — `count: 'exact', head: true` with `eq('is_discontinued', true)`.

Add `discontinued-service.server.ts` wrapper.

Acceptable alternative: add both methods to the existing `paint-service.ts`. Pick one — duplication across services is the worse outcome.

### 4. `usePaintSubstitutes` hook + `PaintSubstitutes` component

`src/modules/paints/hooks/use-paint-substitutes.ts` — `'use client'`:

```ts
export function usePaintSubstitutes(params: {
  sourcePaintId: string
  defaultLimit?: number
  initialMatches?: PaintMatch[]
}): {
  matches: PaintMatch[]
  selectedBrandIds: string[]
  setSelectedBrandIds: (ids: string[]) => void
  isPending: boolean
  error: Error | null
}
```

Responsibilities:

- Owns `selectedBrandIds: string[]` (empty = all brands) and `matches: PaintMatch[]` (seeded from `initialMatches` if provided).
- On `selectedBrandIds` change, calls `findPaintMatches(sourcePaintId, { excludeDiscontinued: true, excludeSamePaint: true, excludeSameBrand: false, brandIds: selectedBrandIds.length ? selectedBrandIds : undefined, limit })` inside a `useTransition` to drive `isPending`.
- Skips the initial fetch if `initialMatches` is supplied **and** `selectedBrandIds` is empty — this is the SSR-pre-resolved path used by the `/discontinued` listing rows.
- Captures errors in `error` state for the component to surface.

`SubstitutePaintCard` (`src/modules/paints/components/substitute-paint-card.tsx`):

- Props: `match: PaintMatch`. Composes `PaintCard` with a `ΔE x.x` caption below — keeps `PaintCard` unchanged.

`PaintSubstitutes` (`src/modules/paints/components/paint-substitutes.tsx`) — `'use client'`:

- Props: `sourcePaintId: string`, `sourceBrandId: string`, `brands: Brand[]` (so the dropdown doesn't have to fetch on the client), `defaultLimit?: number` (default 5), `initialMatches?: PaintMatch[]`.
- Component body is a hook call + JSX, ~25 lines:

  ```tsx
  const { matches, selectedBrandIds, setSelectedBrandIds, isPending, error } =
    usePaintSubstitutes({ sourcePaintId, defaultLimit, initialMatches })
  ```

- Render:
  - Section header "Substitutes".
  - Brand filter: Radix `Select` (single brand for v1) using `src/components/ui/select.tsx`. An "All brands" option clears `selectedBrandIds`.
  - A grid of `<SubstitutePaintCard match={m} />`.
- Skeleton from `src/components/ui/skeleton.tsx` while `isPending` and `matches.length === 0`.

### 5. Wire substitutes into `PaintDetail`

Edit `src/modules/paints/components/paint-detail.tsx`:

- After the existing detail body, render:

  ```tsx
  {paint.is_discontinued && (
    <PaintSubstitutes
      sourcePaintId={paint.id}
      sourceBrandId={String(brand.id)}
      brands={brands}
    />
  )}
  ```

- This means `PaintDetail` needs a new `brands` prop (an array of `Brand`). Fetch it in `src/app/paints/[id]/page.tsx` via `getAllBrands` and pass it through. Only fetched when the paint is discontinued — gate the call with `paint.is_discontinued`.

### 6. `/discontinued` route

`src/app/discontinued/page.tsx` — thin SSR shell:

1. Read `searchParams` (`page`, `size`) — same pattern as `src/app/paints/page.tsx`.
2. Fetch in parallel:
   - `listDiscontinuedPaints({ limit, offset })`
   - `countDiscontinuedPaints()`
   - `getAllBrands()`
3. Once the paint list resolves, call `findMatchesForPaints(paints.map(p => p.id), { limit: 3 })` (feature 00's bulk action) to pre-resolve every row's substitutes server-side — no client round-trips during paint listing render.
4. Render `<Main>` with `PageHeader` ("Discontinued Paints", subtitle = total count), `Breadcrumbs`, and `<DiscontinuedPaintListing paints={paints} substitutes={substitutes} totalCount={count} page={page} size={size} brands={brands} />`.
5. Add `export const metadata` using `pageMetadata`.

`src/modules/paints/components/discontinued-paint-listing.tsx`:

- Props: `paints`, `substitutes: Record<string, PaintMatch[]>`, `totalCount`, `page`, `size`, `brands`.
- Renders each row as: source paint (large card / inline summary) on the left, substitutes grid on the right.
- Each row instantiates `<PaintSubstitutes sourcePaintId={p.id} sourceBrandId={...} brands={brands} defaultLimit={3} initialMatches={substitutes[p.id] ?? []} />`. The hook skips its initial fetch because `initialMatches` is supplied and the brand filter starts empty.
- `PaginationControls` at the bottom — reuse the existing one.

> Performance: SSR pre-resolution via `findMatchesForPaints` keeps the listing render free of client round-trips. The brand-filter dropdown still hot-fetches on change (intentional — that's a user-initiated action and warrants the loading state). If feature 00's bulk action isn't ready, the listing can ship by passing no `initialMatches`, in which case each row fires its own action via `usePaintSubstitutes` on mount — acceptable for v1 because pagination caps N (e.g. 20 per page).

### 7. Loading and metadata

- `src/app/discontinued/loading.tsx` — skeleton page mirroring `src/app/paints/loading.tsx`.
- Add discontinued page to `src/app/sitemap.ts` if the project lists static routes there (check existing entries; otherwise skip).

## Order of Operations

1. Extract `DiscontinuedBadge`.
2. Update `PaintCard` to render the badge + propagate from call-sites.
3. `discontinued-service.ts` + `.server.ts`.
4. `SubstitutePaintCard` wrapper.
5. `usePaintSubstitutes` hook.
6. `PaintSubstitutes` component (thin renderer over the hook).
7. Wire `PaintSubstitutes` into `PaintDetail` (requires `brands` prop and route-page fetch).
8. `/discontinued` route + `DiscontinuedPaintListing` (uses `findMatchesForPaints` bulk action for SSR pre-resolution).
9. Loading + sitemap entry.

## Notes

- Substitutes exclude other discontinued paints by default — that is the headline use case. The engine still supports `excludeDiscontinued: false` for a future "all-time alternates" view if requested.
- The "exclude same brand" default (`true` in `MatchOptions`) is the right default for cross-brand substitutes. If a user wants Citadel-to-Citadel substitutes within the same brand they can filter to that brand explicitly (the engine's `brandIds` filter overrides `excludeSameBrand` semantically — confirm this contract in the engine implementation).
- Community-sourced substitute suggestions remain a future epic and are out of scope here.
- Metallic / discontinued substitutes are not specially weighted; the UI may add a chip beside the ΔE score for metallics.
