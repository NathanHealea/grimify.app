# Cross-Domain UI Audit

**Epic:** Application Improvements
**Type:** Enhancement
**Status:** Todo
**Branch:** `enhancement/cross-domain-ui-audit`
**Merge into:** `main`

## Summary

Groundwork audit for a shared design system. Catalogues every reusable UI building block in the Grimify codebase — primitives under `src/components/ui/`, top-level shared components under `src/components/`, components nested in `src/modules/*/components/` that are already consumed across domains, and repeated inline UI patterns that are currently re-implemented per module.

This is **analysis only**. No source files are modified; no components are scaffolded. The output is an inventory + gap analysis + concrete extraction recommendations that future feature docs in this epic can pull individual items off of and implement one at a time.

The audit is motivated by the recurring inline color-swatch pattern (a `div` with inline `backgroundColor: hex`, repeated ~50 times across the codebase with several different sizes/shapes), and broadens out to cover other duplicated UI: badge variants, empty states, card skeletons, paginated grids, and URL-debounced search inputs.

## Scope

In scope:

- All exports from `src/components/ui/`
- All exports from `src/components/`
- Components in `src/modules/*/components/` imported by **more than one** module, or visually duplicated across modules
- Inline JSX patterns repeated across three or more modules
- Recommendations for new shared components

Out of scope:

- Implementation of any extracted component (each gets its own follow-up doc)
- Theme tokens / `src/styles/*.css` rewrites
- Server-side / data-layer dedup
- OG image route components (`src/app/api/og/**`) — these run in a separate edge runtime and don't share React with the app

## 1. Existing Shared UI Primitives (`src/components/ui/`)

Thin shadcn-style wrappers that apply daisyUI-inspired class names from `src/styles/*.css`. Already correctly cross-domain — they should stay where they are.

| File | Exports | Purpose | Notable callers |
|---|---|---|---|
| `button.tsx` | `Button` | Wraps native `<button>` with `.btn` class composition; supports `asChild` via Radix `Slot`. | Used in every module. ~140 imports project-wide. |
| `card.tsx` | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`, `CardAction` | Layout primitives mapped onto daisyUI `.card`, `.card-header`, etc. | paint-card, palette-card, recipe-card, hue-card, color-group-card, collection-paint-card, brand-paint-list (~30 imports). |
| `dialog.tsx` | Radix `Dialog` re-exports + styled `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription` | Modal dialogs with overlay, close button, animations. | palette-swap-dialog, palette-rename-dialog, recipe-photo-lightbox, admin-delete-confirm, brand-delete-dialog. |
| `dropdown-menu.tsx` | Full Radix `DropdownMenu` surface (Trigger, Content, Item, Separator, Sub, Label, etc.) | Application menus, action menus, sort dropdowns. | navbar, navbar-mobile-menu, paint-explorer sort, palette-card actions, recipe-card actions, admin tables. |
| `input.tsx` | `Input` | Wraps native `<input>` with `.input` class. | All form modules + `search.tsx`. |
| `input-group.tsx` | `InputGroup`, `InputGroupAddon`, `InputGroupInput`, `InputGroupText`, `InputGroupButton` | Composite input with prefix/suffix slots (icon + clear button). | Only `src/components/search.tsx`. |
| `label.tsx` | `Label` | Wraps Radix Label with `.label` class. | All form modules. |
| `popover.tsx` | `Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverAnchor` | Radix Popover wrapper used for overlays that aren't dialogs. | paint-combobox, scheme-paint-combobox, recipe-palette-combobox, palette-paint-groups-toggle. |
| `select.tsx` | Full Radix `Select` surface | Native-feel select dropdowns. | admin-paint-form, hue-form, brand-form, paint-explorer brand filter. |
| `sheet.tsx` | `Sheet`, `SheetTrigger`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription`, `SheetFooter`, `SheetClose` | Side-drawer (uses Radix Dialog under the hood). | navbar-mobile-menu, wheel-filters-panel mobile, paint-detail-panel mobile. |
| `skeleton.tsx` | `Skeleton`, `SkeletonCircle` | Loading placeholders. Includes a note that `SkeletonCircle` is for color swatches and the wheel surface. | Every `loading.tsx` route + paint-substitutes, paint-similar-section. |
| `slider.tsx` | `Slider` | Radix Slider wrapper for tolerance/threshold sliders. | wheel-filters-panel, paint-similar-section. |
| `textarea.tsx` | `Textarea` | Native `<textarea>` with `.textarea` class. | recipe-step-form, palette-note-form, profile-form. |

**Recommendation:** Keep as-is. These are the canonical primitive layer; new shared components should be built on top of them, not next to them.

## 2. Existing Shared Top-Level Components (`src/components/`)

Already cross-domain. Recommendation column flags anything that needs follow-up work.

| File | Export(s) | Description | Cross-module callers | Recommendation |
|---|---|---|---|---|
| `search.tsx` | `SearchInput` | Canonical search input — `InputGroup` with search icon and clear button. | `navbar-search-bar`, `hero-search`, `paint-explorer`, `collection-search`, `admin-user-collection-search`, `admin-add-paint-form` (6 callers across 4 modules). | **Keep.** Note: `UserSearch` and `CollectionSearch` both implement debounce-to-URL on top of (or instead of) this — see Recommendation R6. |
| `page-header.tsx` | `PageHeader`, `PageTitle`, `PageSubtitle`, `PageHeaderActions` | Top-of-page header layout (title + subtitle + action slot). | Used by route pages across paints, palettes, recipes, hues, brands, collection, user. | **Keep.** |
| `main.tsx` | `Main` | App-shell `<main>` wrapper that owns top padding for the fixed navbar. | All `(public)` / `(app)` layouts. | **Keep.** |
| `navbar.tsx` | `Navbar` | Top navigation bar (logo, links, search slot, user menu). | Root layout. | **Keep.** |
| `navbar-mobile-menu.tsx` | `NavbarMobileMenu` | Mobile sheet menu mirroring navbar links. | `Navbar`. | **Keep.** |
| `breadcrumbs.tsx` | `Breadcrumbs` | Route breadcrumb rendering. | Paint detail, palette detail, recipe detail, hue detail, brand detail, admin pages. | **Keep.** |
| `logo.tsx` | `Logo` | SVG wordmark. | Navbar, footer, OG fallbacks, marketing hero. | **Keep.** |
| `footer.tsx` | `Footer` | Site footer. | Root layout. | **Keep.** |
| `json-ld.tsx` | `JsonLd` | `<script type="application/ld+json">` injector for SEO structured data. | seo module + various route pages. | **Keep.** |

## 3. Cross-Domain Module Components

Components currently nested under `src/modules/<module>/components/` but imported by other modules. Ordered by reuse count.

| Component | Source module | Consumers (modules) | Imports | Recommendation |
|---|---|---|---|---|
| `PaintCard` | paints | collection, palettes (via `paint-references`), admin, paints | 9 | **Hoist** to `src/components/paints/paint-card.tsx` or keep in `paints` and document as the canonical cross-domain export. It is effectively part of the shared surface — every consumer treats it as a primitive. |
| `TurnstileProvider` | auth | auth, palettes, recipes, user, marketing (contact), shared layouts | 7 | **Hoist** to `src/components/turnstile-provider.tsx`. Not domain-specific — it's an infrastructure provider. |
| `PaletteDragHandle` | palettes | palettes (multiple sortable surfaces), recipes (step reordering) | 6 | **Hoist** to a shared DnD utility location (e.g. `src/components/dnd/drag-handle.tsx`) once recipes confirm shared usage. |
| `MarkdownRenderer` | markdown | recipes, palettes, marketing (legal pages), seo | 4 | **Keep** — `markdown` is already a shared infrastructure module. The current location is correct. |
| `MarkdownEditor` | markdown | recipes (step body), palettes (notes), profile (bio) | 4 | **Keep** — same reasoning as `MarkdownRenderer`. |
| `CollectionPaintCard` | collection | collection (own/wishlist tabs), admin (admin user collection viewer) | 4 | **Keep** in `collection`. Composed of `PaintCard` + collection-specific actions; not a generic primitive. |
| `DiscontinuedBadge` | paints | paints, palettes, recipes | 3 | **Hoist** to `src/components/badges/discontinued-badge.tsx` — purely visual, has `size` token (`sm`/`md`), no domain logic. Pulls in `BadgeStop` icon + tooltip. |
| `RecipePhotoGrid` | recipes | recipes only | 3 | **Keep.** Reuse is intra-module. |
| `PaginationControls` | paints | paints, recipes (recipe-browse-pagination wraps it), admin (admin-user-collection-search) | 3 | **Hoist** to `src/components/pagination-controls.tsx`. There is also a near-duplicate inline pagination implementation in `paginated-paint-grid.tsx` (see Recommendation R3). |
| `PaginatedPaintGrid` | paints | paints, collection, brands | 3 | **Keep** in `paints` but extract the embedded pagination block to use the shared `PaginationControls`. |

## 4. Repeated Inline UI Patterns

Patterns re-implemented inline across modules with no shared abstraction. These are the highest-value extraction targets.

### 4.1 The color swatch `div`

A `<div>` styled with `style={{ backgroundColor: paint.hex }}` plus a `size-*` / `rounded-*` class, optionally with a `border` and a `title={hex}`. There are **~50 occurrences** in the app (excluding OG image routes). Variants observed:

| Size | Shape | Notes | Sites |
|---|---|---|---|
| `size-3` | `rounded-full` | chip inline marker | `paint-detail.tsx:152,167`, `child-hue-card.tsx:38` |
| `size-4` | `rounded-full` | hue/category icon | `hue-card.tsx:38` |
| `size-5` | `rounded` / `rounded-md` | combobox option marker | `paint-combobox.tsx:103`, `hue-selector.tsx:75,103`, `scheme-paint-combobox.tsx:75,112` |
| `size-8` | `rounded-sm` | palette row swatch | `palette-paint-row.tsx:132`, `palette-swap-candidate-card.tsx:45` |
| `size-16` | `rounded-lg` | paint card hero | `paint-card.tsx:47`, `collection-paint-card.tsx`, `palette-swap-dialog.tsx:136`, `discontinued-paint-listing.tsx:80`, `recipe-step-paint-row.tsx:153`, `recipe-step-paint-picker.tsx:162,219` |
| `size-32` | `rounded-xl` | paint detail hero | `paint-detail.tsx:71` |
| `h-32 sm:h-40` | `rounded-lg` | comparison hero | `paint-comparison-card.tsx:40` |
| `aspect-square w-full` | `rounded` / `rounded-lg` | scheme grid cell | `scheme-swatch.tsx:29`, `scheme-partner-row.tsx:43` |
| `w-{px}` (dynamic) | none | flex-fill bar | `palette-swatch-strip.tsx:43` |
| matrix cell | `rounded` | comparison delta matrix | `paint-comparison-delta-matrix.tsx:69,88` |
| preview | `rounded-md` | form field preview | `base-color-picker.tsx:93`, `paint-form.tsx:281`, `hue-form.tsx:172`, `admin-add-paint-form.tsx:117` |

**Common boilerplate per occurrence:**

```tsx
<div
  className="size-16 rounded-lg border border-border"
  style={{ backgroundColor: paint.hex }}
  title={paint.hex}
  aria-label={`${paint.name} color swatch`}
/>
```

**Recommendation:** Extract a `Swatch` primitive (see R1).

### 4.2 Empty states

Two near-identical implementations:

| File | Markup |
|---|---|
| `src/modules/palettes/components/palette-empty-state.tsx` | `<div className="card card-body items-center justify-center py-12 text-center"><p className="text-muted-foreground">...</p></div>` with `variant: 'owner' \| 'guest'` |
| `src/modules/recipes/components/recipe-empty-state.tsx` | Same wrapper + classes, different copy, same `variant` discriminator. |

Plus ad-hoc empty messages in `collection-search.tsx`, `paint-explorer.tsx` ("No paints match your filters"), `user-search.tsx` ("No users found"), and `brand-paint-list.tsx`.

**Recommendation:** Extract an `EmptyState` component (see R2).

### 4.3 Card / grid skeletons

The "paint card skeleton" triplet — square thumb + two text bars — is hand-copied at:

- `src/modules/paints/components/paint-substitutes.tsx:86-88`
- `src/modules/paints/components/paint-similar-section.tsx:315-317`
- `src/app/collection/loading.tsx`
- `src/app/collection/paints/loading.tsx`
- `src/app/(legal)/loading.tsx`
- `src/app/profile/setup/loading.tsx`
- `src/app/loading.tsx`

All use:

```tsx
<div className="flex items-center gap-3">
  <Skeleton className="size-16" />
  <div className="flex-1 space-y-2">
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-3 w-1/2" />
  </div>
</div>
```

**Recommendation:** Extract `PaintCardSkeleton` (or a more generic `MediaRowSkeleton`) — see R5.

### 4.4 Status / visibility badges

`badge badge-soft badge-sm` displaying "Public" or "Private" appears inline at:

- `src/modules/palettes/components/palette-card.tsx:41-43`
- `src/modules/recipes/components/recipe-card.tsx:56-58`
- `src/modules/user/components/user-detail.tsx`

`badge badge-sm badge-primary` count badges appear at:

- `src/modules/paints/components/paint-similar-section.tsx`
- `src/modules/paints/components/paint-color-schemes-section.tsx`
- `src/modules/color-wheel/components/wheel-filters-panel.tsx`

"In collection" / "Owned" badges appear at:

- `src/modules/paints/components/paint-combobox.tsx`
- `src/modules/palettes/components/palette-swap-candidate-card.tsx`
- `src/modules/user/components/user-detail.tsx`

Each site uses a slightly different inline markup — some render a plain badge class, others add an icon or swap the label text. The color is inconsistent because there is no single source of truth.

**Recommendation:** Extract `VisibilityBadge` (for Public/Private), `CountBadge` (numeric pill), and reuse `DiscontinuedBadge` once it's hoisted (R4). Extract `CollectionBadge` for the "In Collection" indicator (R8).

### 4.5 URL-debounced search inputs

Two modules implement the same "type into search box → debounce → push query param to URL" pattern with different timings:

| File | Debounce | Notes |
|---|---|---|
| `src/modules/user/components/user-search.tsx` | 300ms | Uses raw `<Input>` directly — does **not** consume the shared `SearchInput`. |
| `src/modules/collection/components/collection-search.tsx` | 250ms | Uses `SearchInput`. |
| `src/modules/paints/components/paint-explorer.tsx` | inline (via `useSearchUrlState`) | Already abstracted inside `paints`. |

`NavbarSearchBar` (`src/modules/paints/components/navbar-search-bar.tsx`) handles a third pattern: explicit submit + `pushState` + `popstate` to re-hydrate without a full Next.js navigation.

**Recommendation:** Extract a `useDebouncedSearchParam` (or `useSearchUrlState` generalised) hook so all three callers share one implementation (R6). Once that exists, `UserSearch` should also switch from raw `<Input>` to `SearchInput` for visual consistency.

### 4.6 Stat blocks

Inline "value + label" pairs appear in:

- `src/modules/marketing/components/stats-strip.tsx` — three stats in a flex row
- `src/modules/collection/components/collection-stats.tsx` — owned / wishlist / coverage stats
- `src/modules/user/components/user-detail.tsx` — public profile stats

Markup is similar (large number + small muted label) but the wrappers differ.

**Recommendation:** Extract a `StatCard` (or `StatItem` + `StatGroup`) — see R7. Lower priority than R1–R3.

## 5. Proposed New Components

Each candidate below should become its own follow-up doc under `docs/13-application-improvements/`. They are independent of each other and can ship in any order.

### R1. `Swatch` — color block primitive

Replaces the inline `<div style={{ backgroundColor }} />` pattern (Section 4.1).

**Proposed API:**

```tsx
type SwatchSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
//                 size-3  size-5  size-8  size-16  size-32  h-32 sm:h-40

type SwatchShape = 'square' | 'rounded' | 'pill' | 'circle'
//                  size + rounded-sm    rounded-md   rounded-full

type SwatchProps = {
  hex: string
  size?: SwatchSize        // default 'md'
  shape?: SwatchShape      // default 'rounded'
  bordered?: boolean       // default true
  title?: string           // defaults to hex
  'aria-label'?: string
  className?: string
}
```

Notes:

- A `fill` size mode (`aspect-square w-full`) is also needed for `SchemeSwatch` and matrix cells — exposed as `size="fill"`.
- The dynamic-width variant in `palette-swatch-strip.tsx` is a different concept (flex-fill strip) and should not be served by `Swatch`; that file stays as-is.

**Call-site delta:** ~50 inline `style={{ backgroundColor }}` removals across paints, palettes, recipes, hues, color-schemes, admin, color-wheel.

### R2. `EmptyState`

Replaces `palette-empty-state.tsx` + `recipe-empty-state.tsx` and standardises ad-hoc empty messages.

**Proposed API:**

```tsx
type EmptyStateProps = {
  title?: string
  description: string
  icon?: ReactNode
  action?: ReactNode    // optional CTA button slot
  variant?: 'card' | 'inline'   // default 'card' (current behaviour)
}
```

**Call-site delta:** delete `palette-empty-state.tsx` + `recipe-empty-state.tsx`; replace ad-hoc empty `<p>` blocks in `paint-explorer`, `collection-search`, `user-search`, `brand-paint-list`.

### R3. Hoist `PaginationControls` + de-duplicate

`src/modules/paints/components/pagination-controls.tsx` already exists and is used by 3 modules. `paginated-paint-grid.tsx` re-implements the same `visiblePages` math with `MAX_VISIBLE_PAGES = 7`.

**Action:** Move `pagination-controls.tsx` to `src/components/pagination-controls.tsx`, delete the embedded duplicate inside `paginated-paint-grid.tsx`, and update the 3 existing call sites.

### R4. Hoist `DiscontinuedBadge` and introduce sibling badges

- Hoist `src/modules/paints/components/discontinued-badge.tsx` to `src/components/badges/discontinued-badge.tsx`.
- Add a `VisibilityBadge` (`public | private`) and a `CountBadge` (numeric pill) in the same directory.
- Wire up palette-card, recipe-card, user-detail, paint-similar-section, paint-color-schemes-section, wheel-filters-panel.

### R5. `PaintCardSkeleton` (or `MediaRowSkeleton`)

Single export that emits the size-16 thumb + 3/4 + 1/2 bar pattern from Section 4.3.

**Proposed API:**

```tsx
type PaintCardSkeletonProps = {
  count?: number    // default 1; wrap N copies in a fragment
}
```

Used by every `loading.tsx` that currently hand-rolls the same triplet.

### R6. `useDebouncedSearchParam` hook

Encapsulates the "input value → debounce → `router.replace('?q=...')`" pattern.

**Proposed API:**

```tsx
function useDebouncedSearchParam(
  paramName: string,
  options?: { debounceMs?: number; clearOnEmpty?: boolean }
): [string, (next: string) => void]
```

Adopters: `UserSearch`, `CollectionSearch`, `paint-explorer` (replace `useSearchUrlState`). Lives at `src/hooks/use-debounced-search-param.ts`.

After the hook lands, switch `UserSearch` from raw `<Input>` to the shared `SearchInput` so all three search bars look identical.

### R8. `CollectionBadge`

Replaces the inline "In Collection" / "Owned" markers from Section 4.4.

The component has one fixed color identity (success/green-toned) across every display variant so that "in collection" always reads the same way regardless of context — the only thing that changes between call sites is layout density and whether an icon appears.

**Proposed API:**

```tsx
type CollectionBadgeVariant = 'badge' | 'chip' | 'icon-only'
type CollectionBadgeSize    = 'sm' | 'md'

type CollectionBadgeProps = {
  label?:    string                 // default 'In Collection'
  variant?:  CollectionBadgeVariant // default 'badge'
  size?:     CollectionBadgeSize    // default 'sm'
  showIcon?: boolean                // default true — renders a small checkmark or box icon
  className?: string
}
```

Variant notes:

| `variant` | Rendered as | Typical use |
|---|---|---|
| `badge` | `badge badge-soft badge-success` pill with optional icon + label | `paint-combobox` option rows, `palette-swap-candidate-card` |
| `chip` | Slightly larger pill, icon always visible | list/grid cards where the badge sits below the swatch |
| `icon-only` | Icon with `sr-only` label for accessibility | dense table rows, `user-detail` profile stats |

Color is **not** configurable via props — callers that need a different color are rendering a different concept and should not reuse this component.

**Call-site delta:** Remove inline badge markup from `paint-combobox.tsx`, `palette-swap-candidate-card.tsx`, and `user-detail.tsx`; replace with `<CollectionBadge />`.

**Location:** `src/components/badges/collection-badge.tsx` (sibling of the hoisted `DiscontinuedBadge` from R4).

---

### R7. `StatCard` / `StatItem`

Optional, lower priority. Standardises the stats-strip + collection-stats + user profile stat blocks (Section 4.6).

```tsx
type StatItemProps = {
  value: string
  label: string
  hint?: string   // optional small line under the label
}
```

`StatGroup` wraps a flex-wrap row of `StatItem`s with the existing `mx-auto flex w-full max-w-3xl flex-wrap justify-center gap-8 ...` rhythm.

## 6. Per-Element Recommendation Summary

| Element | Current location | Reuse signal | Recommendation |
|---|---|---|---|
| All `src/components/ui/*` primitives | `src/components/ui/` | Every module | **Keep as-is.** |
| `SearchInput` | `src/components/search.tsx` | 6 callers / 4 modules | **Keep.** Add hook (R6) to unify debounce behaviour. |
| `PageHeader` family | `src/components/page-header.tsx` | All route pages | **Keep.** |
| `Navbar`, `Footer`, `Logo`, `Main`, `Breadcrumbs`, `JsonLd` | `src/components/` | App shell | **Keep.** |
| `PaintCard` | `src/modules/paints/components/paint-card.tsx` | 9 cross-module imports | **Hoist** (or document as canonical cross-module export). |
| `TurnstileProvider` | `src/modules/auth/components/turnstile-provider.tsx` | 7 cross-module imports | **Hoist** to `src/components/`. |
| `PaletteDragHandle` | `src/modules/palettes/components/palette-drag-handle.tsx` | 6 imports incl. recipes | **Hoist** to `src/components/dnd/`. |
| `MarkdownRenderer`, `MarkdownEditor` | `src/modules/markdown/components/` | 4 each | **Keep** — already shared module. |
| `CollectionPaintCard` | `src/modules/collection/components/` | Intra-domain | **Keep.** |
| `DiscontinuedBadge` | `src/modules/paints/components/discontinued-badge.tsx` | 3 modules | **Hoist** to `src/components/badges/` (R4). |
| `PaginationControls` | `src/modules/paints/components/pagination-controls.tsx` | 3 modules + 1 inline dup | **Hoist** to `src/components/` + delete duplicate (R3). |
| `PaginatedPaintGrid` | `src/modules/paints/components/paginated-paint-grid.tsx` | 3 modules | **Keep** in `paints`; refactor to consume shared `PaginationControls`. |
| Inline color swatch `div` (~50 sites) | scattered | 50 occurrences / 7 modules | **Extract** as `Swatch` (R1). |
| `palette-empty-state.tsx` + `recipe-empty-state.tsx` + ad-hoc empty `<p>`s | palettes / recipes / others | 2 dedicated + several ad-hoc | **Extract** as `EmptyState` (R2). |
| "Public/Private" inline badges | palettes / recipes / user | 3+ | **Extract** `VisibilityBadge` (R4). |
| Numeric count `badge badge-primary` | paints / color-wheel | 3+ | **Extract** `CountBadge` (R4). |
| Paint-card skeleton triplet | 7 sites in `loading.tsx`s and lazy sections | 7 | **Extract** `PaintCardSkeleton` (R5). |
| URL-debounced search bar | user / collection / paints | 3 | **Extract** `useDebouncedSearchParam` hook (R6). |
| Inline stat block "value + label" | marketing / collection / user | 3 | **Extract** `StatItem` / `StatGroup` (R7). |
| "In Collection" / "Owned" inline markers | paints / palettes / user | 3 | **Extract** `CollectionBadge` (R8). |
| `palette-swatch-strip.tsx` (dynamic flex-fill strip) | palettes | Intra-domain | **Keep.** Different concept from `Swatch`. |
| OG image swatches in `src/app/api/og/**` | edge runtime | N/A | **Out of scope** — different runtime, can't share React. |

## 7. Open Questions

1. **Where do hoisted module components live?** Two viable conventions:
   - `src/components/<thing>.tsx` (flat, like the current top-level shared components).
   - `src/components/<category>/<thing>.tsx` (grouped — `badges/`, `dnd/`, `paints/`).
   The audit assumes the grouped convention for items with siblings (badges, dnd) and flat for singletons (`paint-card`, `pagination-controls`, `turnstile-provider`). Pick one before R3/R4 ship.

2. **Should `Swatch` accept named theme tokens, or only hex?** All current call sites pass a hex string sourced from the database, so `hex: string` is sufficient. Revisit if/when theme-color swatches are needed elsewhere.

3. **Does extracting `PaintCard` to `src/components/paints/` violate the "no `src/components/` domain coupling" intent?** Project conventions (`CLAUDE.md`) don't forbid it explicitly, but the spirit of the domain-module rule is that domain code lives under `src/modules/<module>/`. A safer alternative is to keep `PaintCard` in `src/modules/paints/components/` and declare it a documented cross-module export. This audit does not pick a winner — flag for `/plan` time on the follow-up doc.

4. **Should `MarkdownEditor` and `MarkdownRenderer` move to `src/components/`?** They are infrastructure, not domain — but the `markdown` module already exists and works. Recommendation defers to keeping them where they are.

## 8. Out of Scope (Explicitly)

- Implementation of any extracted component — each R-item gets its own feature doc.
- Theme tokens, OKLch colour values, or `src/styles/*.css` rewrites.
- Server actions / services / types audit.
- OG image route components — separate edge runtime.
- Tests — project has no test framework configured (see `CLAUDE.md` → `## Testing`).

## Next Steps

When this audit lands, create individual feature docs for the R-items as work is prioritised — for example:

- `docs/13-application-improvements/03-swatch-component.md` (R1)
- `docs/13-application-improvements/04-empty-state-component.md` (R2)
- `docs/13-application-improvements/05-hoist-pagination-controls.md` (R3)
- `docs/13-application-improvements/06-badges-shared-package.md` (R4)
- `docs/13-application-improvements/07-paint-card-skeleton.md` (R5)
- `docs/13-application-improvements/08-debounced-search-param-hook.md` (R6)
- `docs/13-application-improvements/09-stat-card-component.md` (R7)
- `docs/13-application-improvements/10-collection-badge.md` (R8)

Each follow-up doc is scoped to a single extraction and can ship independently in any order.
