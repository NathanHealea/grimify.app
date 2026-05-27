# Reactive Hue Filter Counts on the Paint Explorer

**Epic:** Paint Data & Search
**Type:** Enhancement
**Status:** Todo
**Branch:** `enhancement/reactive-hue-filter-counts`
**Merge into:** `main`

## Summary

Today the paint count rendered next to every option in the `HueFilterBar` (parent hues and, when a parent is selected, child hues) is **static**: it shows the total number of paints assigned to that hue across the entire library, regardless of the user's current free-text query or any other active filter. When a user searches for `"red"` or applies a brand filter, those counts do not move — so the user has no way to know how many paints they would actually see if they picked a different hue from that narrowed set.

This enhancement makes the hue counts **react to the current search query and every other active filter** on the explorer. Picking the Red parent hue while a `q=metallic` query is active should show the user that, say, only 8 of the Red hue's paints would survive the narrowing — not the 245 reds in the catalogue at large. The same rule applies to child hues when a parent is selected.

The hue facet follows the same OR-within-dimension, AND-across-dimensions facet-count contract that `10-paint-explorer-filters.md` proposes for brand, paint-type, product-line, discontinued, and metallic.

User request (verbatim, with typos preserved): *"When searching for a color, or filter by a group, update the color in the numbers in the hue selects."*

## Why now

- The hue filter is the **primary narrowing tool** on `/paints`. Static counts make it lie to the user the moment any other filter is active.
- The catalogue is large enough (6,000+ paints across 10+ brands) that the static count "245 paints in Red" is unhelpful once `q=red` is typed or a brand is picked.
- The in-flight filters feature (`10-paint-explorer-filters.md`) already introduces the exact machinery this enhancement needs — `getPaintFacetCounts` action plus a `useFacetCounts` hook. Extending that contract to also return hue facets is the minimal, consistent move.
- The companion features in the epic — list view (`12`) and sort (`11`) — are most useful when the user can confidently navigate the narrowing dimensions. Counts that lie undermine the whole filter surface.

## Scope of "reactive"

A hue option's count is recomputed against **the current set of every other active narrowing dimension**, holding the hue dimension itself out. Concretely:

| Dimension | Included in hue count narrowing? |
|---|---|
| Free-text query (`q`) | **Yes** |
| Brand (from filters plan 10) | **Yes** |
| Paint type (from filters plan 10) | **Yes** |
| Product line (from filters plan 10) | **Yes** |
| Discontinued tri-state (from filters plan 10) | **Yes** |
| Metallic boolean (from filters plan 10) | **Yes** |
| **Currently selected parent hue** | **No** (held out — see rule below) |
| **Currently selected child hue** | **No** (held out — see rule below) |

### OR-within-dimension hold-out rule

The hue dimension is **excluded from its own narrowing** when computing per-option hue counts. If we did not hold the dimension out, selecting `hue=red` would zero out every other parent hue option in the bar (because no paint is in two top-level hues at once), which would make the filter unusable — the user could never see what swapping to a different hue would yield.

This is the same hold-out rule the filters plan applies to brand/type/line. It is what makes facet counts meaningful: each option's count answers the question *"if I picked this option (replacing the current selection in this dimension), what would I see?"*.

Implementation consequence: when computing the parent-hue counts map, the service must compute each count **without** the current parent-hue and child-hue selections in the filter set. Same for child-hue counts.

### Empty hue handling

When the narrowed set yields **zero paints** for a hue option, the option **stays visible** but shows `0` and is rendered in a muted/de-emphasised style (current `HueCard` styling already supports a low-count visual; we follow the same convention as `PaintFilterPopover` in plan 10's "list shows option name · paint count per row" rule).

Reasoning: hiding zero-count options would cause the bar to reflow on every keystroke during search — distracting and surprising. Visible-but-muted preserves the discoverability of the dimension while honestly signalling "there's nothing here under your current narrowing."

The hue option remains **clickable** at zero. Clicking it commits the selection to the URL exactly as today; the result region will then render the empty-state panel that plan 10 introduces (no paints match → muted-border panel + Clear All button). This is consistent with how plan 10 handles zero-count brand/type rows in their popovers.

## Coordination with the filters plan (10)

This enhancement **depends on** `10-paint-explorer-filters.md` landing first. Plan 10 introduces the entire facet-count surface (`getPaintFacetCounts` service method, `getPaintFacetCounts` server action, `useFacetCounts` hook, `PaintFacetCounts` type). This enhancement extends that surface to cover hue facets too.

### Recommendation: extend `getPaintFacetCounts` (do not ship `getHueFacetCounts`)

When implementing, **extend the existing `getPaintFacetCounts` action and service method** to also return hue + child-hue counts, rather than adding a separate `getHueFacetCounts` action. Reasoning:

1. **One network round-trip per filter change.** The client already calls `getPaintFacetCounts` on every filter/search change (via `useFacetCounts`). Putting hue counts into the same response means no second round-trip and no risk of the hue counts arriving out of order with the brand/type/line counts.
2. **Consistent contract.** Every facet dimension lives in one type (`PaintFacetCounts`), one service method, one action, one hook. A future facet (saturation range, owned-only, etc.) follows the same pattern.
3. **Shared abort + cancellation.** `useFacetCounts` (plan 10) already uses an `AbortController` to drop stale requests when the user types or clicks quickly. Hue counts inherit that behaviour for free.
4. **Shared SSR prefetch path.** The route page (plan 10's `src/app/paints/page.tsx` change) already pre-fetches an initial `PaintFacetCounts` snapshot. Adding hue/child-hue maps to that same call eliminates a second SSR fetch on first paint.

### Sequencing

- **If plan 10 has not yet landed when this is picked up:** the implementer of this plan extends plan 10's surface in place. They do **not** create a parallel hue-only action or hook. The two plans share file ownership of `paint-facet-counts.ts` (type), `paint-service.ts` (service method), `get-paint-facet-counts.ts` (action), and `use-paint-facet-counts.ts` (hook). Whoever lands second appends the hue fields to the shared shape.
- **If plan 10 has already landed:** this enhancement is a pure extension of the existing contract — add two keys to `PaintFacetCounts`, two args to the service method, and two consumers in `PaintExplorer`.

Mirror this coordination wording with the sequencing notes in plans 11 (sort) and 12 (list view).

## Service signature change

The `getPaintFacetCounts` method introduced in plan 10 currently has a filter argument shape roughly like:

```ts
getPaintFacetCounts(filters: {
  query?: string
  hueIds?: string[]
  brandIds?: number[]
  paintTypes?: string[]
  productLineIds?: number[]
  discontinued?: 'include' | 'exclude' | 'only'
  metallicOnly?: boolean
}): Promise<PaintFacetCounts>
```

This enhancement extends both the **input** and the **output**:

### Input — split hue into "parent" and "child"

The single `hueIds?: string[]` arg from plan 10 conflates parent vs child selection. To compute hue counts correctly with the hold-out rule, the service needs to know **which dimension** the IDs represent so it can exclude the entire hue dimension when computing hue counts. Replace `hueIds` with two explicit args:

```ts
getPaintFacetCounts(filters: {
  query?: string
  parentHueId?: string                 // top-level hue UUID, optional
  childHueId?: string                  // child hue UUID, optional
  brandIds?: number[]
  paintTypes?: string[]
  productLineIds?: number[]
  discontinued?: 'include' | 'exclude' | 'only'
  metallicOnly?: boolean
}): Promise<PaintFacetCounts>
```

When computing **parent-hue counts**: drop both `parentHueId` and `childHueId` from the filter set, then for each top-level hue compute a count with `hue_id ∈ (children of that parent)` ANDed against all remaining filters.

When computing **child-hue counts**: drop `childHueId` (but keep `parentHueId` because the child list is by definition gated on a parent selection — children of the currently-selected parent only). For each child of the selected parent compute a count with `hue_id = thisChild.id` ANDed against the remaining filters.

When computing **brand/type/line counts**: keep the hue filter active (parent and child both contribute), holding out only the dimension being counted. This is the existing plan-10 behaviour with the parent/child split applied.

### Output — add hue maps

Extend `PaintFacetCounts` (defined in plan 10's `src/modules/paints/types/paint-facet-counts.ts`):

```ts
export type PaintFacetCounts = {
  brand: Record<string, number>     // existing, keyed by brand.id
  type: Record<string, number>      // existing, keyed by lowercased paint_type
  line: Record<string, number>      // existing, keyed by product_line.id
  hue: Record<string, number>       // NEW — keyed by lowercased top-level hue name
  childHue: Record<string, number>  // NEW — keyed by lowercased child hue name; populated only when parentHueId is set
}
```

Keying by **lowercased name** (not ID) for hue/childHue mirrors today's `huePaintCounts: Record<string, number>` shape that `HueFilterBar` already consumes — keeps the client-side change a one-line prop swap rather than a key migration. The route page already lowercases hue names when building the static map (`src/app/paints/page.tsx:95`).

When **no parent is selected**, `childHue` is `{}` (empty record). The client only renders child pills when `childHues.length > 0` anyway.

## Performance

`useFacetCounts` (plan 10) already implements:

- **AbortController cancellation** — every filter / search change cancels the in-flight count fetch.
- **Last-request-wins semantics** — late responses for stale URLs are discarded.
- **SSR seeding** — `initialCounts` from props prevents a flash of zero on first paint.

Adding hue + childHue to the response makes the service method do **two more count loops** (parent hues, then optionally child hues of the selected parent). Each loop is the same `count: 'exact', head: true` pattern plan 10 already uses for brand/type/line, run in parallel via `Promise.all`. The hue loops piggyback on the existing single round-trip — no extra network call from the client.

Order-of-magnitude impact on the server side:

| Dimension being counted | # of count queries |
|---|---|
| Brand (per option) | ~10–15 |
| Paint type (per option) | ~10–25 |
| Product line (per option, brand-gated) | ~5–30 |
| **Parent hue (per option)** — new | ~7–12 (top-level Itten/Munsell hues) |
| **Child hue (per option, when parent selected)** — new | ~3–8 (children of the active parent) |

All run in parallel. The server-side wall-clock latency is dominated by the slowest single count, not the sum. If profiling shows the additional hue counts measurably regress the facet-count latency, the same fallback plan 10 documents applies: flip to a client-side aggregate narrowing strategy without changing the URL contract or the component API.

The user-facing `HueFilterBar` already uses the existing `huePaintCounts` and `childHuePaintCounts` props with no Loading state — counts just update when new ones arrive. This enhancement preserves that ergonomics: a brief render with stale (or SSR-seeded) counts, then an opaque swap once the facet fetch settles.

## Initial / SSR counts

Today (`src/app/paints/page.tsx:92-98`) the route page pre-fetches static counts via `getPaintCountByHueGroup` per hue, builds `Record<string, number>`, and passes it as `huePaintCounts`. The first paint of HTML therefore always shows the static counts even when the URL has `?q=…` or `?hue=…` — slight UI lie that the client never corrects today.

After this enhancement, the route page pre-fetches the same `PaintFacetCounts` snapshot plan 10 introduces, parameterised with the URL state's full filter context, **including the URL-derived hue selection**. The hue and childHue entries on that snapshot are the SSR-correct, narrowed counts. They are passed as the `initialFacetCounts` prop into `PaintExplorer` (the same prop name plan 10 uses for brand/type/line), and `useFacetCounts` seeds its first render from that snapshot.

Result: on first paint, the hue bar shows the correct narrowed counts for the URL — no flash of stale full-library counts.

The legacy `huePaintCounts` and `getPaintCountByHueGroup` route-page calls become **redundant** once `PaintFacetCounts.hue` carries the same data. The route page should:

- **If plan 10 has already landed:** remove the separate `huePaintCounts` calculation and stop passing `huePaintCounts` as a prop. The `PaintExplorer` reads hue counts from the facet-counts hook.
- **If plan 10 has not yet landed (i.e. this ships first):** keep the `huePaintCounts` prop for backwards compatibility during the overlap window, and have `PaintExplorer` merge the SSR-seeded value with whatever the facet hook returns once mounted. Plan 10 then removes the legacy prop when it lands.

Either ordering converges on the same end state. The point is the implementer should not invent a new round-trip for hue counts — they should ride the existing facet pre-fetch.

## URL state contract

**Unchanged.** This enhancement does not introduce any new URL keys. The existing `hue=parent[,child]` contract already carries the parent + child selection; the service method splits that into `parentHueId` + `childHueId` purely as an internal arg shape.

## UX & component design

### `HueFilterBar`

**Unchanged in markup.** The bar already renders one pill per parent hue (with count) and, when a parent is selected, one pill per child hue (with count). This enhancement only changes the **source** of the count numbers — they come from `PaintFacetCounts.hue` and `.childHue` instead of from the SSR `huePaintCounts` map plus the on-mount `useHueFilter` child-count fetch.

### `useHueFilter`

The hook currently fetches child hues **and** their counts when a parent is selected (`use-hue-filter.ts:68-99`). After this enhancement, the **count fetching half is removed** — counts come from the shared `useFacetCounts` hook instead. The hook keeps its existing responsibility for fetching the **list of child hues** (the names + IDs of children of the selected parent), since that is structural data the facet-counts service does not return.

This trims one of `useHueFilter`'s side effects but leaves its public API intact except for one prop: `childHuePaintCounts` moves off the hook return type, and `HueFilterBar` reads child counts directly from `PaintFacetCounts.childHue` via the `PaintExplorer` smart container.

### Visual de-emphasis of zero counts

When a hue option's count is `0`, render the existing `HueCard` / `ChildHueCard` with the muted style already used for low counts elsewhere in the app. Concretely:

- Add a `data-empty="true"` attribute (or equivalent prop) when count is `0`.
- Style with `opacity-60` and the existing muted-foreground tokens.
- Keep the swatch and label fully readable (don't blur the colour) so the user can still recognise the hue.
- The pill remains clickable. Clicking commits the selection, which then yields the explorer's zero-result empty state (introduced in plan 10).

If `HueCard` / `ChildHueCard` do not currently expose a low-count visual prop, add one as part of this enhancement — small surface area, no breaking change.

## Domain module scope

Contained inside the existing **`paints`** module. No new modules. No code added under `src/app/` beyond updating the route page.

### Affected files

| # | File | Role | Change |
|---|------|------|--------|
| 1 | `src/modules/paints/types/paint-facet-counts.ts` | type (shared with plan 10) | **Extend** the `PaintFacetCounts` type with `hue: Record<string, number>` and `childHue: Record<string, number>`. JSDoc the new fields with the keying convention (lowercased hue name) and the empty-state rule (`childHue` is `{}` when no parent is selected). |
| 2 | `src/modules/paints/services/paint-service.ts` | service (shared with plan 10) | **Extend** `getPaintFacetCounts` to: (a) accept `parentHueId?` and `childHueId?` in place of the conflated `hueIds?` arg from plan 10; (b) compute parent-hue counts by holding the entire hue dimension out (drop both IDs) and looping over `topLevelHues` with `hue_id ∈ (children of parent)` ANDed against remaining filters; (c) compute child-hue counts (only when `parentHueId` is set) by holding `childHueId` out and looping over children of the parent; (d) return both maps on the result. Run in `Promise.all` with the existing brand/type/line loops so wall-clock latency is unchanged. |
| 3 | `src/modules/paints/actions/get-paint-facet-counts.ts` | action (shared with plan 10) | Forward the new `parentHueId` / `childHueId` args through to the service. |
| 4 | `src/modules/paints/hooks/use-paint-facet-counts.ts` | hook (shared with plan 10) | Accept `parentHueId?` and `childHueId?` in the params object. Add them to the `useEffect` deps. No other logic change — the abort/SSR-seed behaviour from plan 10 covers hue counts automatically. |
| 5 | `src/modules/paints/hooks/use-hue-filter.ts` | hook | **Remove** the in-hook fetching of `childHuePaintCounts`. Keep the structural child-hue fetch (`hueService.getChildHues(parentId)`). Remove `childHuePaintCounts` from the hook return type. Update JSDoc to reflect that counts now come from the shared facet-counts hook. |
| 6 | `src/modules/paints/components/hue-filter-bar.tsx` | component | No prop shape change — `huePaintCounts` and `childHuePaintCounts` stay on the props. The values passed in now come from `PaintFacetCounts` instead of the legacy SSR map / `useHueFilter` fetch. Add a low-count visual treatment when a count is `0` (muted styling, still clickable). |
| 7 | `src/modules/hues/components/hue-card.tsx` and `child-hue-card.tsx` | hue components | Add a `data-empty` (or equivalent) prop so `HueFilterBar` can flag zero-count pills for muted styling. Visual treatment uses existing muted-foreground tokens — no new CSS file. Skip this change if the existing components already render zero gracefully (verify in implementation). |
| 8 | `src/modules/paints/components/paint-explorer.tsx` | smart container | Pass `parentHueId` / `childHueId` (derived from `hueFilter`) into the `useFacetCounts` call. Read `facetCounts.hue` and `facetCounts.childHue` and pass them as `huePaintCounts` and `childHuePaintCounts` to `HueFilterBar` (instead of the SSR-only static map and `hueFilter.childHuePaintCounts`). Keep using the legacy SSR prop as the initial seed for the first render only. |
| 9 | `src/app/paints/page.tsx` | route page | Replace the per-hue `getPaintCountByHueGroup` loop (`src/app/paints/page.tsx:92-98`) with a single `getPaintFacetCounts({ query, parentHueId, childHueId, ...filters })` call. Pass the resulting `initialFacetCounts` (already a plan-10 prop) into `<PaintExplorer>`. The legacy `huePaintCounts` prop is dropped (or left in place as a transitional alias if plan 10 has not yet landed). |
| 10 | `src/modules/paints/services/paint-service.ts` (optional) | service | After both plans land, optionally deprecate `getPaintCountByHueGroup` if no other caller uses it. Audit with `grep -r "getPaintCountByHueGroup" src/`. Leaving it in place is fine for v1 — removal is a separate small cleanup. |

**Files explicitly NOT touched:** `paint-grid.tsx`, `pagination-controls.tsx`, `use-paint-search.ts`, `use-search-url-state.ts`, `searchPaintsUnified` itself (the underlying search query is unchanged — only the per-option count loops grow).

## Implementation Plan

Phased so each phase is self-contained, ships green types/lint, and can be split into a small PR if scope creeps. Assumes plan 10 (filters) has landed and the facet-count surface exists. If plan 10 has not landed, fold these phases into plan 10's Phase 1 (service & action surface) and Phase 4 (wire into `PaintExplorer` + route page).

### Phase 0 — Confirm plan 10 has landed

**Goal:** verify the prerequisite surface exists before extending it.

1. Confirm the following files exist on `main`:
   - `src/modules/paints/types/paint-facet-counts.ts`
   - `src/modules/paints/services/paint-service.ts` has a `getPaintFacetCounts` method
   - `src/modules/paints/actions/get-paint-facet-counts.ts`
   - `src/modules/paints/hooks/use-paint-facet-counts.ts`
2. If any are missing, switch to **co-implementation mode**: deliver this enhancement's changes as part of plan 10's Phase 1 / Phase 4, mark plan 10's status accordingly, and skip the rest of this phase numbering (the merge of the two plans is mechanical).

### Phase 1 — Extend the data layer

**Goal:** add hue + childHue facets to the shared facet-count surface.

1. In `src/modules/paints/types/paint-facet-counts.ts`, add the two new fields (`hue`, `childHue`). JSDoc per `CLAUDE.md`.
2. In `src/modules/paints/services/paint-service.ts`:
   - Change the `getPaintFacetCounts` signature to accept `parentHueId?: string` and `childHueId?: string` instead of `hueIds?: string[]`. Update internal call sites in the service that previously built `hueIds` from those args, to use the new shape.
   - For **parent-hue counts**: load top-level hues (already cached server-side via `hueService.getHues()`; reuse the same call site, or accept top-level hues as a service-internal helper arg). For each parent, expand to its children's IDs, then count paints with `hue_id ∈ children` ANDed against query / brand / type / line / disc / metal (hue dimension held out). Run in `Promise.all` with brand/type/line loops.
   - For **child-hue counts**: only run when `parentHueId` is set. Load children of the parent (via `hueService.getChildHues(parentHueId)`). For each child, count paints with `hue_id = child.id` ANDed against query / brand / type / line / disc / metal (childHueId held out, parentHueId kept active via its children expansion). Run in the same `Promise.all`.
   - JSDoc the new args and the hold-out rule. Cross-link this doc.
3. In `src/modules/paints/actions/get-paint-facet-counts.ts`, forward the new args through to the service.
4. Verify `npx tsc --noEmit` passes and no other caller of `getPaintFacetCounts` broke.

**Files touched:** 1 type, 1 service, 1 action.

**Verification:** call the action from a temporary route handler with `{ query: 'red', parentHueId: undefined, brandIds: [1] }` and confirm `hue.<red name>` returns a smaller count than `getPaintCountByHueGroup(<red parent id>)`.

### Phase 2 — Hook & smart container plumbing

**Goal:** route the new facet outputs through the explorer.

1. In `src/modules/paints/hooks/use-paint-facet-counts.ts`:
   - Add `parentHueId?: string` and `childHueId?: string` to the params object.
   - Forward them to the action call.
   - Add to the `useEffect` deps.
2. In `src/modules/paints/hooks/use-hue-filter.ts`:
   - Remove the count-fetch half of the parent-change `useEffect` (the inner `Promise.all` that populates `childHuePaintCounts`). Keep the structural `getChildHues` call.
   - Remove `childHuePaintCounts` from the return type and the cleanup branches.
   - Update JSDoc.
3. In `src/modules/paints/components/paint-explorer.tsx`:
   - Pass `parentHueId: hueFilter.selectedParentId` and `childHueId: hueFilter.selectedChildId` into the `useFacetCounts` call.
   - Read `facetCounts.hue` and `facetCounts.childHue` from the hook return.
   - Pass `facetCounts.hue` to `HueFilterBar` as `huePaintCounts` (replacing the SSR-only prop). Pass `facetCounts.childHue` as `childHuePaintCounts` (replacing the `useHueFilter` value).
   - Keep the `huePaintCounts` prop on `PaintExplorer` itself **only as a seed for first render** — gate the swap on whether `facetCounts` has settled. The simplest pattern: derive the displayed counts as `facetCounts.hue ?? props.huePaintCounts` per the `useFacetCounts` SSR-seed contract from plan 10.

**Files touched:** 2 hooks, 1 component.

**Verification:** with the dev server running, type `red` in the search box and watch the parent-hue counts update once the debounced query settles. Confirm that selecting Red parent does **not** zero out the other parent counts (hold-out rule working). Confirm that selecting a brand updates every parent-hue count.

### Phase 3 — Hue card zero-state styling

**Goal:** make zero-count pills visually muted without hiding them.

1. In `src/modules/hues/components/hue-card.tsx` and `child-hue-card.tsx`, add an optional `isEmpty?: boolean` prop (or derive internally from `paintCount === 0`). When true, apply `opacity-60` and the muted-foreground text token to the count badge. Keep the swatch and the label at full opacity so the hue remains recognisable.
2. In `src/modules/paints/components/hue-filter-bar.tsx`, pass `isEmpty={(huePaintCounts[name] ?? 0) === 0}` through to each card. Same for child cards.
3. JSDoc the new prop.

**Files touched:** 2 hue components, 1 filter-bar component.

**Verification:** apply a filter combination that produces zero paints for one specific hue (e.g. `q=metallic&brand=<a brand with no metallic reds>`). Confirm Red pill renders with the muted style at `0` and stays clickable. Click it; confirm the explorer's empty-state panel renders.

### Phase 4 — Route page wiring

**Goal:** SSR-seed reactive counts so first paint matches the URL.

1. In `src/app/paints/page.tsx`:
   - Replace the per-hue `getPaintCountByHueGroup` loop (currently `lines 92-98`) with a single `paintService.getPaintFacetCounts({ query, parentHueId: parentHue?.id, childHueId: <derived child UUID>, ...filters from URL })` call. The `...filters from URL` part is whatever plan 10 already passes; this phase just adds the hue args.
   - Pass the resulting facet counts as `initialFacetCounts` to `<PaintExplorer>` (the prop plan 10 introduced).
   - **If plan 10 has not yet landed**, also keep the legacy `huePaintCounts` prop for transitional backwards-compat: derive it from `initialFacetCounts.hue` so there's a single source of truth.
2. Drop the redundant `Promise.all([hueService.getHues()])` array wrapping if it has no other branches. Cosmetic.
3. Confirm the `getPaintCountByHueGroup` import can be removed from the route page if no other caller remains. Run `grep -r "getPaintCountByHueGroup" src/` and update accordingly.

**Files touched:** 1 route page.

**Manual verification:**

- Open `/paints?q=red&hue=red` directly in a fresh browser tab. The first paint of HTML must already show the narrowed parent + child hue counts — no flash of stale full-library numbers.
- View source on the rendered HTML; the count badges in the hue pills should match what would be there post-hydration.
- Back / Forward across a sequence of hue selections should retrace correctly with each step showing the right counts at that URL state.

### Phase 5 — Cleanup & docs

1. JSDoc every new arg / field per `CLAUDE.md`.
2. Verify zero new `tsc --noEmit` or `npm run lint` errors.
3. If `getPaintCountByHueGroup` has no remaining callers, mark it deprecated in JSDoc (do not delete in this PR — that's a separate cleanup to keep this enhancement small).
4. Update this doc's status: `Todo` → `In Progress` → `Completed`.
5. Add a short cross-link in `10-paint-explorer-filters.md`'s "Out of Scope" or "Coordination" section noting that hue reactive counts are now covered by this enhancement.

## Acceptance Criteria

- [ ] Typing a query that narrows the result set updates every parent-hue count in `HueFilterBar` once the debounced query settles.
- [ ] Toggling a brand (or any other non-hue filter from plan 10) updates every parent-hue count.
- [ ] Selecting a parent hue updates every **child-hue** count for that parent (held-out child) but does **not** zero out the other parent-hue counts.
- [ ] Selecting a child hue does not zero out its sibling child counts.
- [ ] Counts are computed against the AND-across-dimensions filter set, holding the hue dimension out (parent and child both held out when computing parent counts; child held out, parent kept active via its children's IDs when computing child counts).
- [ ] A hue option with zero matching paints renders with a muted visual treatment but remains visible and clickable.
- [ ] Clicking a zero-count hue commits the selection to the URL and renders the explorer's empty-state panel (plan 10's empty-state contract).
- [ ] Visiting `/paints?q=…&hue=…&brand=…` directly hydrates with the correct narrowed hue counts on first paint — no flash of stale full-library counts.
- [ ] Back / Forward retraces the count state correctly across navigation.
- [ ] The legacy `huePaintCounts` prop is either removed from `PaintExplorer` or is sourced from the same facet-counts call (single source of truth).
- [ ] `useHueFilter` no longer fetches child paint counts (it only fetches the structural list of child hues).
- [ ] `PaintFacetCounts.hue` and `.childHue` exist on the shared type and are populated by `getPaintFacetCounts`.
- [ ] No new TypeScript or lint errors.
- [ ] All new exports / new args have JSDoc per `CLAUDE.md`.

## Risks & Considerations

- **Coupling to plan 10.** This enhancement assumes plan 10's `getPaintFacetCounts` surface exists. If the implementer picks this up before plan 10 has landed, they must extend plan 10's plan in place rather than building a parallel hue-only path. Failing to do so creates two near-duplicate facet-count actions, hooks, and SSR fetches — exactly the situation the coordination section is designed to prevent.
- **Service method arg shape change.** Replacing `hueIds?: string[]` with `parentHueId? + childHueId?` is a breaking change to plan 10's in-flight signature. If plan 10 has already shipped, this is a one-call-site migration inside the service and route page; if plan 10 has not shipped, the implementer of this plan revises plan 10's drafted signature directly. Either way, audit call sites with `grep -r "getPaintFacetCounts" src/` and update synchronously.
- **Two more count loops per facet fetch.** Each filter / search change now runs ~7–20 additional `count: 'exact', head: true` queries (parent hues + optionally child hues). They run in parallel with the existing brand/type/line loops, so wall-clock latency is bounded by the slowest single query, not the sum. If perf testing flags this, the plan-10 fallback to a client-side aggregate (strategy B) still applies and covers hue counts automatically.
- **SSR-correctness on first paint.** The route page must pass the URL-derived parent + child hue IDs into the SSR `getPaintFacetCounts` call. If those are accidentally dropped, the first paint will show full-library hue counts that then jump to narrowed counts post-hydration — visible flash. Add this to manual verification.
- **`useHueFilter` API shrinkage.** Removing `childHuePaintCounts` from the hook return is a breaking change for any consumer outside the explorer. `grep -r "useHueFilter\|childHuePaintCounts" src/` — at the time of this plan the only consumer is `PaintExplorer`, so this is contained. If new consumers appear before implementation, fold them into the migration.
- **`HueCard` / `ChildHueCard` zero-state styling.** Verify the existing components render `0` gracefully today; if they hide or special-case zero in surprising ways, that affects how the new muted-but-visible treatment lands. Worth a short visual inspection in Phase 3 before adding the prop.
- **Filter ordering across plans.** The merge order with plans 10, 11, and 12 matters only for `paint-explorer.tsx` line conflicts. The URL contract is unchanged here. Plan 10 sets up the facet hook; plans 11 and 12 add `sort`/`dir`/`view` URL keys; this plan changes neither. Whoever lands last re-threads the call into the `useFacetCounts` invocation — a mechanical merge.
- **Empty `childHue` map.** When no parent is selected, `PaintFacetCounts.childHue` is `{}`. Code reading from it (`childHuePaintCounts[name] ?? 0`) is safe by construction, but document the convention in the type's JSDoc so future readers don't add a defensive null check.
- **Service exports `parentHueId` UUIDs in the args.** The route page derives `parentHueId` by matching the URL's `hue=` name segment against `topLevelHues`. If a stale link references a renamed hue, the parent lookup returns undefined and the service computes counts as if no parent were selected — which is the correct degraded behaviour. No new error path needed.
- **No new tests.** The project has no test framework configured (`CLAUDE.md` → `## Testing`), so verification is manual per the phase checklists.

## Out of Scope

- **Switching to a client-side aggregate (strategy B from plan 10) for hue counts only.** If perf testing requires it, the switch covers every dimension at once — not just hue. Tracked as a follow-up against plan 10.
- **Hiding zero-count hue options.** Considered and rejected (reflow churn during search). Always-visible-but-muted is the v1 behaviour.
- **Animated count transitions.** Counts swap in place when the facet fetch settles. No tween / spring on the number change in v1.
- **Reactive counts in the navbar paint search dropdown.** The navbar uses a separate, narrower surface (`09-navbar-paint-search.md`) without filters; reactive hue counts there would be a no-op.
- **Reactive counts on `/collection`, `/wheel`, or any other paint surface.** Those pages have different filter contracts; out of scope here.
- **Removing the deprecated `getPaintCountByHueGroup` service method.** Done as a separate cleanup once no callers remain.
- **Tests.** No test framework configured; verification is manual.
