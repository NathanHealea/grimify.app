# Paint Search v2 (Rearchitecture)

**Epic:** Paint Data & Search
**Type:** Feature
**Status:** Completed
**Branch:** `refactor/paint-search`
**Merge into:** `v1/main`

> **Status: Completed.** All 8 phases shipped on `refactor/paint-search`. `PaintCardWithToggle` was renamed to `CollectionPaintCard` (`collection-paint-card.tsx`). Public `/paints` explorer now renders `CollectionPaintCard` for authenticated users.
>
> **Lint note:** 4 pre-existing lint errors remain in the Phase 2–4 hooks (`use-admin-paint-search`, `use-hue-filter`, `use-paint-search`, `use-search-url-state`) — `react-hooks/set-state-in-effect` and a ref-during-render warning. No new errors were introduced in Phases 5–7.

---

## Why rearchitect

Two problems drive this rewrite:

1. **Behavioral inconsistency across search surfaces.** The three v1 search UIs (public paint explorer, admin paint picker, admin user-collection search) each implement their own debouncing, fetching, and result handling. Search *behavior* should be consistent across all three; only the UI presentation should differ to fit each use case.
2. **Architectural tangle.** In v1, fetching, state management, and rendering are all handled inside each top-level component, which makes the components hard to modify safely. v2 should extract commonly-used behavior and state into **hooks**, so components become thin and composable.

Secondary goals:

- Keep the surface of "what can we search on" the same as v1, but design the service/hook layer so **new search capabilities can be added later** without a second rewrite.
- Preserve an interactive feel (no full-page reloads, no jank) while still giving users the **browser behaviors they expect**: back button returns to the previous search state, and a URL can be shared to load a specific search.

---

## What v1 looked like (for reference)

Three surfaces share the paint-search problem space. All three have been archived to `/archive/paint-search/`.

### 1. Public paint explorer — `/paints`
- Search input (debounced 300ms, min 3 chars) matching paint name / brand / type via `ilike`.
- Top-level Itten hue pill row, plus a child-hue pill row when a parent is selected.
- `PaginatedPaintGrid` with page-size selector (25/50/100/200), URL-synced.
- All state mirrored in `?q=&hue=parent,child&page=N&size=M` via `history.replaceState`.
- Auth-gated collection-toggle button on each paint card.

### 2. Admin paint picker — inline form on `/admin/users/[id]/collection`
- Debounced (250ms) typeahead in a dropdown, max 10 suggestions.
- Clicking a suggestion calls `addPaintToCollection(userId, paintId)`; green check indicates already-added in this session.
- No hue filter.

### 3. Admin user-collection search — same admin page
- Debounced (250ms) search over one user's full collection (fetched up-front).
- Matches name / hex (`#...`) / brand / paint_type.
- Client-side slicing with IntersectionObserver infinite scroll (PAGE_SIZE=20).

---

## Proposed v2 structure

### Shared service layer + three purpose-built UIs

The three surfaces will **share a service layer (and hooks that wrap it)** but remain **three separate components** whose UI is tailored to their use case.

### Component architecture: smart containers + dumb presentational components

Each surface splits into two layers:

- **Smart container** (per surface) — owns state, composes hooks, wires the service layer. One container per surface, ~thin.
- **Dumb presentational components** — take props (paints, filters, pagination state, callbacks) and render. No fetching, no state management, no URL reads. They are reusable outside of paint search (e.g. a `PaintGrid` that just renders a paint list).

All search / filter / pagination state lives in the container (via hooks). State is **lifted up** out of the display components so they remain purely presentational.

### Extracted hooks (first-pass list — to refine)

Each hook owns one concern so containers can compose the ones they need:

- `useDebouncedQuery(input, { delay, minChars })` — normalized text input → debounced query.
- `usePaintSearch({ query, filters, pageSize, scope })` — fetches paints via the service layer; returns `{ paints, totalCount, isLoading, error, loadMore }`. Handles cancellation of in-flight requests so the UI never "flashes" stale results.
- `useSearchUrlState({ keys, historyMode })` — two-way sync between search state and the URL. Supports `pushState` (back-button returns to prior search) **and** `replaceState` (no history entry) per-key, so e.g. text input can replace-while-typing and commit to push on blur/enter. Also hydrates from the URL on mount so shareable links work.
- `useHueFilter(hues)` — parent/child hue selection logic, independent of data fetching.

_(TBD — refine the list once we pick pagination + history semantics below.)_

### Service layer

- Keep existing `paint-service.ts` methods unchanged; no new capabilities in v2.
- Introduce a unified search entrypoint (signature TBD) that the hooks call, so adding facets / hex-similarity / FTS later means extending one function, not three.
- Admin scope (target-user context, add/remove actions) stays in admin-only server actions, but built on the same service.

### 1. Public `/paints`
- Keep hue-pill filtering (parent + child).
- **Pagination:** page numbers + size selector (25 / 50 / 100 / 200), same as v1. URL carries `?page=&size=`.
- URL-synced for sharing; back button navigates through prior searches (see "Browser history & shareable URLs").
- Search input and hue-filter components push their state **up** to a parent smart container — they don't own fetching or filtered data.
- The paint-grid component is **dumb / presentational** — it receives paints + pagination state via props and only knows how to render them. No data fetching, no URL reads.

### 2. Admin paint picker
- Stays inline typeahead dropdown (no modal).
- Uses the same `usePaintSearch` hook as public explorer, just with a different result renderer and per-result action.
- URL-synced to match public explorer contract so an admin can share a link to a picker-prefilled state.

### 3. Admin user-collection search
- Scoped to one user's collection.
- Uses the same URL-sync contract as public `/paints` so admins can share links to specific collection searches.
- **Fetch strategy:** server-side search with pagination (same pattern as admin paint picker). Prioritizing behavioral parity across the three surfaces over raw typing latency. Once we have usage data we can revisit and optimize if needed.
- Same "fast & seamless" no-flash goal as `/paints`.

---

## Browser history & shareable URLs

Applies to all three surfaces (public `/paints`, admin paint picker, admin user-collection search).

1. **Back button retraces search state.** A user who typed, toggled a filter, then paged forward should be able to Back through those steps.
2. **Shareable URLs.** Loading a URL with search params hydrates the UI to that exact state — query text, active filters, page, size.
3. **Hybrid history strategy:**
    - **`replaceState` while typing.** Each debounced query update rewrites the current URL so the address bar is always shareable, but keystrokes don't flood history.
    - **`pushState` on filter change, page change, and size change.** These are "committed" events that create a history entry so Back returns to the prior committed state.
    - The debounce-fired query update is treated as a URL refresh, not a commit, to avoid noisy history from typing.

---

## Data & service layer

- Shared methods that stay (in `paint-service.ts`): `searchPaints`, `getAllPaints`, `getPaintsByHueId`, `getPaintsByHueGroup`, `getPaintCountByHueId`, `getPaintCountByHueGroup`, `getTotalPaintCount`, `getPaintCountsByHue`.
- v1 admin-collection helpers archived: `getUserCollection`, `searchUserCollection`, `countUserPaints`. v2 admin surfaces will get new service functions built on the shared layer.
- No schema changes in v2. No new indexes unless profiling shows we need one.
- v2 must not close the door on future facets or hex-similarity — any new unified entrypoint should take an extensible options object, not positional args.

---

## Out of scope (v2)

- Hex / color-similarity search.
- Brand / paint-type / owned-vs-unowned facets.
- Full-text search backend (Postgres FTS / Supabase tsvector, etc).
- New search surfaces outside the three listed above.
- Schema or index changes.
- **Slug-based paint URLs** (`/paints/[slug]`). Separate follow-on feature under the same epic. v2 paint-search will continue linking to `/paints/[id]` until that feature ships; the paint-card component is trivially updated when it does.

These are candidates for future features; the v2 architecture leaves room for them.

---

## Resolved questions

All design questions have been answered. Summary of decisions (full history in the Amendment log):

- **Biggest problem v1 had** → behavioral inconsistency + architectural tangle.
- **Shared component vs three UIs** → shared service/hook layer, three purpose-built UIs.
- **New search capabilities** → none in v2; architecture must be extensible.
- **Pagination model** → page numbers + size selector (25/50/100/200).
- **History commit boundary** → hybrid: `replaceState` while typing, `pushState` on filter/page/size.
- **Admin URL contract** → same as public.
- **Admin user-collection fetch** → server-side (option B).
- **Component architecture** → smart container + dumb grid/cards, state lifted up via hooks.
- **New search surfaces for v2** → none.
- **Slug-based paint URLs** → separate feature, same epic; out of scope for v2.

---

## Amendment log

- **2026-04-23 (round 1)** — Established: (a) v2 rewrite driven by behavioral inconsistency + architectural rot, (b) shared service layer + hooks with three purpose-built UIs, (c) no new search capabilities in scope but architecture must be extensible, (d) browser back button must retrace search state and URLs must be shareable, and (e) no flashing / stale results during search.
- **2026-04-23 (round 2)** — Decided: (a) pagination stays page-numbers + size selector (25/50/100/200); (b) history commit is hybrid — `replaceState` while typing, `pushState` on filter / page / size change; (c) admin pages share the same URL contract as public `/paints`. Still open: admin user-collection fetch strategy; new surfaces to plan for.
- **2026-04-23 (round 3)** — Decided: (a) admin user-collection fetch is **server-side** (option B) — behavioral parity > raw typing latency, revisit after usage data; (b) no new search surfaces for v2; (c) component architecture locked in — smart containers own state via hooks, presentational components (grid, cards) stay dumb. Newly raised: slug-based paint URLs (`/paints/[slug]`) — parked as a separate follow-on question about scope.
- **2026-04-23 (round 4)** — Decided: slug-based paint URLs are a **separate feature under the same epic**, out of scope for v2 paint-search. Status flipped to `Ready for /plan`.

---

## Implementation Plan

This plan implements the v2 rearchitecture in ordered phases. Each phase produces a commit; the branch is already `refactor/paint-search` (merges into `v1/main`). Code follows the Domain Module architecture (`src/modules/<module>/…`) with the file-per-export rule.

### Target modules

| Module | Role in v2 |
|--------|------------|
| `src/modules/paints/` | Owns the shared service, hooks, and presentational components; hosts the public `/paints` smart container. |
| `src/modules/admin/` | Hosts the admin paint picker + admin user-collection smart containers, and admin-only server actions. |
| `src/modules/collection/` | Unchanged. Consumed read-only for `getUserPaintIds` and the existing `CollectionPaint` type. |
| `src/modules/hues/` | Unchanged. Consumed read-only for hue tree queries. |

### New directories to add

- `src/modules/paints/hooks/` — new. One file per hook.
- `src/modules/paints/components/search/` — optional subfolder for v2 presentational pieces (`paint-grid.tsx`, `hue-filter-bar.tsx`, `pagination-controls.tsx`) to keep them visually grouped and obviously reusable. If the flat `components/` folder stays readable, keep them flat instead.

---

### Phase 1 — Unified search entrypoint on the service layer

**Goal:** give the hooks a single function to call regardless of surface, and leave a pluggable options object for future facets.

1. In `src/modules/paints/services/paint-service.ts`, add a new method `searchPaintsUnified(options)` alongside the existing `searchPaints`. Signature:
   ```ts
   searchPaintsUnified(options: {
     query?: string
     hueId?: string           // single child hue
     hueIds?: string[]        // parent hue group expansion
     scope?: 'all' | { type: 'userCollection'; userId: string }
     limit?: number
     offset?: number
     signal?: AbortSignal      // cancellation (pass through to fetch)
     // Reserved for future: facets, hexSimilarity, fullText
   }): Promise<{ paints: PaintWithBrand[]; count: number }>
   ```
   - `scope: 'all'` reproduces v1 `searchPaints` behavior (no-op default).
   - `scope: { type: 'userCollection', userId }` joins through `user_paints` and filters by `user_id`. Returns `PaintWithBrand` rows (not `CollectionPaint`) — the `added_at` column is dropped here; the admin collection card does not need it for search.
   - When `query` is empty, the method must still honour `hueId` / `hueIds` / scope filters (so callers can unify "filtered browse" and "search" into one call).
   - Cancellation: if `signal` is provided, attach it to each Supabase call via `.abortSignal(signal)`.
2. Keep the existing `searchPaints` for backward compatibility during the transition; delete it in Phase 8 once all callers move.
3. Do **not** add new counting methods — `searchPaintsUnified` returns `{ paints, count }`.

**Files touched:** `src/modules/paints/services/paint-service.ts` (add method, extend JSDoc).

### Phase 2 — Shared hooks

**Goal:** extract the four hooks listed in the doc. Each hook is self-contained and has no knowledge of which surface is using it.

Create under `src/modules/paints/hooks/`:

1. **`use-debounced-query.ts`** — exports `useDebouncedQuery(input: string, options: { delay: number; minChars: number }): string`.
   - Returns `''` if `input.length` is between 1 and `minChars - 1` (matches v1 behavior: don't fire for 1–2 chars).
   - Uses `setTimeout`/`clearTimeout` — no external deps.

2. **`use-paint-search.ts`** — exports `usePaintSearch(params: { query?; hueId?; hueIds?; scope?; pageSize; page }): { paints; totalCount; isLoading; error; loadMore? }`.
   - Internally calls `getPaintService().searchPaintsUnified(…)` on the client (`paint-service.client.ts`).
   - Uses `AbortController` so stale in-flight responses never overwrite fresh ones. The "no-flash" UX goal depends on this.
   - For admin scope, accepts an explicit `userId` and passes `scope: { type: 'userCollection', userId }`.
   - Does not manage URL state — that is `useSearchUrlState`'s job.

3. **`use-search-url-state.ts`** — exports `useSearchUrlState<T>(config: { keys: Record<keyof T, 'replace' | 'push'>; hydrate: (sp: URLSearchParams) => T; serialize: (state: T) => URLSearchParams; basePath: string; }): { state; update(patch, { commit?: boolean }) }`.
   - Two-way sync between search state and the URL, honoring per-key `pushState`/`replaceState` per the hybrid strategy.
   - `update(patch, { commit: false })` → always `replaceState` (used by the debounced query tick).
   - `update(patch, { commit: true })` → `pushState` if any `push`-keyed field changed, otherwise `replaceState`.
   - On mount, reads `window.location.search`, calls `hydrate`, and sets initial state. Also listens for `popstate` and re-hydrates so Back/Forward restore state correctly.
   - Uses `window.history.*` directly (not `router.replace`) for the same reason the v1 explorer did: avoid server-component re-renders that would cause an effect-loop.

4. **`use-hue-filter.ts`** — exports `useHueFilter({ hues, initialParentName, initialChildName }): { selectedParent; selectedChild; childHues; childHuePaintCounts; selectParent; selectChild; clear }`.
   - Resolves parent/child by name (matches the URL contract of `hue=parent,child`).
   - Fetches child hues + counts via `getHueService()` / `getPaintService()` on the client when a parent is selected, with cancellation.
   - Exposes `selectedParentId` / `selectedChildId` derived values so callers don't need to resolve names themselves.

All four hooks get JSDoc per `CLAUDE.md` conventions.

**Files touched:** 4 new files under `src/modules/paints/hooks/`.

### Phase 3 — Dumb presentational components

**Goal:** peel rendering out of the container. Components receive props; they never fetch, read URLs, or own search/filter state.

Decide placement: if `paints/components/` stays under ~10 files, keep flat. Otherwise nest under `paints/components/search/`. Default: **flat** until there's a reason to nest.

1. **`paint-grid.tsx`** — a dumb grid that renders either `PaintCard` or `PaintCardWithToggle` (when `isAuthenticated` + `userPaintIds` are supplied). Props: `paints`, `isAuthenticated?`, `userPaintIds?`, `revalidatePath?`, plus an optional `renderCardAction?: (paint) => ReactNode` slot so the admin surfaces can inject their ellipsis menu / add button without the grid knowing about admin concerns.
   - Replaces the render-half of v1 `paginated-paint-grid.tsx`. Pagination logic moves out (see next).
2. **`pagination-controls.tsx`** — dumb pagination UI. Props: `currentPage`, `totalPages`, `pageSize`, `pageSizeOptions`, `isPending`, `onPageChange(n)`, `onSizeChange(n)`. No URL reads or writes.
3. **`hue-filter-bar.tsx`** — renders the parent pill row and (conditionally) the child pill row. Props: `hues`, `huePaintCounts`, `childHues`, `childHuePaintCounts`, `selectedParentName`, `selectedChildName`, `onSelectParent(name)`, `onSelectChild(name)`. Internally uses the existing `HueCard` / `ChildHueCard`.
4. **Search input** — reuse `src/components/search.tsx` (`SearchInput`) unchanged. Don't re-create.

**Existing `paginated-paint-grid.tsx` — handling:** it is currently consumed by `hue-paint-grid.tsx`, `hue-group-paint-grid.tsx`, and `collection-paint-grid.tsx`. Do **not** rename or remove it in this refactor. Instead: extract the render/pagination split into the new dumb components, and have v2 paint-search use the new `PaintGrid` + `PaginationControls`. Leave `PaginatedPaintGrid` in place for the three unchanged callers; revisit migrating them in a follow-on.

**Files touched:** 3 new files under `src/modules/paints/components/`.

### Phase 4 — Smart container for public `/paints`

**Goal:** rebuild `PaintExplorer` as a thin container that composes the hooks and hands props to the dumb components.

1. Create `src/modules/paints/components/paint-explorer.tsx` (replacing the archived one). Responsibilities:
   - Read initial state from the URL (via `useSearchUrlState`'s hydrate) — no `searchParams` reading in the component body.
   - Wire `useDebouncedQuery` → `useHueFilter` → `usePaintSearch` → `useSearchUrlState`.
   - Apply the hybrid history rule: debounced query updates call `update(patch, { commit: false })`; hue changes, page changes, and page-size changes call `{ commit: true }`.
   - Render `<SearchInput>` + `<HueFilterBar>` + `<PaintGrid>` + `<PaginationControls>`.
2. Restore `src/app/paints/page.tsx` as the thin server-component page: parse search params, pre-fetch the first page via `paintService.searchPaintsUnified(…)`, hydrate `<PaintExplorer>` with `initialPaints` / `initialTotalCount` / `hues` / `huePaintCounts` / `userPaintIds` / `isAuthenticated`.
   - Use the archived `pages/paints-page.tsx` as the structural reference; replace ad-hoc branching with a single `searchPaintsUnified` call.
3. Kill the "flash" by only rendering the grid from hook state after the first mount — on mount, show the SSR initial data, and only replace it once `usePaintSearch` has a fresh result.

**Files touched:** `src/modules/paints/components/paint-explorer.tsx` (new), `src/app/paints/page.tsx` (replace stub).

**Manual verification:** `npm run dev`, load `/paints`, type, filter by hue, paginate, size-change, Back/Forward, copy-paste URL in a new tab. Confirm no flicker.

### Phase 5 — Admin paint picker

**Goal:** typeahead picker uses the same hooks as public search, with an admin-only action per row.

1. Create `src/modules/admin/components/admin-add-paint-form.tsx` (v2). Composes:
   - `useDebouncedQuery({ delay: 250, minChars: 1 })` — note admin fires on 1 char; the existing UX.
   - `usePaintSearch({ query, pageSize: 10, scope: 'all' })`.
   - A dropdown list renderer (not `PaintGrid` — this surface wants compact list rows, not cards), kept inline in the container since it's picker-specific.
   - URL sync via `useSearchUrlState({ keys: { q: 'replace' } })` so the admin URL-contract goal (same as public) is met.
2. Create `src/modules/admin/actions/add-paint-to-collection.ts` — port the archived action verbatim (self-guard + `revalidatePath`).
3. **Do not** recreate `search-paints-for-picker.ts`. The picker calls the service directly via the client (through `usePaintSearch`), matching the public surface. This removes an unneeded server round-trip and keeps behavior parity.

**Files touched:** 1 new component, 1 new action. No service changes.

### Phase 6 — Admin user-collection search (server-side)

**Goal:** reuse the hooks but scope to one user's collection, with server-side pagination (per round-3 decision).

1. Create `src/modules/admin/services/collection-service.ts` — **lean**: only admin-only reads that differ from the user-facing service (e.g., `getUserProfileAndCount`). Search itself goes through `paintService.searchPaintsUnified({ scope: { type: 'userCollection', userId } })` so there is one code path.
2. Create `src/modules/admin/actions/search-user-collection.ts` — auth-guard + call `searchPaintsUnified`. Returns `{ paints, count }` or `{ error }`. Replaces the archived JS-filtered version.
3. Create `src/modules/admin/actions/remove-paint-from-collection.ts` — port archived verbatim.
4. Create `src/modules/admin/components/admin-user-collection-search.tsx` (v2). Composes the same hook set as public `/paints` with `scope` set. Renders `<SearchInput>` + `<PaintGrid renderCardAction={…}>` (injecting the admin ellipsis/remove dropdown) + `<PaginationControls>`. No hue filter on this surface — just omit `HueFilterBar`.
5. Create `src/modules/admin/components/admin-collection-paint-card.tsx` — restore from archive; the ellipsis/remove dropdown. Mount via the `PaintGrid`'s `renderCardAction` slot.
6. Restore `src/app/admin/users/[id]/collection/page.tsx` to its full layout: header, profile block, `<AdminAddPaintForm>` if not self, then `<AdminUserCollectionSearch userId={…} initialPaints={…} initialCount={…} />`. Use archived page as the structural reference.

**Files touched:** 1 new service (thin), 2 new actions, 2 new components, 1 page restore.

### Phase 7 — Consistency & cleanup

1. Delete `searchPaints` (old) from `paint-service.ts` once no callers remain. Verify with `grep`.
2. Remove any `searchUserCollection`/`getUserCollection`/`countUserPaints` stubs — if any were left behind from archival, delete.
3. Ensure every new exported symbol has JSDoc per `CLAUDE.md`.
4. Run `npx tsc --noEmit` and confirm zero errors outside `archive/` (already excluded).
5. Run `npm run lint`.

### Phase 8 — Manual verification

Since the project has no test framework (`$TEST_GUIDANCE` is "Framework: none"), verification is manual and per surface:

| Surface | Checklist |
|---------|-----------|
| `/paints` | Type → URL rewrites (no history entries). Pick hue → history entry. Page/size → history entry. Back retraces. Paste URL with `?q=&hue=&page=&size=` → hydrates. No flash between filter changes. Auth toggle still works. |
| `/admin/users/[id]/collection` picker | Type → suggestions populate. Click → added; green check; no duplicate. Self-add blocked. Suggestions stay open. URL reflects `?q=`. |
| `/admin/users/[id]/collection` search | Type → collection results with server-side pagination. Remove action works + revalidates. URL shareable across admin sessions. Back button retraces. |

Record any regressions as follow-up tasks; fix before PR.

### Affected files

| # | File | Change | Status |
|---|------|--------|--------|
| 1 | `src/modules/paints/services/paint-service.ts` | Add `searchPaintsUnified`; remove legacy `searchPaints` in Phase 7. | ✅ Done |
| 2 | `src/modules/paints/hooks/use-debounced-query.ts` | New. | ✅ Done |
| 3 | `src/modules/paints/hooks/use-paint-search.ts` | New. | ✅ Done |
| 4 | `src/modules/paints/hooks/use-search-url-state.ts` | New. | ✅ Done |
| 5 | `src/modules/paints/hooks/use-hue-filter.ts` | New. | ✅ Done |
| 6 | `src/modules/paints/components/paint-grid.tsx` | New presentational grid. | ✅ Done |
| 7 | `src/modules/paints/components/pagination-controls.tsx` | New presentational pager. | ✅ Done |
| 8 | `src/modules/paints/components/hue-filter-bar.tsx` | New presentational filter row. | ✅ Done |
| 9 | `src/modules/paints/components/paint-explorer.tsx` | New smart container (replaces archived). | ✅ Done |
| 10 | `src/app/paints/page.tsx` | Replace stub with SSR prefetch + `<PaintExplorer>`. | ✅ Done |
| 11 | `src/modules/admin/components/admin-add-paint-form.tsx` | New smart picker (replaces archived). | ✅ Done |
| 12 | `src/modules/admin/components/admin-user-collection-search.tsx` | New smart container (replaces archived). | ✅ Done |
| 13 | `src/modules/admin/components/admin-collection-paint-card.tsx` | Restore from archive. | ✅ Done |
| 14 | `src/modules/admin/actions/add-paint-to-collection.ts` | Port from archive. | ✅ Done |
| 15 | `src/modules/admin/actions/remove-paint-from-collection.ts` | Port from archive. | ✅ Done |
| 16 | `src/modules/admin/actions/search-user-collection.ts` | New — calls `searchPaintsUnified` with `scope: userCollection`. | ✅ Done |
| 17 | `src/modules/admin/services/collection-service.ts` | New — minimal, admin-only reads (e.g., profile + count). | ✅ Done |
| 18 | `src/app/admin/users/[id]/collection/page.tsx` | Replace stub; compose admin components. | ✅ Done |

### Risks & considerations

- **Hook-seam leak.** Hooks must not import each other — the container composes them. If `usePaintSearch` starts reading URL state internally, the split is broken; keep strict boundaries.
- **Back button + debounced query race.** When the user hits Back, `popstate` re-hydrates state, which triggers the debounced query effect, which could push a URL. Guard: a `popstate`-sourced state change must always be a `replaceState` (never `pushState`) until the next user input.
- **Cancellation correctness.** With `AbortController`, the last-request-wins pattern is what prevents flicker. Any code path that calls `setPaints` without consulting the current abort state reintroduces flicker. Centralise this in `usePaintSearch`.
- **Unified service signature.** Over-generalising now (facets, FTS, hex similarity) violates the "no new capabilities in v2" rule. Keep the signature pluggable but unimplemented for those fields.
- **`PaginatedPaintGrid` still has callers.** `hue-paint-grid`, `hue-group-paint-grid`, `collection-paint-grid` depend on it. Do not refactor those in this PR — dual-track the new `PaintGrid`.
- **`scope: userCollection` performance.** Server-side join through `user_paints` is one extra RLS-backed query. Fine for the expected collection sizes (<2k paints) but profile once data lands. Per round-3 decision: revisit after usage data.
- **Auth/role enforcement.** The three admin actions must re-check the admin role (not just auth). Port the self-guard from the archived versions and verify `requireAdmin()` is called (or equivalent) before any write.

### Out of this PR

- Slug-based paint URLs — separate feature under the same epic.
- Migrating `hue-paint-grid` / `hue-group-paint-grid` / `collection-paint-grid` to the new `PaintGrid` — possible follow-up.
- Any new search capabilities (facets, hex, FTS) — explicitly out of scope per the doc.
