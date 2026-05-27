# Paint Explorer Compact List View

**Epic:** Paint Data & Search
**Type:** Feature
**Status:** Todo
**Branch:** `feature/paint-explorer-list-view`
**Merge into:** `main`

## Summary

Add a **compact list view** to the public `/paints` explorer alongside the current grid view, with a toggle control that lets users switch between the two. The grid is great for hue scanning (the swatch dominates each tile), but it's poor for catalogue work: at a typical 1080p screen you get ~24 paints per fold (6 columns × 4 rows), and the brand / type metadata is truncated to fit a card.

The list view trades the large swatch for **density and metadata** — many more paints visible per fold, full brand, product line, paint type, hex code, and status badges (Discontinued, Metallic) all on one line. The two views share every other piece of state: filters, sort, search query, hue selection, and pagination. Switching views only changes how rows are rendered — never the underlying result set.

This feature lives entirely inside the existing **`paints`** domain module and composes with the in-flight filters (`10-paint-explorer-filters.md`) and the parallel sort-options feature.

## Why now

- The user explicitly asked for it: "On the paint page, there should be a list view that shows all the colors in a list that is compacted."
- The catalogue has 6,000+ paints across 10+ brands. The grid is optimised for browsing-by-colour; the list is the right primitive for **looking-up-by-name** or **scanning a brand line top-to-bottom**, both of which existing users do today by ignoring the swatches and reading the small text under each card.
- The companion features in flight on this page — filters (brand, paint type, discontinued, metallic) and sort (hue / lightness / contrast) — are most useful in a dense view. Filtering down to "all discontinued Vallejo Game Color layer paints sorted by hue" is hard to scan as 4 rows of cards but trivial as 30 list rows.
- The proposed shared `Swatch` primitive from the cross-domain UI audit (`docs/13-application-improvements/02-cross-domain-ui-audit.md` §4.1, Recommendation R1) needs a real consumer that exercises its smaller sizes (`xs`, `sm`). The list-row swatch (~`size-8` / `size-10`) is exactly that consumer.

## What "compact" means concretely

The list view targets **24–30 px row height** at the default density (8–10 px vertical padding, 14 px line-height text), so a 900-pixel-tall viewport renders **roughly 30 rows** of paints visible before pagination, versus ~12–16 in the grid (counting two stacked rows of cards).

| Token | Value | Tailwind |
|---|---|---|
| Row min-height | 40 px on desktop, 48 px on mobile (denser touch targets) | `min-h-10` / `min-h-12` |
| Vertical padding | 8 px desktop, 10 px mobile | `py-2` / `py-2.5` |
| Horizontal padding | 12 px | `px-3` |
| Swatch size | 32 px | `size-8` (the `Swatch` primitive's `md` size) |
| Name typography | 14 px medium | `text-sm font-medium` |
| Metadata typography | 12 px muted | `text-xs text-muted-foreground` |
| Row gap | 12 px between columns | `gap-3` |
| Row separator | 1 px bottom border | `border-b border-border` |

Hover and focus states reuse the grid's card hover treatment: `hover:bg-muted/40` and `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`.

## UX & component design

### View toggle UI

A new toggle control sits in the **same horizontal row as the existing search input**, immediately before (left of) the Clear All button. It is **always visible** — even when no filters are active — so the affordance is discoverable on first visit.

```
[ search input .................... ] [ Grid | List ] [ Clear All ]
[ FilterBar — Brand · Type · ... ]
[ SortBar — Sort by Hue ▾ ]
[ HueFilterBar — parent pills ]
[ Paint grid OR Paint list ]
[ Pagination ]
```

**Pattern:** A two-button segmented control rendered with the existing `Button` primitive + `btn-outline` styling. The active option gets `btn-primary` (filled). Each button has an icon **plus** a visible text label so the meaning is unambiguous and a screen-reader-only `aria-pressed` flips between `true` / `false`.

| Option | Icon (lucide-react) | Label | `aria-pressed` |
|---|---|---|---|
| Grid view | `LayoutGrid` | "Grid" | `true` when `view === 'grid'` |
| List view | `List` (or `Rows3` for a denser metaphor) | "List" | `true` when `view === 'list'` |

On mobile (`< sm`), labels collapse to icon-only with `sr-only` text to keep the search input on the same row. The toggle never wraps to its own line.

### List row layout

Each row is a clickable, full-width link with the same destination as `PaintCard` — `/paints/{id}`. Click anywhere on the row navigates to the paint detail page.

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ▢ Naggaroth Night        Citadel · Base Paints · Base    #1B1830  [D]      │
└────────────────────────────────────────────────────────────────────────────┘
  ↑    ↑                   ↑          ↑              ↑       ↑      ↑
  sw   paint name          brand      product line   type    hex    badges
```

**Desktop columns (left → right):**

| # | Content | Width | Truncation |
|---|---|---|---|
| 1 | `Swatch` (32 px, rounded, `aria-hidden`) | `shrink-0` | — |
| 2 | Paint name | `flex-1 min-w-0` | `truncate` on overflow with `title={name}` |
| 3 | Brand | `w-32 shrink-0` | `truncate`, hidden on `< md` |
| 4 | Product line | `w-40 shrink-0` | `truncate`, hidden on `< lg` |
| 5 | Paint type (title-cased, e.g. "Base") | `w-20 shrink-0` | hidden on `< lg` |
| 6 | Hex code (uppercase, e.g. `#1B1830`) | `w-20 font-mono` | hidden on `< md` |
| 7 | Status badges (Discontinued, Metallic) | `shrink-0 gap-1` | hidden on `< sm` |

The wrapper is a `flex items-center gap-3` row. Columns hide progressively as the viewport narrows; the swatch + name pair always survives.

**Mobile (`< sm`) layout** — two-line variant inside the row to keep info-density without horizontal scroll:

```
┌──────────────────────────────────────┐
│ ▢ Naggaroth Night            #1B1830 │
│   Citadel · Base · [D]               │
└──────────────────────────────────────┘
```

The swatch stays left-aligned, paint name on line 1, brand + type + badges on line 2 in `text-xs text-muted-foreground`. Hex code right-aligned on line 1 in `font-mono text-xs`. This keeps the row to two short lines, ~48 px tall, suitable for thumb taps.

### Badges

- **Discontinued** — reuse the existing `DiscontinuedBadge` primitive at `size="sm"`. Already proven on `PaintCard`.
- **Metallic** — new `MetallicBadge` is **out of scope** for this feature; instead, render an inline `badge badge-soft badge-sm` with the literal text "Metallic" gated on `paint.is_metallic`. (A proper `MetallicBadge` extraction is for the cross-domain UI audit follow-up.)

### Container element — recommendation: semantic `<ul>` / `<li>`

We considered three options:

| Option | Pros | Cons |
|---|---|---|
| `<table>` with sortable headers | Native screen-reader semantics for tabular data; aligns with the sort feature's column headers being clickable | Requires re-architecting the sort UI (currently a single dropdown selector per the parallel sort-options plan, not column headers); harder to make rows clickable; column resizing on mobile is awkward |
| `<ul>` / `<li>` with internal flex columns | Pure list semantics; rows can be full `<Link>` elements; trivially responsive (columns just hide); matches mobile two-line variant naturally | No native column-header affordance — but we don't need one because sort is dropdown-driven |
| Stack of `<div>` rows | Most flexible | Loses screen-reader list semantics for free |

**Recommend `<ul>` / `<li>`.** The sort UI in the parallel plan is a dropdown (Sort by: Hue / Lightness / Contrast), not clickable column headers, so the table's header-sort affordance is wasted. List semantics give us free `role="list"` + countable items for assistive tech ("List, 50 items"), and the row can be a `<Link>` element directly (which a `<tr>` cannot). Each `<li>` contains a `<Link className="flex items-center gap-3 …">`.

If a future feature wants per-column sort triggers (i.e. click "Brand" to sort by brand), we can revisit and switch to `<table>` then — the data shape and styling rules remain.

### Interaction parity with grid

Every interaction must work identically across both views:

| Interaction | Grid behaviour | List behaviour |
|---|---|---|
| Click a paint | Navigates to `/paints/{id}` | Same — entire row is a `<Link>` |
| Filter / search updates result set | Re-renders grid | Re-renders list with identical data |
| Sort change | Re-orders grid | Re-orders list |
| Pagination next/prev/size | Re-fetches and re-renders | Same |
| `isLoading` opacity dim | `opacity-50 transition-opacity` on the container | Same wrapper around the list |
| Empty state | `<PaintGrid>` shows "No paints found." | List view shows the same empty-state copy in the same container slot — the empty-state JSX is owned by `paint-explorer.tsx`, not by either render variant |
| User-collection toggle (authenticated) | `CollectionPaintCard` swap-in | A new `CollectionPaintListRow` is needed (see Affected files §item 4) |

The collection toggle parity is important: when an authenticated user is logged in, the grid uses `CollectionPaintCard` (adds an "in collection" toggle button). The list view must offer the same affordance — implemented as a trailing icon-button on the row (e.g. heart filled/outline) that uses the **same** server action as `CollectionPaintCard` so the toggle state stays consistent if the user flips views mid-session.

## URL state contract

The view preference is **URL-synced** via a new `view` search param. The user's last view choice is also mirrored to `localStorage` so that **first visits** from external links default to the user's preferred view (rather than always grid).

| Param | Type | Meaning | Default (omitted) |
|---|---|---|---|
| `view` | `'grid'` or `'list'` | Active view mode | `'grid'` |

**Why both URL and localStorage:**

- **URL** so a copy-pasted link encodes the view choice (e.g. sending someone a curated filter+list view: `/paints?brand=1&view=list`).
- **localStorage** so on a fresh visit to `/paints` (no `view` param in the URL), the explorer rehydrates to the user's last choice. The URL is then synced (via `replaceState`, no history entry) so the address bar always reflects the rendered state.

**Resolution order on mount:**

1. If `?view=` is present in the URL → use that.
2. Else, read `localStorage.getItem('paints.view')`. If valid → use that and `replaceState` to update the URL.
3. Else → default to `'grid'`.

Whenever the user toggles the view, write to both the URL (`pushState` so Back retraces) and `localStorage`.

**`useSearchUrlState` integration:** Add `view: 'push'` to the explorer's `keys` map. The hook already handles the URL-syncing half; the localStorage half is a small additional `useEffect` in `paint-explorer.tsx`.

**Coordination with parallel features:**

- The filters plan (`10-paint-explorer-filters.md`) adds `brand`, `type`, `line`, `disc`, `metal`. No collision.
- The sort plan (in flight) is expected to add `sort=hue|lightness|contrast` (TBD). No collision with `view`.
- All three features share `useSearchUrlState`, so the integration is order-independent: whichever lands first writes its keys, the others just append.

## Persistence — view preference key

Use a single, namespaced key: **`paints.view`**. Values: `'grid'` or `'list'` (other strings are ignored on read and default to `'grid'`).

A small typed helper lives next to other paint utilities (see Affected files §item 5):

```ts
// src/modules/paints/utils/paint-view-storage.ts
// JSDoc per CLAUDE.md
export type PaintViewMode = 'grid' | 'list'
export function readStoredPaintView(): PaintViewMode | null { … }
export function writeStoredPaintView(view: PaintViewMode): void { … }
```

The helper guards `typeof window === 'undefined'` so it's safe to import in code paths that may execute during SSR.

## Accessibility

- The view toggle is a **group of two `<button aria-pressed>` controls** with a wrapping `role="group" aria-label="View mode"`. Keyboard activation toggles via Enter/Space (standard `<button>` semantics).
- The list `<ul>` has an implicit `role="list"` — explicitly set `role="list"` only if a Tailwind utility strips it (some `list-none` configs do; verify and add if needed).
- Each row is a single `<Link>` so Tab traverses paint-by-paint. **Arrow-key navigation between rows is out of scope for v1** — Tab is sufficient and matches the grid's behaviour.
- Each row has an `aria-label` synthesised from the visible content (`"Naggaroth Night by Citadel, Base Paints, Base, hex 1B1830"`) so a screen reader announces one cohesive label even though the row hides columns on narrow screens.
- The swatch is `aria-hidden="true"` (purely decorative — colour info is conveyed by the hex code text).
- Discontinued and Metallic badges render their meaning textually (the existing `DiscontinuedBadge` already does this).
- Focus ring on each row uses the standard `focus-visible:ring-2` treatment so keyboard users can see where they are.
- The collection toggle button on authenticated rows has its own focus ring and an `aria-label="Add Naggaroth Night to collection" / "Remove Naggaroth Night from collection"` that mirrors the grid's `CollectionPaintCard`.
- When the view toggle flips, focus stays on the toggle button (do not auto-focus the first row), per WCAG focus-management guidance for context-changing controls.

## Mobile behaviour

- **Always renders as the two-line variant** (see "List row layout" above) below `sm` (640 px).
- Columns 3–5 (brand, line, type) collapse into the second muted-text line.
- Hex code stays on the first line, right-aligned, because it's a high-value scannable token.
- Status badges fit on the second line after the type.
- **No horizontal scroll.** The row clips text via `truncate` and the second line wraps if absolutely necessary.
- Touch target: row is at least 48 px tall (`min-h-12`), matching iOS HIG / Android MD recommendations.
- The view-toggle on mobile collapses to icon-only (labels `sr-only`) so it doesn't crowd the search input.

## Coordination with filters and sort

- The list view **owns no filter, sort, or query state.** It is purely a presentation choice on top of the existing `usePaintSearch` result.
- `paint-explorer.tsx` continues to be the single source of truth for `paints`, `totalCount`, `isLoading`. Both `<PaintGrid>` and `<PaintList>` receive the same `paints` prop.
- The filter bar from `10-paint-explorer-filters.md` and the sort bar (parallel feature) render between the view toggle and the result container. The view toggle does **not** affect their layout or behaviour.
- Switching view does **not** reset pagination, filters, sort, or query. The user stays on the same page of the same filtered+sorted result set; only the row template changes.
- If a filter change reduces the result count to zero, the empty-state copy renders **regardless of view mode** — owned by `paint-explorer.tsx`, not by either renderer.

## Pagination

**No change.** The same `PaginationControls` component renders below the result container in both views, driven by the same `state.page` / `state.size` from `useSearchUrlState`. Page size options stay at `[25, 50, 100, 200]`.

We considered a denser default page size for the list view (e.g. `100`) on the theory that "compact" implies "more items", but **decided against it** — the user's `size` preference should persist across view changes, and switching the default per view would surprise users who curated a size selection.

## Domain module scope

Contained entirely inside the existing **`paints`** module. No cross-module reads beyond what `PaintExplorer` already does.

### Affected files

| # | File | Role | Change |
|---|------|------|--------|
| 1 | `src/modules/paints/types/paint-view-mode.ts` | **new type** | Exports `PaintViewMode = 'grid' \| 'list'` and `DEFAULT_PAINT_VIEW = 'grid'`. JSDoc per CLAUDE.md. |
| 2 | `src/modules/paints/utils/paint-view-storage.ts` | **new utility** | `readStoredPaintView()` and `writeStoredPaintView(view)` helpers around `localStorage` (key `'paints.view'`). SSR-safe via `typeof window` guard. JSDoc per CLAUDE.md. |
| 3 | `src/modules/paints/components/paint-list-row.tsx` | **new component** | The compact list-row sibling to `PaintCard`. Renders the swatch + paint name + brand + product line + paint type + hex + badges as a clickable `<Link>` row. Props mirror `PaintCard` plus optional `productLine?: string`. Uses the proposed shared `Swatch` primitive **when it ships** (Recommendation R1 in the cross-domain UI audit); until then, replicate the same inline `<div style={{ backgroundColor }} />` pattern as `PaintCard` so this feature is not blocked. Inline-comment the swap-out site so the future `Swatch` migration is a one-line change. |
| 4 | `src/modules/paints/components/paint-list.tsx` | **new component** | The list-view sibling to `PaintGrid`. Renders a semantic `<ul>` of `<li>` elements. Accepts the same `paints` and `renderRow` props pattern (`renderRow` so the explorer can choose between a public row and an authenticated collection row — same indirection `PaintGrid` already uses with `renderCard`). |
| 5 | `src/modules/paints/components/paint-view-toggle.tsx` | **new component** | The two-button segmented control. Props: `{ view: PaintViewMode; onChange: (next: PaintViewMode) => void; className?: string }`. Pure presentational. JSDoc per CLAUDE.md. |
| 6 | `src/modules/collection/components/collection-paint-list-row.tsx` | **new component** | Cross-module mirror of `CollectionPaintCard` — wraps `PaintListRow` and adds the trailing collection-toggle icon-button using the same `togglePaintInCollection` action `CollectionPaintCard` already calls. Lives in the `collection` module (parallel to `CollectionPaintCard`) so the collection-toggle wiring stays in the collection domain. |
| 7 | `src/modules/paints/components/paint-explorer.tsx` | smart container | Extend `ExplorerUrlState` with `view: PaintViewMode`. Extend `hydrate` / `serialize` / the `useSearchUrlState` `keys` map. Add the `useEffect` that performs the URL ↔ localStorage reconciliation on mount. Insert `<PaintViewToggle>` in the header row between the search input and the Clear All button. Below the filter/sort/hue bars, switch on `view`: render `<PaintGrid>` for `'grid'` and `<PaintList>` for `'list'`. The `renderCard` / `renderRow` callback continues to choose between the authenticated and anonymous variants. No changes to the underlying data calls. |
| 8 | `src/app/paints/page.tsx` | route page | Parse the new `view` search param and pass it as `initialView` to `<PaintExplorer>`. The server doesn't read localStorage — it sees only the URL — so SSR renders whichever view the URL says, defaulting to `'grid'`. The client then completes the localStorage-fallback handshake on mount. |

**No changes** to `PaintGrid`, `HueFilterBar`, `PaginationControls`, `use-paint-search`, `use-hue-filter`, `use-search-url-state`, or any service / action. The list view is purely a new render path.

## Implementation Plan

Phased so each phase ships green types and lints, and so the work can be split into smaller PRs if scope creeps.

### Phase 1 — Types, utils, and storage

**Goal:** Land the smallest, leaf-level building blocks first.

1. Create `src/modules/paints/types/paint-view-mode.ts`:
   - Export the `PaintViewMode` union (`'grid' | 'list'`).
   - Export the `DEFAULT_PAINT_VIEW` constant.
   - JSDoc both per `CLAUDE.md`.
2. Create `src/modules/paints/utils/paint-view-storage.ts`:
   - `readStoredPaintView(): PaintViewMode | null` — SSR-guarded read of `localStorage['paints.view']` with validation (only `'grid'` or `'list'` accepted; everything else returns `null`).
   - `writeStoredPaintView(view: PaintViewMode): void` — SSR-guarded write.
   - JSDoc both.
3. Verify `npx tsc --noEmit` passes.

**Files touched:** 2 new. No UI yet.

### Phase 2 — Presentational components

**Goal:** Build the view toggle and the list-row + list container without wiring them to the explorer yet.

1. `src/modules/paints/components/paint-view-toggle.tsx`:
   - Props: `{ view: PaintViewMode; onChange: (next: PaintViewMode) => void; className?: string }`.
   - Two `<Button>`s side-by-side using `btn-outline` + `btn-primary` for the active state. `aria-pressed` on each. Wrapping `role="group" aria-label="View mode"`. Icons from `lucide-react` (`LayoutGrid`, `Rows3`). On `< sm`, labels collapse to `sr-only`.
   - JSDoc each export.
2. `src/modules/paints/components/paint-list-row.tsx`:
   - Props: `{ id: string; name: string; hex: string; brand?: string; productLine?: string; paintType?: string | null; isDiscontinued?: boolean; isMetallic?: boolean; className?: string }`.
   - Renders a `<Link>` with the row layout from "List row layout" above. Two-line mobile variant via responsive utility classes.
   - Inline-comment the swatch `<div>` with `// TODO(swatch-r1): replace with <Swatch size="md" /> when the shared primitive lands (see docs/13-application-improvements/02-cross-domain-ui-audit.md §R1).` so the future migration is discoverable.
   - JSDoc per CLAUDE.md.
3. `src/modules/paints/components/paint-list.tsx`:
   - Props: `{ paints: PaintWithBrand[]; renderRow: (paint: PaintWithBrand) => ReactNode }` — mirror `PaintGrid`'s indirection.
   - Renders an `<ul role="list" className="divide-y divide-border rounded-lg border border-border">` containing one `<li>` per paint. Empty-state copy moved to the explorer (do not duplicate here — `PaintGrid` currently duplicates it; consider lifting that empty-state during this phase or in Phase 4).
   - JSDoc per CLAUDE.md.
4. `src/modules/collection/components/collection-paint-list-row.tsx`:
   - Wraps `PaintListRow` and renders a trailing collection-toggle button using `togglePaintInCollection` (or whichever action `CollectionPaintCard` uses today; mirror exactly).
   - Same props shape as `CollectionPaintCard` plus a `productLine?: string`.
   - JSDoc per CLAUDE.md.

**Files touched:** 4 new components. No URL hookup.

**Verification:** Import each into a scratch route to confirm rendering. `npx tsc --noEmit && npm run lint`.

### Phase 3 — Wire into `PaintExplorer` + route page

**Goal:** Bring the list view live behind the toggle.

1. Update `ExplorerUrlState` in `paint-explorer.tsx`:
   ```ts
   type ExplorerUrlState = {
     q: string
     hue: string
     view: PaintViewMode
     page: number
     size: number
   }
   ```
   Extend `hydrate` (defaulting to `'grid'`, validating the param), `serialize` (omitting `'grid'` to keep URLs short), and the `useSearchUrlState` `keys` map (`view: 'push'`).
2. Add a mount-time `useEffect` that:
   - If the URL did not carry `?view=…`, reads `localStorage` via `readStoredPaintView()`.
   - If the storage value differs from the current `state.view`, calls `update({ view: stored }, { commit: false })` so the URL syncs without adding a history entry.
3. Add a `handleViewChange` callback that calls both `update({ view: next }, { commit: true })` and `writeStoredPaintView(next)`.
4. Insert `<PaintViewToggle view={state.view} onChange={handleViewChange} />` in the header row between `<SearchInput>` and the `Clear All` button.
5. Replace the single `<PaintGrid>` render with a switch on `state.view`:
   ```tsx
   {state.view === 'grid' ? (
     <PaintGrid paints={paints} renderCard={…current renderCard…} />
   ) : (
     <PaintList paints={paints} renderRow={(paint) =>
       isAuthenticated
         ? <CollectionPaintListRow … />
         : <PaintListRow … isMetallic={paint.is_metallic} productLine={paint.product_lines?.name} … />
     } />
   )}
   ```
   Keep the existing `isLoading ? 'opacity-50 transition-opacity' : ''` wrapper around whichever variant renders.
6. Add `productLine` to the `<PaintListRow>` props by reading `paint.product_lines?.name` from the existing `PaintWithBrand` shape (already includes the product-line join).
7. In `src/app/paints/page.tsx`:
   - Add `view?: string` to the destructured search params.
   - Parse and validate: `const initialView: PaintViewMode = view === 'list' ? 'list' : 'grid'`.
   - Pass `initialView` to `<PaintExplorer>` as a new prop.

**Files touched:** `paint-explorer.tsx`, `app/paints/page.tsx`.

**Manual verification:**

- Toggle from Grid → List → Grid. URL gets `?view=list`, then drops the param on switch back. `localStorage['paints.view']` updates each time.
- Reload the page after switching to List. URL retains `view=list`. List renders on first paint (SSR).
- Open a fresh browser tab (cookie-clean) and visit `/paints` directly. URL has no `view` param. Local storage has `'list'`. Verify: page renders in List view and the URL is `replaceState`'d to `?view=list` after mount, no history entry added.
- Click a paint in the list → paint detail page opens.
- Apply a brand filter (once the filters feature lands), then switch to List. Filter remains active; rows respect the filter.
- Apply a sort (once the sort feature lands), then switch to List. Order respects sort.
- Resize the viewport from 1440 px → 360 px. Columns collapse progressively; mobile two-line variant kicks in below 640 px. No horizontal scroll at any width.
- Tab through the list. Each row gets a visible focus ring. Enter activates the link.
- Toggle the collection-add button on an authenticated row. Switch to Grid view. The same paint shows as in-collection on its `CollectionPaintCard`.

### Phase 4 — Cleanup & docs

1. JSDoc every new export per `CLAUDE.md`.
2. Inline a `// TODO(swatch-r1):` comment on the list-row swatch `<div>` to flag the future `Swatch` migration.
3. Update `src/app/paints/page.tsx`'s `metadata.description` to mention the list view (optional — only if total length stays under 160 chars).
4. Verify zero new `tsc --noEmit` or `npm run lint` errors.
5. Smoke-test the full grid ↔ list flow one more time, including back-button navigation.

## Acceptance Criteria

- [ ] A view toggle control appears in the header row of `/paints` next to the search input, with both icon and text label on desktop and icon-only on mobile.
- [ ] Clicking "List" switches the result region from the existing grid to a dense `<ul>` of paint rows. Clicking "Grid" switches back.
- [ ] The active view is reflected in the URL as `?view=list` (`grid` is the default and is omitted).
- [ ] The view choice persists across sessions via `localStorage` under the key `paints.view`. Visiting `/paints` with no `view` param hydrates to the stored value and `replaceState`'s the URL to match.
- [ ] Each list row shows: swatch, paint name, brand, product line, paint type, hex code, and the Discontinued / Metallic badges, with progressive responsive column hiding.
- [ ] Below 640 px the row switches to a two-line layout with no horizontal scroll.
- [ ] Clicking anywhere on a row navigates to the paint detail page.
- [ ] Filters, sort, query, hue selection, and pagination all continue to function and apply to the list view identically to the grid view.
- [ ] Switching views does not reset filters, sort, query, or pagination.
- [ ] On authenticated visits, list rows expose the same collection-add toggle that grid cards do, sharing the same server action.
- [ ] When the result set is empty, the same empty-state copy renders in both views.
- [ ] Tab navigates row-by-row in the list view. Each row has a visible focus ring. Screen readers announce each row as a single labelled link.
- [ ] The view toggle has `aria-pressed` on each button and a wrapping `role="group" aria-label="View mode"`.
- [ ] No new TypeScript or lint errors.
- [ ] All new exports have JSDoc per `CLAUDE.md`.

## Risks & Considerations

- **Coupling to in-flight features.** This feature is best landed **after** filters (`10-paint-explorer-filters.md`) and the parallel sort feature, because filters + sort make the list view materially more useful and de-risk the URL-state merge. If shipped before, the list view ships into a sparsely-filtered explorer and may feel underwhelming. Acceptable to ship in any order — the URL keys do not collide — but coordinate merge order with the other two PRs to avoid noisy merge conflicts in `paint-explorer.tsx`.
- **`Swatch` primitive not yet extracted.** The cross-domain UI audit recommends a shared `Swatch` (R1) but it has not been built. We **do not block** on this — we inline the same swatch `<div>` pattern that `PaintCard` already uses, with a `// TODO(swatch-r1)` comment for the future migration. Migration is a one-line change once `Swatch` ships.
- **`MetallicBadge` not yet extracted.** Section 4.4 of the audit flags Metallic / In-collection badges as extraction candidates. We render the Metallic badge inline using existing `badge badge-soft badge-sm` classes, with the same `// TODO` flag. Do **not** scaffold `MetallicBadge` in this feature.
- **localStorage write on every toggle.** Cheap, but a fast double-click on the toggle could fire two writes. Acceptable — the helper is synchronous and the writes are idempotent. If perf testing flags this, debounce inside `writeStoredPaintView`.
- **SSR / hydration mismatch on the localStorage handshake.** The server renders whatever `?view=` says (or `'grid'` if absent). The client may then re-render to `'list'` if localStorage has `'list'`. Because the toggle is local to a small subtree and the result region is keyed off `state.view`, the re-render is bounded. **Use `replaceState` (not `pushState`) for the localStorage-driven URL sync** so the bounce doesn't litter browser history. Verify with React's hydration mismatch warning in dev mode that no visible flash occurs at typical network speeds; if it does, gate the localStorage read behind an opaque `useEffect` (already the plan) and accept a one-frame grid → list transition on first paint.
- **Collection toggle action duplication.** `CollectionPaintListRow` reaches into the `collection` module's server action. This is the same pattern `CollectionPaintCard` already uses, so the duplication is symmetrical (one card variant, one row variant) and there's no domain-boundary violation. If the action's signature evolves, both consumers must be updated together — document this in the action's JSDoc.
- **Future per-column sort affordance.** We chose `<ul>` over `<table>`. If a future feature demands clickable column-headers to drive sort, we'll need to migrate. The visual layout (flex columns) is portable to a `<table>` with minimal change, and the URL contract is unaffected.
- **Accessibility — Arrow-key row navigation.** Out of scope for v1. Tab is sufficient. If users request it, the migration path is straightforward (`roving tabindex` on the `<ul>`) without changing the URL or state contracts.
- **Mobile filter bar density.** Once filters land, the filter row + sort row + view toggle row + hue filter row stack vertically on mobile and consume real estate before the user ever sees a paint. Consider a future feature that collapses the filter / sort / view controls into a single "Controls" sheet on mobile (parallel to `WheelFiltersPanel`'s mobile pattern). Out of scope here, flag as follow-up.

## Out of Scope

- Shared `Swatch` primitive extraction (R1 in the cross-domain UI audit) — separate doc.
- Shared `MetallicBadge` / `CountBadge` / `EmptyState` extractions (R4, etc.) — separate docs.
- Arrow-key row navigation in the list view.
- Per-column clickable sort headers (would require switching `<ul>` → `<table>`).
- A dense "table" view variant beyond the proposed list (the user asked for a list, not a spreadsheet).
- Different default page size for list vs grid.
- Density variants ("comfortable" / "compact" toggle inside the list view).
- Server-side rendering of localStorage state (intentionally cookie-free — keeps the SSR contract simple).
- Tests: the project has no test framework configured (`CLAUDE.md` → `## Testing`), so verification is manual per the Phase-3 checklist.
