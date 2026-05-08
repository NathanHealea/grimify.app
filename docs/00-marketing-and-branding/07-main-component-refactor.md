# Shared `<Main>` Page Wrapper Component

**Epic:** Marketing & Branding
**Type:** Refactor
**Status:** Completed
**Branch:** `v1/refactor/main-component`
**Merge into:** `v1/main`

## Summary

Every `src/app/**/page.tsx` declares its own top-level wrapper today, and the wrappers don't agree with each other — most use `<div className="mx-auto w-full max-w-6xl px-4 py-12">`, a few use `<main>` directly with different classes (`/schemes`, `/`), and the (auth)/(legal)/admin route groups each define their own wrapping `<main>` inside the layout. The result is inconsistent gutters, mixed semantic markup (some pages render zero `<main>` elements; others render two), and a width/padding decision duplicated across every page.

This refactor introduces a single `<Main>` component (`src/components/main.tsx`) that renders the semantic `<main>` element, applies the standard centered-container pattern, and exposes width as a prop. Every `page.tsx` swaps its top-level wrapper for `<Main>`, and the route-group layouts that currently render `<main>` are updated so each rendered page has **exactly one** `<main>` element.

> **Note on "Next.js Main as a base":** Next.js App Router does not export a `Main` component (that's a Pages Router / `_document` artifact). The right base is the native HTML `<main>` element. The component below is a thin wrapper over `<main>` plus this project's daisyUI-style class system — it is **not** built on top of any Next.js export.

## Acceptance Criteria

- [x] `src/components/main.tsx` exports a single `<Main>` component that renders an HTML `<main>` element by default
- [x] `<Main>` accepts a `width` prop with discriminated values (`'2xl' | '3xl' | '4xl' | '5xl' | '6xl' | 'md' | 'container' | 'full'`); default is `'6xl'`
- [x] `<Main>` accepts an optional `padding` prop (`'default' | 'compact' | 'none'`) — `default` = `px-4 py-12`, `compact` = `px-4 py-8`, `none` skips padding
- [x] `<Main>` accepts an `as` prop that lets callers render a `<div>` instead of `<main>` (used inside route groups whose layout already supplies `<main>`)
- [x] `<Main>` accepts a `className` prop merged via `cn()` so callers can extend (e.g. `space-y-10`)
- [x] A daisyUI-style CSS file `src/styles/main.css` defines `.main`, `.main-2xl`, `.main-3xl`, `.main-4xl`, `.main-5xl`, `.main-6xl`, `.main-md`, `.main-container`, `.main-full`, `.main-padding`, `.main-padding-compact` — imported into `globals.css` with `@import '../styles/main.css' layer(components);`
- [x] All 28 `page.tsx` files under `src/app/` have their top-level wrapper replaced with `<Main>` (or `<Main as="div">` where a parent layout already renders `<main>`)
- [x] Each rendered page produces **exactly one** `<main>` element in the DOM (no nested `<main>`s, no missing `<main>`s)
- [x] Route-group layouts that currently render `<main>` are reconciled with the per-page `<Main>`: see [Layout reconciliation](#layout-reconciliation)
- [x] No visual regression — every page renders at the same width, padding, and position as before
- [x] The Home page (`src/app/page.tsx`) and the Schemes page (`src/app/schemes/page.tsx`) — which already use `<main>` directly — are migrated to `<Main>` with appropriate variants (Home uses `width="full"` + a layout override; Schemes uses `width="container"` + `padding="compact"`)
- [x] `npm run build` and `npm run lint` pass with no errors
- [x] No new module is created — `<Main>` lives in `src/components/` because it's a cross-cutting UI primitive (matches `src/components/navbar.tsx`, `footer.tsx`, `breadcrumbs.tsx`)

## Routes

This refactor touches every route in the app. The table below groups pages by their **current** outer container so the migration target is unambiguous. Each row's "Migrated to" column is what the page's first JSX element becomes.

| Current wrapper                                          | Pages                                                                                                                             | Migrated to                              |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `<div className="mx-auto w-full max-w-6xl px-4 py-12">`  | `/paints`, `/brands`, `/brands/[id]`, `/collection/paints`, `/hues/[id]` (both branches), `/palettes`, `/user/palettes`           | `<Main width="6xl">`                     |
| `<div className="mx-auto w-full max-w-6xl space-y-10 px-4 py-12">` | `/collection`                                                                                                          | `<Main width="6xl" className="space-y-10">` |
| `<div className="mx-auto w-full max-w-5xl px-4 py-12">`  | `/admin/users`, `/admin/users/[id]/collection`                                                                                    | `<Main as="div" width="5xl">` *(inside admin layout — see [Layout reconciliation](#layout-reconciliation))* |
| `<div className="mx-auto w-full max-w-4xl px-4 py-12">`  | `/admin/roles`, `/admin/roles/[id]`, `/paints/[id]`, `/palettes/[id]`                                                             | `<Main width="4xl">` (paints/palettes); `<Main as="div" width="4xl">` (admin) |
| `<div className="mx-auto w-full max-w-4xl">`             | `/admin`                                                                                                                          | `<Main as="div" width="4xl" padding="none">` |
| `<div className="mx-auto w-full max-w-3xl px-4 py-12">`  | `/admin/users/[id]`, `/user/palettes/[id]/edit`                                                                                   | `<Main width="3xl">` (user); `<Main as="div" width="3xl">` (admin) |
| `<div className="mx-auto w-full max-w-2xl px-4 py-12">`  | `/users/[id]`, `/admin/users/[id]/edit`                                                                                           | `<Main width="2xl">` (users); `<Main as="div" width="2xl">` (admin) |
| `<div className="flex min-h-screen w-full justify-center px-4 py-24">` (with inner `max-w-md`) | `/profile/edit`                                                                          | `<Main width="md" padding="none" className="flex min-h-screen items-start justify-center py-24">` *(see [Special-case pages](#special-case-pages))* |
| `<div className="flex min-h-screen w-full items-center justify-center px-4 py-24">` | `/profile/setup`                                                                                       | Same as `/profile/edit` but `items-center`             |
| `<main className="flex flex-1 flex-col">`                | `/` (home)                                                                                                                        | `<Main width="full" padding="none" className="flex flex-1 flex-col">` |
| `<main className="container mx-auto px-4 py-8">`         | `/schemes`                                                                                                                        | `<Main width="container" padding="compact">` |
| `<Card className="w-full max-w-md">`                     | `(auth)/sign-in`, `sign-up`, `forgot-password`, `reset-password`                                                                  | Wrap the existing `<Card>` in `<Main width="md" padding="none">` (see [Layout reconciliation](#layout-reconciliation)) |
| `<article className="space-y-6">`                        | `(legal)/terms`                                                                                                                   | Keep `<article>`, but wrap in `<Main width="3xl">` after layout reconciliation |
| `redirect()` only                                        | `/palettes/[id]/edit` (legacy redirect — no JSX), `/palettes/[id]/edit/page.tsx`                                                  | No change — page returns no JSX         |

**Total page.tsx files touched:** 28 (29 listed above; one is a redirect-only file with no JSX).

## Layout reconciliation

Three route-group layouts currently render their own `<main>`. After this refactor each page renders its own `<Main>` (which renders `<main>`), so each layout's `<main>` must be reconciled to keep exactly one `<main>` per rendered page.

| Layout                                                              | Current state                                                                                       | New state                                                                                                                                  |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/app/(legal)/layout.tsx`                                        | Renders `<main className="mx-auto w-full max-w-3xl px-6 py-12">` around children                    | Renders `<>{children}</>` (or a styling-only `<div>` if needed). The `(legal)/terms/page.tsx` becomes `<Main width="3xl" className="px-6"><article>…</article></Main>`. |
| `src/app/(auth)/layout.tsx`                                         | Renders `<div className="flex min-h-screen w-full flex-col items-center justify-center …">`        | Renders `<Main width="full" padding="none" className="flex min-h-screen w-full flex-col items-center justify-center gap-8 px-4 py-24">`. Auth pages stop being responsible for their own `<main>` semantics — they remain `<Card>`-only. |
| `src/modules/admin/components/admin-layout-client.tsx`              | Renders `<main className="flex-1 overflow-auto p-6">{children}</main>` inside a flex shell          | Stays as-is — the admin shell **needs** the `<main>` for the sidebar layout. Admin pages therefore use `<Main as="div" …>` so they don't double-wrap. |

The first two changes mean the auth and legal layouts no longer emit a `<main>` themselves — the page-level `<Main>` does. The admin shell keeps its `<main>` and admin pages opt out via `as="div"`. After this work, every rendered admin page still emits exactly one `<main>` (the layout's), and every other rendered page emits exactly one `<main>` (the page's).

## Special-case pages

A handful of pages have non-standard wrappers that need a small amount of judgment during migration:

1. **`/profile/setup` and `/profile/edit`** — Use a vertical centerer pattern (`flex min-h-screen w-full {items-center,justify-center} px-4 py-24`) wrapping a `max-w-md` card. After migration, `<Main>` becomes the centerer (semantic `<main>` + flex layout) and the inner `max-w-md` `<div>` stays as the card-width column.
2. **`/` (Home)** — Uses `<main className="flex flex-1 flex-col">` to fill the remaining height between `<Navbar>` and `<Footer>`. Migrate to `<Main width="full" padding="none" className="flex flex-1 flex-col">` so the flex behavior is preserved.
3. **`/schemes`** — Uses Tailwind's `container` utility, not `max-w-Nxl`. Add `'container'` to the `width` enum so this page maps cleanly to `<Main width="container" padding="compact">`.
4. **Auth pages** — `<Card className="w-full max-w-md">` is fine to keep as the inner card. The semantic `<main>` moves up into `(auth)/layout.tsx` (see [Layout reconciliation](#layout-reconciliation)). Auth pages themselves continue to return `<Card>` only.
5. **`/admin`** — Has no padding (`max-w-4xl` only, no `px-* py-*`). Map to `<Main as="div" width="4xl" padding="none">`.
6. **`/palettes/[id]/edit/page.tsx`** — A redirect-only page with no JSX. Skip.

## Key Files

| Action | File                                                | Description                                                                                            |
| ------ | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Create | `src/components/main.tsx`                           | `<Main>` component — `as`, `width`, `padding`, `className` props; renders `<main>` by default          |
| Create | `src/styles/main.css`                               | daisyUI-style `.main` + width/padding modifier classes; documented header per project convention       |
| Modify | `src/app/globals.css`                               | `@import '../styles/main.css' layer(components);`                                                      |
| Modify | `src/app/(auth)/layout.tsx`                         | Replace centerer `<div>` with `<Main width="full" padding="none" className="…">`                       |
| Modify | `src/app/(legal)/layout.tsx`                        | Drop the `<main>` wrapper; let pages own it                                                            |
| Modify | `src/app/(legal)/terms/page.tsx`                    | Wrap `<article>` in `<Main width="3xl" className="px-6">`                                              |
| Modify | `src/app/page.tsx` (Home)                           | `<main className="flex flex-1 flex-col">` → `<Main width="full" padding="none" className="flex flex-1 flex-col">` |
| Modify | `src/app/loading.tsx` *(if not yet refactored under loading-screen plan)* | Use `<Main>` for outer shell to keep skeleton aligned with real pages              |
| Modify | `src/app/wheel/loading.tsx`                         | Same — outer `<Main>` so the skeleton matches the page outline                                         |
| Modify | `src/app/paints/page.tsx`                           | `max-w-6xl` div → `<Main width="6xl">`                                                                 |
| Modify | `src/app/paints/[id]/page.tsx`                      | `max-w-4xl` div → `<Main width="4xl">`                                                                 |
| Modify | `src/app/schemes/page.tsx`                          | `<main className="container …">` → `<Main width="container" padding="compact">`                       |
| Modify | `src/app/palettes/page.tsx`                         | `<Main width="6xl">`                                                                                   |
| Modify | `src/app/palettes/[id]/page.tsx`                    | `<Main width="4xl">`                                                                                   |
| Modify | `src/app/user/palettes/page.tsx`                    | `<Main width="6xl">`                                                                                   |
| Modify | `src/app/user/palettes/[id]/edit/page.tsx`          | `<Main width="3xl">`                                                                                   |
| Modify | `src/app/collection/page.tsx`                       | `<Main width="6xl" className="space-y-10">`                                                            |
| Modify | `src/app/collection/paints/page.tsx`                | `<Main width="6xl">`                                                                                   |
| Modify | `src/app/brands/page.tsx`                           | `<Main width="6xl">`                                                                                   |
| Modify | `src/app/brands/[id]/page.tsx`                      | `<Main width="6xl">`                                                                                   |
| Modify | `src/app/hues/[id]/page.tsx`                        | Both `return` branches → `<Main width="6xl">`                                                          |
| Modify | `src/app/users/[id]/page.tsx`                       | `<Main width="2xl">`                                                                                   |
| Modify | `src/app/profile/setup/page.tsx`                    | `<Main width="md" padding="none" className="flex min-h-screen items-center justify-center py-24">`    |
| Modify | `src/app/profile/edit/page.tsx`                     | `<Main width="md" padding="none" className="flex min-h-screen items-start justify-center py-24">`     |
| Modify | `src/app/admin/page.tsx`                            | `<Main as="div" width="4xl" padding="none">`                                                           |
| Modify | `src/app/admin/users/page.tsx`                      | `<Main as="div" width="5xl">`                                                                          |
| Modify | `src/app/admin/users/[id]/page.tsx`                 | `<Main as="div" width="3xl">`                                                                          |
| Modify | `src/app/admin/users/[id]/edit/page.tsx`            | `<Main as="div" width="2xl">`                                                                          |
| Modify | `src/app/admin/users/[id]/collection/page.tsx`      | `<Main as="div" width="5xl">`                                                                          |
| Modify | `src/app/admin/roles/page.tsx`                      | `<Main as="div" width="4xl">`                                                                          |
| Modify | `src/app/admin/roles/[id]/page.tsx`                 | `<Main as="div" width="4xl">`                                                                          |
| Modify | `src/app/(auth)/sign-in/page.tsx`                   | No change — `<Main>` is provided by `(auth)/layout.tsx` after reconciliation                           |
| Modify | `src/app/(auth)/sign-up/page.tsx`                   | No change                                                                                              |
| Modify | `src/app/(auth)/forgot-password/page.tsx`           | No change                                                                                              |
| Modify | `src/app/(auth)/reset-password/page.tsx`            | No change                                                                                              |

## Implementation Plan

### Module placement

`<Main>` is a cross-cutting layout primitive — every route in the app uses it, and there is no domain logic involved. It belongs in `src/components/` alongside the existing global primitives (`navbar.tsx`, `footer.tsx`, `breadcrumbs.tsx`, `logo.tsx`, `search.tsx`). It is **not** placed under `src/components/ui/` because that directory is reserved for low-level shadcn/daisyUI primitives that are themselves composed by higher-level components — `<Main>` is the higher-level composition.

No new module under `src/modules/` is created.

### Step 1 — Component + CSS

Create `src/styles/main.css` following the daisyUI-style header convention from existing files in `src/styles/`:

```css
/*
 * Main
 *
 * Centered page-shell wrapper used by every route page in the app.
 * Provides consistent width, padding, and semantic <main> element.
 *
 * Classes:
 *   Base:    .main                — mx-auto w-full
 *   Widths:  .main-2xl            — max-w-2xl
 *            .main-3xl            — max-w-3xl
 *            .main-4xl            — max-w-4xl
 *            .main-5xl            — max-w-5xl
 *            .main-6xl            — max-w-6xl
 *            .main-md             — max-w-md
 *            .main-container      — uses Tailwind's container utility
 *            .main-full           — no max-width
 *   Padding: .main-padding        — px-4 py-12 (default)
 *            .main-padding-compact — px-4 py-8
 */

.main { @apply mx-auto w-full; }
.main-2xl { @apply max-w-2xl; }
.main-3xl { @apply max-w-3xl; }
.main-4xl { @apply max-w-4xl; }
.main-5xl { @apply max-w-5xl; }
.main-6xl { @apply max-w-6xl; }
.main-md { @apply max-w-md; }
.main-container { @apply container; }
.main-full {} /* no max-width */
.main-padding { @apply px-4 py-12; }
.main-padding-compact { @apply px-4 py-8; }
```

Wire it in `src/app/globals.css`:

```css
@import '../styles/main.css' layer(components);
```

Create `src/components/main.tsx`:

```tsx
import type { ElementType, HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Width tokens for {@link Main}. */
type MainWidth = '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | 'md' | 'container' | 'full'

/** Padding tokens for {@link Main}. */
type MainPadding = 'default' | 'compact' | 'none'

/** Props for {@link Main}. */
interface MainProps extends HTMLAttributes<HTMLElement> {
  /** Element to render. Defaults to `'main'`. Use `'div'` inside a layout that already renders `<main>` (e.g. `/admin/*`). */
  as?: 'main' | 'div' | 'section'
  /** Max-width token. Defaults to `'6xl'`. */
  width?: MainWidth
  /** Padding token. Defaults to `'default'` (`px-4 py-12`). */
  padding?: MainPadding
  children: ReactNode
}

/**
 * Centered page-shell wrapper used by every route page.
 *
 * Renders a semantic `<main>` element (or the element specified by `as`)
 * with the standard width and padding tokens for the app. Page components
 * should use this in place of bespoke `<div className="mx-auto …">` wrappers
 * so that gutters, max-widths, and semantics stay consistent across routes.
 *
 * @param props.as       — element to render; defaults to `'main'`
 * @param props.width    — max-width token; defaults to `'6xl'`
 * @param props.padding  — padding token; defaults to `'default'`
 * @param props.className — additional classes merged via {@link cn}
 */
export function Main({
  as = 'main',
  width = '6xl',
  padding = 'default',
  className,
  children,
  ...rest
}: MainProps) {
  const Tag = as as ElementType
  return (
    <Tag
      className={cn(
        'main',
        `main-${width}`,
        padding === 'default' && 'main-padding',
        padding === 'compact' && 'main-padding-compact',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  )
}
```

### Step 2 — Reconcile route-group layouts

In order so each step is verifiable in isolation:

1. **`src/app/(legal)/layout.tsx`** — replace `<main>…</main>` with `<>{children}</>`.
2. **`src/app/(legal)/terms/page.tsx`** — wrap the existing `<article>` in `<Main width="3xl" className="px-6">` (legal layout used `px-6`, not the default `px-4`).
3. **`src/app/(auth)/layout.tsx`** — replace the centerer `<div>` with `<Main width="full" padding="none" className="flex min-h-screen w-full flex-col items-center justify-center gap-8 px-4 py-24">`.
4. **`src/modules/admin/components/admin-layout-client.tsx`** — leave the existing `<main>` as-is. Admin pages will use `<Main as="div">`.

After this step, the auth and legal route groups already render exactly one `<main>` per page (the layout's), even though pages inside them haven't been migrated yet. The admin group continues to render exactly one `<main>` (the layout's). All other pages still render zero or one `<main>` — the page migrations in Step 3 fix that.

### Step 3 — Migrate every `page.tsx`

Migrate pages in the following order, committing one batch at a time so the diff stays reviewable:

1. **Standard `max-w-6xl` pages** (8 files) — `/paints`, `/brands`, `/brands/[id]`, `/collection/paints`, `/hues/[id]` (both branches), `/palettes`, `/user/palettes`, `/collection`. All become `<Main width="6xl">` (collection adds `className="space-y-10"`).
2. **Standard `max-w-4xl` and `max-w-3xl` non-admin pages** — `/paints/[id]`, `/palettes/[id]`, `/user/palettes/[id]/edit`, `/users/[id]`.
3. **Admin pages** (8 files) — all use `<Main as="div" …>` because the admin layout already supplies `<main>`.
4. **Special pages** — `/` (Home), `/schemes`, `/profile/setup`, `/profile/edit`. Each requires a per-page judgment from [Special-case pages](#special-case-pages).

For every page touched, the diff should be:

```tsx
- <div className="mx-auto w-full max-w-6xl px-4 py-12">
+ <Main width="6xl">
   …
- </div>
+ </Main>
```

…with the matching `import { Main } from '@/components/main'` added.

### Step 4 — Verify

1. `npm run build` and `npm run lint` pass with no errors.
2. Click through every route in dev (`npm run dev`). Visual check: width and padding match the pre-refactor capture.
3. View source on each page (or use devtools): exactly one `<main>` element renders. No nested `<main>` and no missing `<main>`.
4. Lighthouse / accessibility check (one quick pass): the document has a single landmark of role `main`.
5. Tab-through keyboard test on a representative page (e.g. `/paints`): focus order is unchanged.

### Step 5 — (Optional) follow-up cleanup

- The new-loading-screen plan (`docs/00-marketing-and-branding/06-new-loading-screen.md`) should consume `<Main>` for its outer skeleton shell — coordinate so both refactors agree on the wrapper.
- Consider exposing a Storybook-equivalent or live-preview index of the `width` tokens. (Out of scope for this refactor; only mention if the team adds Storybook later.)

### Order of operations

1. Step 1 (component + CSS) — must land first; everything else depends on it.
2. Step 2 (layout reconciliation) — second; without this, migrating an auth or legal page would create a nested `<main>`.
3. Step 3 (page migrations) — batched as listed above.
4. Step 4 — final verification.

## Risks & Considerations

- **Nested `<main>` is invalid HTML.** The acceptance criteria call out the "exactly one `<main>` per page" rule because it's easy to violate during a partial migration — e.g. switching the legal layout's `<main>` to a `<>` *after* migrating `(legal)/terms/page.tsx` to `<Main>`, instead of before. Stick to the order in Step 2 → Step 3.
- **Admin pages must not promote to `<main>`.** The admin layout's `<main>` is needed for the sidebar shell. If someone forgets `as="div"` on an admin page, the page would emit a nested `<main>`. Lint can't catch this — manual review is the guard.
- **Visual diff is the regression test.** There is no test harness in this project (`## Testing` in `CLAUDE.md` says framework: none). The only verification is `npm run build`/`npm run lint` plus manual browser checks. Capture screenshots of representative pages before the refactor and compare after.
- **Width tokens vs. arbitrary widths.** Locking width to a fixed enum prevents one-off divergence — but the existing widths in the codebase (`max-w-2xl, 3xl, 4xl, 5xl, 6xl, md, container, full`) all need to be in the enum from the start. Anything missing forces a one-off `className` override that defeats the point.
- **Coordination with the loading-screen plan.** That plan calls out that loading skeletons must use the same outer shell as the page they replace. Once `<Main>` exists, every `loading.tsx` should use it too — otherwise the skeleton's width/padding can drift from the real page's. Land this refactor before the loading-screen work, or have the loading-screen implementer use `<Main>` as part of their step 1.
- **`flex flex-1 flex-col` on Home.** The Home page must keep its flex-fill behavior so the marketing footer sits at the bottom of the viewport on short content. The `padding="none" className="flex flex-1 flex-col"` combination preserves it; verify visually after migration.
- **No barrel file.** Per `CLAUDE.md`, do not create `src/components/index.ts`. Pages import `Main` directly from `@/components/main`.
- **Don't add an `<h1>` slot.** It's tempting to give `<Main>` a `title` prop that renders a heading — resist. Each page already constructs its heading row differently (icon + title + meta, breadcrumb + title, action buttons inline). A title prop would either fork into many overrides or force every page to bend to one shape.
