# Shared `<PageHeader>` Title and Subtitle Component

**Epic:** Marketing & Branding
**Type:** Refactor
**Status:** Done
**Branch:** `v1/refactor/title-and-subtitle-component`
**Merge into:** `v1/main`

## Summary

Every route page that has an `<h1>` constructs it the same way by hand: a `<div className="mb-8">` wrapper, an `<h1 className="text-3xl font-bold">` title, and a `<p className="text-sm text-muted-foreground">` subtitle. That boilerplate is duplicated across 17 `page.tsx` files with small drifts — some wrappers are `mb-8 flex flex-col gap-4`, some are `mb-8` plain, one uses `mb-2` + `mb-6` instead of `mb-8`, three use `text-2xl` instead of `text-3xl`, and one wraps the row with a flex `justify-between` to fit an action button. The result: visual inconsistency between pages and a heading shape that's tedious to update globally.

This refactor introduces a small set of compound components — `<PageHeader>`, `<PageTitle>`, `<PageSubtitle>` — that live in `src/components/page-header.tsx` and provide one canonical heading row for every page that needs one. They follow the same daisyUI-style class convention as `<Main>` (CSS classes `.page-header`, `.page-title`, `.page-subtitle`, etc. defined in `src/styles/page-header.css`). Every `page.tsx` with an existing `<h1>` is migrated to use them.

> **Naming note:** The user-facing input suggested calling the wrapper `Page`. The recommendation in this plan is `PageHeader` instead, because (a) `Page` would collide cognitively with Next.js' `page.tsx` route convention and (b) `PageHeader` matches the industry-standard term used by shadcn/ui examples, Tailwind UI, and most React component libraries. The "wrapper could be called page" naming is captured as an alternative in [Risks & Considerations](#risks--considerations).

> **Relationship to `<Main>`:** `<Main>` (added in `07-main-component-refactor.md`) is the page-shell wrapper that renders the semantic `<main>` element and applies width/padding tokens. `<PageHeader>` lives **inside** `<Main>` — it owns the heading row only, not the page shell. The two are independent and compose naturally:
>
> ```tsx
> <Main>
>   <PageHeader>
>     <PageTitle>Brands</PageTitle>
>     <PageSubtitle>Browse paint brands and their product lines.</PageSubtitle>
>   </PageHeader>
>   {/* page content */}
> </Main>
> ```

## Background — Common implementations of this pattern

Quick survey of how other React component systems express the same idea, since the user asked for research:

| System / Library                       | Pattern                                                                                                |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **shadcn/ui examples**                 | Compound components: `<PageHeader>`, `<PageHeaderHeading>`, `<PageHeaderDescription>` — sibling exports from one file (`page-header.tsx`). |
| **Tailwind UI templates**              | Inline `<header>` with `<h1>` + `<p>`, no shared component — duplicated per page (this is what Grimify currently does). |
| **Vercel Geist UI / Vercel templates** | `<Page.Header>` compound (`Page.Header`, `Page.Title`, `Page.Description`) — namespaced via dot syntax. |
| **Material UI**                        | No built-in `PageHeader`; ecosystem builds custom `PageHeader` over `<Typography variant="h1">` + `<Typography variant="subtitle1">`. |
| **Mantine**                            | `<Title order={1}>` + `<Text c="dimmed">` — no wrapper component, relies on layout primitives.         |
| **Chakra UI**                          | `<Heading as="h1">` + `<Text>` inside a `<Stack>` — no dedicated `PageHeader`.                         |
| **Ant Design**                         | First-class `<PageHeader>` component with `title`, `subTitle`, `extra`, `breadcrumb` props.            |

**Takeaway for Grimify:** The shadcn/ui sibling-exports pattern is the closest fit because (1) Grimify already uses shadcn/ui primitives via the `Card` / `CardHeader` / `CardTitle` / `CardDescription` family (same shape), (2) it matches the user's literal request `<Wrapper><Title /><SubTitle /></Wrapper>`, and (3) Grimify's no-barrel-files rule means each export should be importable directly from `@/components/page-header`. Compound dot-syntax (`<PageHeader.Title>`) is rejected because it requires attaching properties to the function and conflicts with the file-per-export bias of the project conventions.

## Acceptance Criteria

- [x] `src/components/page-header.tsx` exports three sibling components: `PageHeader`, `PageTitle`, `PageSubtitle`
- [x] `<PageHeader>` renders a `<header>` element by default; accepts a `className` prop merged via `cn()`; accepts an `actions` prop (ReactNode) for pages with title-row buttons
- [x] When `actions` is set, `<PageHeader>` switches to a `flex items-start justify-between gap-4` layout — title/subtitle on the left, actions on the right; otherwise it stays a `flex flex-col gap-1` column
- [x] `<PageTitle>` renders an `<h1>` by default; accepts a `level` prop (`1 | 2`) to switch the rendered tag, defaulting to `1`; accepts a `size` prop (`'lg' | 'md'`) where `'lg'` (default) = `text-3xl font-bold` and `'md'` = `text-2xl font-bold`
- [x] `<PageSubtitle>` renders a `<p>` element with `text-sm text-muted-foreground`; accepts a `className` prop merged via `cn()`; accepts arbitrary `children` (text or ReactNode — the `brands/[id]` website link case)
- [x] A daisyUI-style CSS file `src/styles/page-header.css` defines `.page-header`, `.page-header-row`, `.page-title`, `.page-title-md`, `.page-subtitle` — imported into `globals.css` with `@import '../styles/page-header.css' layer(components);`
- [x] All 17 `page.tsx` files listed in [Routes](#routes) are migrated; each page renders **exactly one** `<h1>` (the one inside `<PageTitle>`)
- [x] `(legal)/terms/page.tsx` is intentionally left as-is — its `<header>` block uses `text-3xl font-semibold tracking-tight` (different) and a "Last updated" sibling instead of a subtitle (different); migrating it would force the component API to grow to fit one outlier
- [x] No visual regression on the 11 pages that already use the canonical `mb-8` + `text-3xl font-bold` + `text-sm text-muted-foreground` shape; minor margin/gap drift on the 6 outlier pages is acceptable (specifically: `paints`, `collection/paints` go from `gap-4` to `gap-1`; `schemes` goes from `mb-2`/`mb-6` to `mb-8`; `user/palettes/[id]/edit` keeps `mb-8`)
- [x] All exports have JSDoc comments per `CLAUDE.md` conventions (summary, `@param`, cross-links via `{@link}`)
- [x] `npm run build` and `npm run lint` pass with no errors
- [x] No new module is created — `<PageHeader>` lives in `src/components/` because it's a cross-cutting UI primitive (matches `<Main>`, `<Navbar>`, `<Footer>`, `<Breadcrumbs>`)

## Routes

The table below groups every page with an existing `<h1>` by its current heading shape so the migration target is unambiguous.

| Current shape                                                                                          | Pages                                                                                                                                                                          | Migrated to                                                                                                  |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `<div className="mb-8"><h1 text-3xl>...</h1><p text-sm muted>...</p></div>` (canonical)                | `/admin`, `/admin/roles`, `/admin/users`, `/admin/users/[id]/edit`, `/brands`                                                                                                  | `<PageHeader><PageTitle>...</PageTitle><PageSubtitle>...</PageSubtitle></PageHeader>`                        |
| `<div className="mb-8 flex flex-col gap-4"><h1 text-3xl>...</h1><p text-sm muted>...</p></div>`        | `/paints`, `/collection/paints`                                                                                                                                                | Same as above; `gap-4` → `gap-1` (acceptable)                                                                |
| `<div className="mb-8"><h1 text-3xl>...</h1></div>` (no subtitle)                                      | `/admin/roles/[id]`, `/user/palettes/[id]/edit` (`mb-8` is on the `<h1>` itself in this one)                                                                                    | `<PageHeader><PageTitle>...</PageTitle></PageHeader>`                                                        |
| Bare `<h1 text-3xl>...</h1>` with no wrapper (lives directly inside `<Main>`)                          | `/collection`                                                                                                                                                                  | Same — wrap in `<PageHeader>`                                                                                |
| Title + subtitle in a column inside a split layout                                                     | `/palettes`                                                                                                                                                                    | Replace the inner heading column with `<PageHeader>`; the outer split layout is kept                          |
| Title row with action button — `<div className="mb-8 flex items-center justify-between gap-4"><h1>...</h1><form>...</form></div>` | `/user/palettes`                                                                                                                                                               | `<PageHeader actions={<form>...</form>}><PageTitle>...</PageTitle></PageHeader>`                              |
| Title with non-text subtitle (external link)                                                           | `/brands/[id]` — title is `{brand.name}`, subtitle is an `<a target="_blank">` to `brand.website_url`                                                                          | `<PageHeader><PageTitle>{brand.name}</PageTitle><PageSubtitle><a ...>...</a></PageSubtitle></PageHeader>`     |
| Title with dynamic count (two return branches)                                                         | `/hues/[id]`                                                                                                                                                                   | Both branches → `<PageHeader><PageTitle>{hue.name}</PageTitle><PageSubtitle>{count} paints</PageSubtitle></PageHeader>` |
| `text-2xl` size variant                                                                                | `/admin/users/[id]/collection`, `/profile/edit`, `/schemes`                                                                                                                    | `<PageTitle size="md">...</PageTitle>`                                                                       |
| `text-2xl` with `mb-2` and a `mb-6` subtitle                                                           | `/schemes`                                                                                                                                                                     | `<PageHeader><PageTitle size="md">...</PageTitle><PageSubtitle>...</PageSubtitle></PageHeader>` (margins normalize to `mb-8`) |
| `text-3xl font-semibold tracking-tight` + "Last updated" sibling (not a subtitle)                       | `/(legal)/terms`                                                                                                                                                               | **Out of scope** — keep as-is; see [Out-of-scope pages](#out-of-scope-pages)                                  |

**Total page.tsx files migrated:** 17 (terms is the one excluded).

### Out-of-scope pages

- **`/(legal)/terms/page.tsx`** — Uses `text-3xl font-semibold tracking-tight` (different weight + tracking) and a "Last updated: …" sibling that is **not** a generic subtitle. It also lives inside an `<article><header>` semantic structure, not in the body of a page directly. Keeping it custom prevents the `<PageHeader>` API from growing a `weight` prop or a `meta` slot just to fit one page.
- **Pages without an existing `<h1>`** — `(auth)/sign-in`, `sign-up`, `forgot-password`, `reset-password` (Card-only), `app/page.tsx` (Home — has its own marketing hero), `paints/[id]`, `palettes/[id]`, `palettes/[id]/edit`, `users/[id]`, `admin/users/[id]`, `profile/setup`. These are not in scope: the goal is to canonicalize what exists, not to add headings where the page deliberately doesn't have one.

## Key Files

| Action | File                                           | Description                                                                                                       |
| ------ | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Create | `src/components/page-header.tsx`               | `PageHeader`, `PageTitle`, `PageSubtitle` exports — sibling components in one file                                |
| Create | `src/styles/page-header.css`                   | daisyUI-style classes (`.page-header`, `.page-header-row`, `.page-title`, `.page-title-md`, `.page-subtitle`) with documented header per project convention |
| Modify | `src/app/globals.css`                          | `@import '../styles/page-header.css' layer(components);` (after the existing `main.css` import on line 21)        |
| Modify | `src/app/admin/page.tsx`                       | `<div className="mb-8"><h1>Admin Dashboard</h1><p>...</p></div>` → `<PageHeader>...</PageHeader>`                  |
| Modify | `src/app/admin/roles/page.tsx`                 | Same pattern as `/admin`                                                                                          |
| Modify | `src/app/admin/roles/[id]/page.tsx`            | Title-only variant (no subtitle)                                                                                  |
| Modify | `src/app/admin/users/page.tsx`                 | Same pattern as `/admin`                                                                                          |
| Modify | `src/app/admin/users/[id]/edit/page.tsx`       | Same pattern as `/admin`                                                                                          |
| Modify | `src/app/admin/users/[id]/collection/page.tsx` | `text-2xl` variant — `<PageTitle size="md">`                                                                       |
| Modify | `src/app/brands/page.tsx`                      | Canonical pattern                                                                                                  |
| Modify | `src/app/brands/[id]/page.tsx`                 | `<PageSubtitle>` wraps the existing `<a target="_blank">`                                                          |
| Modify | `src/app/collection/page.tsx`                  | Wrap bare `<h1>` in `<PageHeader>`                                                                                 |
| Modify | `src/app/collection/paints/page.tsx`           | `gap-4` collapses to `gap-1`                                                                                       |
| Modify | `src/app/hues/[id]/page.tsx`                   | Both return branches use `<PageHeader>`                                                                            |
| Modify | `src/app/paints/page.tsx`                      | `gap-4` collapses to `gap-1`                                                                                       |
| Modify | `src/app/palettes/page.tsx`                    | Replace inner heading column with `<PageHeader>`; keep outer split layout                                          |
| Modify | `src/app/profile/edit/page.tsx`                | `text-2xl` variant — `<PageTitle size="md">`                                                                        |
| Modify | `src/app/schemes/page.tsx`                     | `text-2xl` variant; `mb-2`/`mb-6` normalize to `mb-8`                                                              |
| Modify | `src/app/user/palettes/[id]/edit/page.tsx`     | Title-only with `mb-8`                                                                                              |
| Modify | `src/app/user/palettes/page.tsx`               | Action-button variant — `<PageHeader actions={<form>...</form>}>`                                                  |
| Skip   | `src/app/(legal)/terms/page.tsx`               | Out of scope (different heading shape — see [Out-of-scope pages](#out-of-scope-pages))                              |

## Implementation Plan

### Module placement

`<PageHeader>` is a cross-cutting layout primitive — every route page uses it, and there is no domain logic involved. It belongs in `src/components/` alongside the other global primitives (`main.tsx`, `navbar.tsx`, `footer.tsx`, `breadcrumbs.tsx`, `logo.tsx`, `search.tsx`). It is **not** placed under `src/components/ui/` — that directory is reserved for low-level shadcn/daisyUI primitives that higher-level components compose. `<PageHeader>` is itself a higher-level composition.

It is also **not** placed under `src/modules/` — there is no domain that owns "the page heading". Per `CLAUDE.md`, modules encapsulate a single domain; `<PageHeader>` is shared across every domain.

No new module is created. Per `CLAUDE.md`, no barrel/index re-export file is created either — pages import `PageHeader`, `PageTitle`, `PageSubtitle` directly from `@/components/page-header`.

### Step 1 — Component + CSS

Create `src/styles/page-header.css` following the daisyUI-style header convention shared with `main.css`, `card.css`, etc.:

```css
/*
 * Page Header
 *
 * Heading row used by every route page that has a title (and optional subtitle
 * or action). Sits inside <Main> and is independent of the page-shell wrapper.
 *
 * No daisyUI counterpart — this is a project-local layout primitive that
 * follows the same `.component-variant` naming convention as the rest of
 * the styles directory.
 *
 * Classes:
 *   Wrapper:   .page-header        — Column layout (title above subtitle)
 *              .page-header-row    — Row layout (title/subtitle on left, actions on right)
 *   Title:     .page-title         — text-3xl font-bold (default)
 *              .page-title-md      — text-2xl font-bold (smaller variant)
 *   Subtitle:  .page-subtitle      — text-sm text-muted-foreground
 */

/* -------------------------------------------------------------------------
 * Wrapper
 * ----------------------------------------------------------------------- */
.page-header { @apply mb-8 flex flex-col gap-1; }

.page-header-row { @apply mb-8 flex items-start justify-between gap-4; }

/* -------------------------------------------------------------------------
 * Title
 * ----------------------------------------------------------------------- */
.page-title { @apply text-3xl font-bold; }

.page-title-md { @apply text-2xl font-bold; }

/* -------------------------------------------------------------------------
 * Subtitle
 * ----------------------------------------------------------------------- */
.page-subtitle { @apply text-sm text-muted-foreground; }
```

Wire it in `src/app/globals.css` (after the `main.css` import on line 21):

```css
@import '../styles/page-header.css' layer(components);
```

Create `src/components/page-header.tsx`:

```tsx
import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/utils'

/** Size tokens for {@link PageTitle}. */
export type PageTitleSize = 'lg' | 'md'

/** Heading level for {@link PageTitle}. Defaults to `1`. */
export type PageTitleLevel = 1 | 2

/**
 * Props for {@link PageHeader}.
 */
export interface PageHeaderProps extends HTMLAttributes<HTMLElement> {
  /**
   * Optional action slot rendered to the right of the title/subtitle column.
   * When set, the wrapper switches to a row layout. Use for title-row buttons
   * or forms (e.g. "New palette" on `/user/palettes`).
   */
  actions?: ReactNode
  children: ReactNode
}

/**
 * Heading row for a route page.
 *
 * Renders a `<header>` element. By default lays out children in a column
 * (title above subtitle). Pass `actions` to render a sibling slot on the
 * right and switch the wrapper to a row layout.
 *
 * Compose with {@link PageTitle} and {@link PageSubtitle}:
 *
 * ```tsx
 * <PageHeader>
 *   <PageTitle>Brands</PageTitle>
 *   <PageSubtitle>Browse paint brands and their product lines.</PageSubtitle>
 * </PageHeader>
 * ```
 *
 * @param props.actions   Optional action slot (button, form, etc.).
 * @param props.className Additional classes merged via {@link cn}.
 */
export function PageHeader({
  actions,
  className,
  children,
  ...rest
}: PageHeaderProps) {
  if (actions) {
    return (
      <header className={cn('page-header-row', className)} {...rest}>
        <div className="flex flex-col gap-1">{children}</div>
        <div>{actions}</div>
      </header>
    )
  }
  return (
    <header className={cn('page-header', className)} {...rest}>
      {children}
    </header>
  )
}

/**
 * Props for {@link PageTitle}.
 */
export interface PageTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  /** Heading level. Defaults to `1`. Use `2` only if the page already has another `<h1>`. */
  level?: PageTitleLevel
  /** Size token. Defaults to `'lg'` (text-3xl). Use `'md'` (text-2xl) for narrower contexts. */
  size?: PageTitleSize
  children: ReactNode
}

/**
 * Page heading rendered inside {@link PageHeader}.
 *
 * Defaults to an `<h1>` with `text-3xl font-bold`. Use `level={2}` only when
 * the page legitimately has another `<h1>` (rare). Use `size="md"` for pages
 * that previously used `text-2xl`.
 *
 * @param props.level Heading level — `1` (default) or `2`.
 * @param props.size  Size token — `'lg'` (default) or `'md'`.
 */
export function PageTitle({
  level = 1,
  size = 'lg',
  className,
  children,
  ...rest
}: PageTitleProps) {
  const Tag = (level === 2 ? 'h2' : 'h1') as 'h1' | 'h2'
  return (
    <Tag
      className={cn(size === 'md' ? 'page-title-md' : 'page-title', className)}
      {...rest}
    >
      {children}
    </Tag>
  )
}

/**
 * Props for {@link PageSubtitle}.
 */
export interface PageSubtitleProps extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode
}

/**
 * Subtitle rendered inside {@link PageHeader} below the {@link PageTitle}.
 *
 * Renders a `<p className="page-subtitle">` (text-sm, muted). Children may be
 * plain text or arbitrary ReactNodes — see `/brands/[id]` which renders an
 * external link as the subtitle.
 *
 * @param props.className Additional classes merged via {@link cn}.
 */
export function PageSubtitle({
  className,
  children,
  ...rest
}: PageSubtitleProps) {
  return (
    <p className={cn('page-subtitle', className)} {...rest}>
      {children}
    </p>
  )
}
```

### Step 2 — Migrate canonical pages first (low risk)

These 11 pages all have the same shape today (`<div className="mb-8"><h1 text-3xl>...</h1><p text-sm muted>...</p></div>`, give or take a `flex flex-col gap-4` on the wrapper). Migrate them in one batch — diff is mechanical:

```diff
- <div className="mb-8">
-   <h1 className="text-3xl font-bold">Admin Dashboard</h1>
-   <p className="text-sm text-muted-foreground">
-     Overview of user and role statistics.
-   </p>
- </div>
+ <PageHeader>
+   <PageTitle>Admin Dashboard</PageTitle>
+   <PageSubtitle>Overview of user and role statistics.</PageSubtitle>
+ </PageHeader>
```

Add the import once per file:

```tsx
import { PageHeader, PageTitle, PageSubtitle } from '@/components/page-header'
```

Files in this batch:

1. `src/app/admin/page.tsx`
2. `src/app/admin/roles/page.tsx`
3. `src/app/admin/users/page.tsx`
4. `src/app/admin/users/[id]/edit/page.tsx`
5. `src/app/brands/page.tsx`
6. `src/app/collection/paints/page.tsx`
7. `src/app/paints/page.tsx`
8. `src/app/palettes/page.tsx` (heading column only — keep the outer split layout)
9. `src/app/hues/[id]/page.tsx` (both branches)
10. `src/app/brands/[id]/page.tsx` (subtitle is the external link `<a>`)
11. `src/app/collection/page.tsx` (wrap the bare `<h1>` — there is no current wrapper, but the result still uses `<PageHeader>` for consistency)

### Step 3 — Title-only pages

These pages have a title but no subtitle:

1. `src/app/admin/roles/[id]/page.tsx` — `<PageHeader><PageTitle>Role Detail</PageTitle></PageHeader>`
2. `src/app/user/palettes/[id]/edit/page.tsx` — `<PageHeader><PageTitle>Edit palette</PageTitle></PageHeader>` (drop the inline `mb-8` on the `<h1>` — the wrapper now owns it)

### Step 4 — `text-2xl` size variants

Three pages currently use `text-2xl` for the title. Migrate with `<PageTitle size="md">`:

1. `src/app/admin/users/[id]/collection/page.tsx` — title is `{display_name ?? email ?? 'Unknown user'}`, subtitle is the paint count
2. `src/app/profile/edit/page.tsx` — title is "Edit Profile", no subtitle. The page lives inside an inner `max-w-md` column; `<PageHeader>` will sit at the top of that column.
3. `src/app/schemes/page.tsx` — title "Color Scheme Explorer" with subtitle. Spacing normalizes from `mb-2`/`mb-6` to the standard `mb-8` — minor visual diff, accepted.

### Step 5 — Action-button variant

`src/app/user/palettes/page.tsx` is the only page with a title-row action button:

```tsx
<PageHeader
  actions={
    <form action="/user/palettes/new" method="post">
      <button type="submit" className="btn btn-primary btn-sm">
        New palette
      </button>
    </form>
  }
>
  <PageTitle>My palettes</PageTitle>
</PageHeader>
```

### Step 6 — Verify

1. `npm run build` and `npm run lint` pass with no errors.
2. Click through every migrated route in dev (`npm run dev`). Visual check: each page's title + subtitle look identical to (or visually equivalent to) the pre-refactor capture. The 5 known minor margin/gap diffs (`gap-4 → gap-1` on `paints` and `collection/paints`; `mb-2/mb-6 → mb-8` on `schemes`) are expected and acceptable.
3. View source on each migrated page (or use devtools): exactly one `<h1>` per page, inside a `<header>` element.
4. Devtools accessibility tree: each page exposes one heading at level 1 with the expected text.
5. `/(legal)/terms` is **unchanged** — verify it still renders with `text-3xl font-semibold tracking-tight` and the "Last updated" line.

### Order of operations

1. Step 1 (component + CSS) — must land first; everything else depends on it.
2. Step 2 (canonical pages) — biggest batch, mechanical diff. Land as one commit so the migration is reviewable as a single bulk find-replace.
3. Step 3 (title-only pages) — small batch.
4. Step 4 (size variants) — small batch.
5. Step 5 (action-button variant) — single file.
6. Step 6 — final verification + visual diff.

## Risks & Considerations

- **Naming: `Page` vs. `PageHeader`.** The user-facing input said the wrapper "could be called page". This plan recommends `PageHeader` because (a) `Page` would clash cognitively with Next.js' `page.tsx` route convention — the route file is already the "page", and a component named `Page` rendered inside it is confusing — and (b) `PageHeader` matches the term used by shadcn/ui examples, Ant Design, Vercel templates, and most React component systems. If you prefer `Page` + `Title` + `SubTitle` to match the literal request, swap the names before Step 1; nothing else in the plan changes. (Recommendation: stick with `PageHeader`.)
- **`<header>` semantics.** `<PageHeader>` renders a `<header>` element. HTML allows multiple `<header>` elements per page (one per "sectioning content" element), so this does not conflict with `<header>` inside `<Navbar>` or `<article>`. The rendered tree still has exactly one `<h1>` per page, which is the rule that actually matters.
- **`mb-8` lives on the wrapper, not on the page.** Today, several pages rely on the heading wrapper's `mb-8` to space the title row from the rest of the page. After migration, that `mb-8` lives on `.page-header` / `.page-header-row` — pages don't need to reinstate it. If a page had a different bottom margin (e.g. `schemes` used `mb-2` on the title and `mb-6` on the subtitle), the spacing normalizes to `mb-8`.
- **`gap-4` → `gap-1` on `paints` and `collection/paints`.** These pages currently use `mb-8 flex flex-col gap-4` for the heading wrapper, which adds extra space between the `<h1>` and the `<p>`. The new `.page-header` uses `gap-1` to match the more common pattern (admin pages, brands page). This is a small visual change — verify it looks correct in the browser, but expect to keep it.
- **`brands/[id]` subtitle is an `<a>`, not a `<p>` of text.** The brand-detail page's subtitle is a link to the brand's website. `<PageSubtitle>` accepts arbitrary children, so the link drops in:
  ```tsx
  <PageSubtitle>
    <a href={brand.website_url} target="_blank" rel="noopener" className="...">
      {brand.website_url}
    </a>
  </PageSubtitle>
  ```
  But `<PageSubtitle>` renders as a `<p>`, and `<a>` inside `<p>` is fine. Just verify the existing flex-icon styling on the link still renders correctly inside the `text-sm text-muted-foreground` paragraph. If not, fall back to passing the link as plain children with explicit className overrides.
- **`/(legal)/terms` is intentionally not migrated.** Its heading uses `font-semibold tracking-tight` and has a "Last updated" line that is **not** a description (it's metadata). Forcing it through `<PageHeader>` would either (a) require new props (`weight`, `meta`), or (b) drop the date line, which is undesirable. Skipping it is the right call. If the team later wants a unified "page header with metadata" pattern, that's a separate design.
- **Tests.** `CLAUDE.md` says framework: none. Verification is via `npm run build` / `npm run lint` plus manual browser checks. There are no test files to add or update.
- **Coordination with future work.** If a future page wants a heading shape that doesn't fit (`<PageTitle size="xl">`, breadcrumb-above-title patterns, icon-prefixed titles), prefer adding a token to `<PageHeader>` over forking the component. Only if the new shape would force the API to grow uncomfortably should a one-off custom heading be considered (the same rule that exempts `(legal)/terms`).
- **No barrel file.** Per `CLAUDE.md`, do not create `src/components/index.ts` or similar. Pages import the three components directly from `@/components/page-header`.
- **Module placement.** `<PageHeader>` lives in `src/components/`, not `src/modules/<module>/`. There is no domain that owns "the page heading"; it's a cross-cutting primitive like `<Main>` and `<Breadcrumbs>`.
