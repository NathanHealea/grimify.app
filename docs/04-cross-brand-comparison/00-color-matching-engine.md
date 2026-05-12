# Color Distance Algorithm and Matching Engine

**Epic:** Cross-Brand Comparison
**Type:** Feature
**Status:** Todo
**Branch:** `feature/color-matching-engine`
**Merge into:** `main`

## Summary

Promote and extend the existing CIE76 ΔE utilities (`hexToLab`, `deltaE76`, `rankPaintsByDeltaE`) into a first-class **match engine** that powers cross-brand comparison and substitute discovery. The engine takes a source paint and returns the N closest perceptual matches across the catalog, with optional filters for brand, product line, and discontinued status.

## Acceptance Criteria

- [ ] A color distance function computes perceptual similarity between two paints in CIE L\*a\*b\* space (reuses the existing `deltaE76` / `hexToLab` utilities — no new color-space math).
- [ ] Given a paint ID, a server action returns the N closest matches from the catalog as `RankedPaint[]` (paint + deltaE).
- [ ] Matching can be scoped:
  - `excludeDiscontinued: boolean` — drop discontinued paints from results (default `true`).
  - `excludeSamePaint: boolean` — drop the source paint from results (default `true`).
  - `excludeSameBrand: boolean` — drop paints from the source paint's brand (default `true` — cross-brand is the headline use case).
  - `brandIds?: string[]` — when present, restrict candidates to those brands.
  - `limit: number` — number of results (default 10, max 50).
- [ ] Results are ranked by ΔE ascending and include the ΔE score for display.
- [ ] Engine is exposed via a server action so the comparison page and substitute section can call it without shipping the catalog to the browser.
- [ ] JSDoc on every exported type, function, and action per `CLAUDE.md`.
- [ ] `npm run build` and `npm run lint` pass with no errors.

## Domain Module

This feature lives in `src/modules/paints/` because the engine ranks **paints**, not raw colors — its inputs and outputs are paint records, and it consumes the existing `paint-service` for candidate fetching. The reusable color math (`hexToLab`, `deltaE76`) stays in `src/modules/color-wheel/utils/` where it already lives; we do not create a new `src/modules/color/` module.

## Existing Building Blocks (Reuse, Do Not Recreate)

| Utility / type                                                          | Path                                                                          | Role in this feature                                  |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------- |
| `hexToLab(hex)` → `Lab`                                                 | `src/modules/color-wheel/utils/hex-to-lab.ts`                                 | sRGB → Lab conversion (D65 illuminant).               |
| `deltaE76(a, b)`                                                        | `src/modules/color-wheel/utils/delta-e76.ts`                                  | CIE76 ΔE — fast, monotone enough for ranking.         |
| `rankPaintsByDeltaE(targetHex, paints, limit)`                          | `src/modules/palettes/utils/rank-paints-by-delta-e.ts`                        | Already ranks `ColorWheelPaint[]` by ΔE with a Lab cache. |
| `ColorWheelPaint`                                                       | `src/modules/color-wheel/types/color-wheel-paint.ts`                          | Lightweight paint projection with brand info.         |
| `getColorWheelPaints()` / `listColorWheelPaintsByHueGroup()`            | `src/modules/paints/services/paint-service.ts`                                | Catalog fetch (already paginates past PostgREST's 1000-row cap). |
| `is_discontinued` column                                                | `supabase/migrations/20260413000000_create_paint_tables.sql`                  | Discontinued flag — already exists with an index.     |

**Decision:** CIE76 (already in use) is kept rather than upgrading to CIEDE2000. CIE76 is cheap and monotone-enough for ranking same-/neighbouring-hue candidates; the rest of the app (palette swap) already uses it, so cross-brand comparison should match. The original doc's preference for CIEDE2000 is noted but explicitly deferred — switching the function under `rankPaintsByDeltaE` is a one-file change if needed later.

## Key Files

| Action | File                                                                          | Description                                                                                                |
| ------ | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Move   | `src/modules/palettes/utils/rank-paints-by-delta-e.ts` → `src/modules/paints/utils/rank-paints-by-delta-e.ts` | Promote shared utility out of the palettes module. Update the one import in `palette-swap-dialog.tsx`. |
| Create | `src/modules/paints/types/match-options.ts`                                   | `MatchOptions` type (filter knobs).                                                                        |
| Create | `src/modules/paints/types/paint-match.ts`                                     | `PaintMatch` type — `{ paint: ColorWheelPaint; deltaE: number }` (re-exported alias of `RankedPaint`).     |
| Create | `src/modules/paints/services/match-service.ts`                                | `createMatchService(supabase)` with `findMatchesForPaint(paintId, options)` and `findMatchesForPaints(paintIds, options)`. Builds on `paint-service`. |
| Create | `src/modules/paints/services/match-service.server.ts`                         | Server wrapper analogous to `paint-service.server.ts`.                                                     |
| Create | `src/modules/paints/actions/find-paint-matches.ts`                            | `'use server'` action wrapping `findMatchesForPaint` — the public entrypoint for the UI.                   |
| Create | `src/modules/paints/actions/find-matches-for-paints.ts`                       | `'use server'` bulk variant — used by feature 02's `/discontinued` listing to pre-resolve substitutes server-side without N round trips. |
| Modify | `src/modules/color-wheel/utils/delta-e76.ts`                                  | JSDoc only — clarify it is the engine's chosen distance metric. (No behaviour change.)                     |

## Implementation Plan

### Reusable extraction summary

The engine is a service-first feature; this section names every reusable contract it exports so features 01 and 02 can wire to them without re-implementing match logic.

| Kind     | Name                                                | Location                                                | Owner doc | Used by                                                                  |
| -------- | --------------------------------------------------- | ------------------------------------------------------- | --------- | ------------------------------------------------------------------------ |
| Service  | `createMatchService(supabase)`                      | `src/modules/paints/services/match-service.ts`          | 00        | Both `find-paint-matches` and `find-matches-for-paints` actions.         |
| Service  | `findMatchesForPaint(paintId, options)`             | `match-service.ts`                                      | 00        | Feature 01 ("Find similar"), feature 02 (`PaintSubstitutes`).            |
| Service  | `findMatchesForPaints(paintIds, options)`           | `match-service.ts`                                      | 00        | Feature 02 (`/discontinued` SSR pre-resolution).                          |
| Action   | `findPaintMatches(paintId, options)`                | `src/modules/paints/actions/find-paint-matches.ts`      | 00        | Feature 01's `FindSimilarButton` flow, feature 02's `usePaintSubstitutes` hook. |
| Action   | `findMatchesForPaints(paintIds, options)`           | `src/modules/paints/actions/find-matches-for-paints.ts` | 00        | Feature 02's `/discontinued` page SSR.                                    |
| Type     | `MatchOptions`, `PaintMatch`                        | `src/modules/paints/types/`                             | 00        | Both features 01 and 02 — import directly, do not redeclare.             |

This doc is the **canonical owner** of all match-engine surface. Features 01 and 02 must import these names rather than wrapping them in feature-local helpers. The only client-side wrappers around `findPaintMatches` are the React hooks introduced by features 01 (`useFindSimilarPaints`) and 02 (`usePaintSubstitutes`) — those are stateful concerns and rightly live with their callers.

### 1. Promote the ranking utility into the paints module

The existing utility lives under `palettes/utils/` but is paint-agnostic. Move it (preserving its JSDoc) and update the single consumer:

- Move file: `src/modules/palettes/utils/rank-paints-by-delta-e.ts` → `src/modules/paints/utils/rank-paints-by-delta-e.ts`.
- Update import in `src/modules/palettes/components/palette-swap-dialog.tsx` from `@/modules/palettes/utils/rank-paints-by-delta-e` to `@/modules/paints/utils/rank-paints-by-delta-e`.
- No other consumers exist (grep confirms only `palette-swap-dialog.tsx` imports it).

### 2. Add `MatchOptions` and `PaintMatch` types

`src/modules/paints/types/match-options.ts`:

```ts
/**
 * Filters and limits for the cross-brand match engine.
 * Each field is optional with the defaults documented below.
 */
export type MatchOptions = {
  /** Drop discontinued paints from candidates. Default: true. */
  excludeDiscontinued?: boolean
  /** Drop the source paint itself from results. Default: true. */
  excludeSamePaint?: boolean
  /** Drop paints from the source paint's own brand. Default: true. */
  excludeSameBrand?: boolean
  /** When set, restrict candidates to these brand IDs. */
  brandIds?: string[]
  /** Maximum number of matches to return. Default 10, clamped to [1, 50]. */
  limit?: number
}
```

`src/modules/paints/types/paint-match.ts`:

```ts
import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'

/** A candidate match paired with its CIE76 ΔE distance from the source paint. */
export type PaintMatch = {
  paint: ColorWheelPaint
  deltaE: number
}
```

### 3. Build `match-service`

`src/modules/paints/services/match-service.ts`:

- `createMatchService(supabase)` — mirrors the `createPaintService` factory pattern.
- Method `findMatchesForPaint(paintId: string, options?: MatchOptions): Promise<PaintMatch[]>`:
  1. Resolve the source paint via `createPaintService(supabase).getPaintById(paintId)`. If missing → return `[]`.
  2. Compute the candidate pool:
     - If `excludeDiscontinued` (default true) call `getColorWheelPaints()` (already filters `is_discontinued = false`).
     - Otherwise hand-roll a query that mirrors `getColorWheelPaints` but without the `.eq('is_discontinued', false)` filter (DRY this by adding an `includeDiscontinued?: boolean` parameter to `getColorWheelPaints` — single-call change inside `paint-service.ts`).
  3. Filter the pool in memory:
     - Drop source paint when `excludeSamePaint` (default true).
     - Drop paints with `brand_id === source.brand_id` when `excludeSameBrand` (default true).
     - Keep only paints whose `brand_id` is in `brandIds` when that array is non-empty.
  4. Call `rankPaintsByDeltaE(source.hex, filteredPool, clamp(limit, 1, 50))` and return its `RankedPaint[]` as `PaintMatch[]` (the shapes are identical; alias the type).
- Method `findMatchesForPaints(paintIds: string[], options?: MatchOptions): Promise<Record<string, PaintMatch[]>>`:
  1. Fetch the candidate pool **once** (same logic as above).
  2. For each `paintId`, run the same filter + rank pipeline against the shared pool.
  3. Return a map keyed by source `paintId`. Used by feature 02 to render N substitute blocks on the `/discontinued` listing without N round-trips.
- Service is bound to the supabase client; pagination and DB access stay server-side.

`src/modules/paints/services/match-service.server.ts`:

```ts
import { createClient } from '@/lib/supabase/server'
import { createMatchService } from '@/modules/paints/services/match-service'

export async function getMatchService() {
  const supabase = await createClient()
  return createMatchService(supabase)
}
```

### 4. Add the server action

`src/modules/paints/actions/find-paint-matches.ts`:

```ts
'use server'

import { getMatchService } from '@/modules/paints/services/match-service.server'
import type { MatchOptions } from '@/modules/paints/types/match-options'
import type { PaintMatch } from '@/modules/paints/types/paint-match'

export async function findPaintMatches(
  paintId: string,
  options?: MatchOptions,
): Promise<PaintMatch[]> {
  const service = await getMatchService()
  return service.findMatchesForPaint(paintId, options)
}
```

This is the single public entry point for **per-paint** lookups: feature 01 (`/compare`) and feature 02 (substitutes section on `/paints/[id]`) both call this action from the client via React hooks owned by their respective docs.

`src/modules/paints/actions/find-matches-for-paints.ts`:

```ts
'use server'

import { getMatchService } from '@/modules/paints/services/match-service.server'
import type { MatchOptions } from '@/modules/paints/types/match-options'
import type { PaintMatch } from '@/modules/paints/types/paint-match'

export async function findMatchesForPaints(
  paintIds: string[],
  options?: MatchOptions,
): Promise<Record<string, PaintMatch[]>> {
  const service = await getMatchService()
  return service.findMatchesForPaints(paintIds, options)
}
```

Used by feature 02's `/discontinued` route (SSR pre-resolution path) so the listing does not fire N client-side action calls.

### 5. Optional: extend `paint-service.getColorWheelPaints`

Add an optional `{ includeDiscontinued?: boolean }` parameter that omits the `.eq('is_discontinued', false)` filter when `true`. Default behaviour is unchanged. Lets the match engine support the rare case where the caller wants discontinued-vs-discontinued matches without duplicating the paginated query.

## Order of Operations / Dependencies

1. **Step 1 first** — moving the ranking utility is a prerequisite for everything else; doing it last would force two import-rewrite passes.
2. Steps 2–4 are independent files; create them in the order listed.
3. Step 5 only if step 3 actually needs to honour `excludeDiscontinued: false`. The MVP usage from features 01 and 02 always passes `true`, so step 5 can ship as a TODO if time is tight — but feature 01's "Find similar" flow should *not* surface discontinued candidates, so the default-on filter is enough.

## Cross-Doc Dependencies

- Feature **01-comparison-ui.md** calls `findPaintMatches` from its `useFindSimilarPaints` hook (wraps the action with `useTransition` + error state) inside the "Find similar" flow. Pairwise ΔE for the comparison table is computed in-browser by a separate `computePairwiseDeltaE` util (feature 01 owns it) using `hexToLab` + `deltaE76` — it does not call the match service.
- Feature **02-substitute-suggestions.md** calls `findPaintMatches` from its `usePaintSubstitutes` hook on `/paints/[id]` (discontinued detail page) and `findMatchesForPaints` from the `/discontinued` route's SSR fetch.
- Both depend on this feature shipping first. If you must split the work, ship the per-paint action with default options and a stable shape, then layer the UI on top; the bulk action can ship in a follow-up if feature 02's listing initially uses N client calls.

## Key Design Decisions

- **CIE76 over CIEDE2000** — the existing `deltaE76` is monotone-enough for ranking and is already trusted by the palette-swap flow. CIEDE2000 can be swapped under the hood if MVP feedback exposes mis-ranking.
- **Server-side computation** — the action runs in a server action; the catalog never reaches the browser via this code path.
- **In-memory filtering after the catalog fetch** — `getColorWheelPaints` already returns ≤ a few thousand rows; doing `.filter()` then `.sort()` server-side is cheaper than building a parametrised SQL query for every combination of brand / discontinued filters.
- **No precomputed distance matrix or Lab column for v1** — `rankPaintsByDeltaE` already caches Lab values at module scope across calls in the same process. Revisit if the catalog passes ~10k paints.
- **Promote the ranking utility into `modules/paints/`** — it is paint-domain, not palette-domain. The palette swap will keep working via the new import path.

## Notes

- A Delta E value under ~2.0 is generally considered imperceptible. The UI in feature 01 should treat that as a "near duplicate" tier in copy.
- Metallic paints' perceived colour varies with viewing angle; the engine does not special-case them, but the UI can choose to label `is_metallic` matches.
- If/when the catalog grows large enough that fetching every paint per request is slow, add a Postgres-side `paints.lab_l/lab_a/lab_b` column populated by a trigger or the existing `scripts/recalculate-paint-colors.ts` script.
