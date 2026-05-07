# Per-Page Skeleton Loading Screens

**Epic:** Marketing & Branding
**Type:** Enhancement
**Status:** Done
**Branch:** `v1/enhancement/new-loading-screen`
**Merge into:** `v1/main`

## Summary

Replace the generic full-screen pulsing circle in `src/app/loading.tsx` and `src/app/wheel/loading.tsx` with per-route skeleton screens that mirror the actual page layout. Today only `src/app/paints/loading.tsx` has a layout-aware skeleton — every other route falls back to the root `loading.tsx`, which renders an unrelated centered grey circle that doesn't preview any of the page chrome about to mount. This enhancement scaffolds a small set of reusable skeleton primitives, then adds (or rewrites) a `loading.tsx` for each top-level route so the loading view matches the outline of the page being loaded.

## Acceptance Criteria

- [x] Reusable skeleton primitives live in `src/components/ui/skeleton.tsx` and matching CSS in `src/styles/skeleton.css` — base `.skeleton`, plus shape modifiers (`.skeleton-circle`, `.skeleton-text`, `.skeleton-avatar`)
- [x] Root `src/app/loading.tsx` renders a generic page-shell skeleton (header line + content block stack inside the same `mx-auto w-full max-w-6xl px-4 py-12` shell most pages use) — never a centered orb
- [x] Each route below has a `loading.tsx` whose visual outline matches its `page.tsx` (heading area, sub-text, primary content block, action buttons, etc.) — see [Routes](#routes) for the full list
- [x] All skeletons use the existing `bg-muted` token + `animate-pulse` so they respect light/dark theme
- [x] No skeleton imports live page components or services — they render purely from layout primitives
- [x] Loading screens occupy the same width and padding shell as the real page, so there is **no layout shift** when the real content swaps in
- [x] `src/app/wheel/loading.tsx` is rewritten to outline the wheel page (toolbar, large square wheel surface, side detail panel) instead of the generic orb
- [x] `src/app/paints/loading.tsx` is updated to import the shared primitives instead of inlining `animate-pulse rounded bg-muted` divs (no visual regression)
- [x] Auth pages (`/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`) get a card-shaped skeleton inside the `(auth)` layout
- [x] `npm run build` and `npm run lint` pass with no errors

## Routes

The table below pairs each route's `page.tsx` (current outline) with the `loading.tsx` to add or update. Routes that already redirect or are pure POST handlers (e.g. `/user/palettes/new`) are excluded — Next.js will not render a `loading.tsx` for them.

| Route                                    | page.tsx outline (what the skeleton mirrors)                                                  | loading.tsx        |
| ---------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------ |
| `/` (root fallback)                      | Hero + feature grid + CTA — but used as a generic fallback, so render a generic page shell    | Update             |
| `/paints`                                | H1 + sub, search bar, hue pill grid, paint card grid                                          | Update (use shared) |
| `/paints/[id]`                           | Breadcrumb, swatch + name + meta block, references list                                       | Add                |
| `/wheel`                                 | Toolbar row, large square wheel, side detail panel                                            | Update             |
| `/schemes`                               | H1 + sub, scheme picker row, paint result grid                                                | Add                |
| `/palettes`                              | H1 + "My palettes" CTA, palette card grid                                                     | Add                |
| `/palettes/[id]`                         | Palette header (name + meta), description, paint chip strip                                   | Add                |
| `/user/palettes`                         | H1 + New-palette button, palette card grid                                                    | Add                |
| `/user/palettes/[id]/edit`               | H1 + form (name, description editor, paint list editor)                                       | Add                |
| `/collection`                            | H1, stats card row, search row, recent palettes block                                         | Add                |
| `/collection/paints`                     | H1, search bar, paint grid                                                                    | Add                |
| `/brands`                                | H1 + sub, brand card grid                                                                     | Add                |
| `/brands/[id]`                           | Breadcrumb, H1 + website link, product line tabs, paint grid                                  | Add                |
| `/hues/[id]`                             | Hue header, paint card grid                                                                   | Add                |
| `/users/[id]`                            | Avatar + name card with bio block                                                             | Add                |
| `/profile/setup`, `/profile/edit`        | Profile form card                                                                             | Add                |
| `(auth)/sign-in`, `sign-up`, `forgot-password`, `reset-password` | Card with header, two text inputs, primary button, OAuth buttons              | Add (one shared inside `(auth)/loading.tsx`) |
| `/admin`                                 | H1, 3-up stat cards, recent users card                                                        | Add                |
| `/admin/users`                           | H1, search/filter row, table, pagination row                                                  | Add                |
| `/admin/users/[id]`                      | Profile detail card with action row                                                           | Add                |
| `/admin/users/[id]/edit`                 | Profile edit form card                                                                        | Add                |
| `/admin/users/[id]/collection`           | H1, paint grid                                                                                | Add                |
| `/admin/roles`                           | H1, role list                                                                                 | Add                |
| `/admin/roles/[id]`                      | Role detail card with member list                                                             | Add                |
| `(legal)/terms`                          | Long prose article                                                                            | Add                |

## Key Files

| Action | File                                                | Description                                                                                  |
| ------ | --------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Create | `src/components/ui/skeleton.tsx`                    | `<Skeleton>` primitive + named variants (`SkeletonCircle`, `SkeletonText`, `SkeletonAvatar`) |
| Create | `src/styles/skeleton.css`                           | daisyUI-style `.skeleton`, `.skeleton-circle`, `.skeleton-text`, `.skeleton-avatar` classes  |
| Modify | `src/app/globals.css`                               | `@import '../styles/skeleton.css' layer(components);`                                        |
| Modify | `src/app/loading.tsx`                               | Generic page-shell skeleton in the standard `max-w-6xl` shell                                |
| Modify | `src/app/wheel/loading.tsx`                         | Outline of the wheel toolbar, square wheel surface, and side panel                           |
| Modify | `src/app/paints/loading.tsx`                        | Refactor to import shared `<Skeleton>` primitives — no visual change                         |
| Create | `src/app/paints/[id]/loading.tsx`                   | Outline of paint detail page                                                                 |
| Create | `src/app/schemes/loading.tsx`                       | Outline of schemes page                                                                      |
| Create | `src/app/palettes/loading.tsx`                      | Outline of public palette catalog                                                            |
| Create | `src/app/palettes/[id]/loading.tsx`                 | Outline of palette detail                                                                    |
| Create | `src/app/user/palettes/loading.tsx`                 | Outline of "My palettes"                                                                     |
| Create | `src/app/user/palettes/[id]/edit/loading.tsx`       | Outline of palette edit form                                                                 |
| Create | `src/app/collection/loading.tsx`                    | Outline of collection dashboard                                                              |
| Create | `src/app/collection/paints/loading.tsx`             | Outline of collection paints grid                                                            |
| Create | `src/app/brands/loading.tsx`                        | Outline of brands grid                                                                       |
| Create | `src/app/brands/[id]/loading.tsx`                   | Outline of brand detail                                                                      |
| Create | `src/app/hues/[id]/loading.tsx`                     | Outline of hue detail                                                                        |
| Create | `src/app/users/[id]/loading.tsx`                    | Outline of public user profile                                                               |
| Create | `src/app/profile/setup/loading.tsx`                 | Outline of profile setup form                                                                |
| Create | `src/app/profile/edit/loading.tsx`                  | Outline of profile edit form                                                                 |
| Create | `src/app/(auth)/loading.tsx`                        | Card-shaped skeleton shared by sign-in / sign-up / reset / forgot                            |
| Create | `src/app/admin/loading.tsx`                         | Outline of admin dashboard                                                                   |
| Create | `src/app/admin/users/loading.tsx`                   | Outline of admin users list                                                                  |
| Create | `src/app/admin/users/[id]/loading.tsx`              | Outline of admin user detail                                                                 |
| Create | `src/app/admin/users/[id]/edit/loading.tsx`         | Outline of admin user edit                                                                   |
| Create | `src/app/admin/users/[id]/collection/loading.tsx`   | Outline of admin user's collection                                                           |
| Create | `src/app/admin/roles/loading.tsx`                   | Outline of admin roles list                                                                  |
| Create | `src/app/admin/roles/[id]/loading.tsx`              | Outline of admin role detail                                                                 |
| Create | `src/app/(legal)/terms/loading.tsx`                 | Outline of long prose page                                                                   |

## Implementation Plan

### Module placement

Loading screens are pure layout primitives — no domain logic — so they live alongside the route in `src/app/`, **not** inside any module. The shared primitives live in `src/components/ui/` because they're cross-cutting UI atoms that any page (or future module component) can consume. This matches the project's existing split: route pages stay thin, and the only thing they reach into is `src/components/ui/` for primitives.

No new module is created.

### Step 1 — Skeleton primitive + CSS

Create `src/styles/skeleton.css` following the daisyUI-style header convention from existing files in `src/styles/`:

- `.skeleton` — base: `bg-muted`, `animate-pulse`, `rounded`
- `.skeleton-circle` — `rounded-full`
- `.skeleton-text` — `h-4 rounded` (small text-line height)
- `.skeleton-avatar` — `rounded-full` square (size set by parent or `-sm/-md/-lg` modifiers)
- Size modifiers (`-xs / -sm / -md / -lg / -xl`) following the project naming pattern

Wire it into `src/app/globals.css`:

```css
@import '../styles/skeleton.css' layer(components);
```

Create `src/components/ui/skeleton.tsx`:

```tsx
import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/** Base loading skeleton — applies the daisyUI-style `.skeleton` class. */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('skeleton', className)} {...props} />
}

/** Circular skeleton — useful for avatars, color swatches, the wheel surface. */
export function SkeletonCircle({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('skeleton skeleton-circle', className)} {...props} />
}
```

JSDoc: every export gets a one-line `/** ... */` per the project's JSDoc convention. No barrel file — pages import directly from `@/components/ui/skeleton`.

### Step 2 — Generic root fallback (`src/app/loading.tsx`)

Replace the centered orb with a page-shell skeleton that matches the dimensions most pages use (`max-w-6xl px-4 py-12`):

```tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <div className="mb-8 flex flex-col gap-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-72" />
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  )
}
```

Why this and not the orb: `app/loading.tsx` is the fallback for any sub-route that doesn't ship its own — every fallback render today shows a circle that has nothing to do with the next page. A neutral page shell tells the user "a page is loading," not "a wheel is loading."

### Step 3 — Per-route skeletons (mirror the page outline)

For each route in [Routes](#routes), open the matching `page.tsx` and replicate **the static structural elements** with `<Skeleton>` primitives. The goal isn't pixel parity — it's layout parity, so the user sees the same hierarchy of blocks land in the same positions.

Concrete rules used for every per-route skeleton:

1. **Wrap in the same outer shell as the page.** If the page uses `mx-auto w-full max-w-6xl px-4 py-12`, the loading does too. Same for `(auth)` (Card-centered) and `admin` (max-w-5xl / 4xl).
2. **Heading row.** `Skeleton h-9 w-32–w-48` for the H1, `h-5 w-48–w-72` for the sub-text underneath.
3. **Action buttons** that sit alongside the heading (e.g. "New palette") get a `Skeleton h-9 w-28`.
4. **Card grids** (`/palettes`, `/brands`, `/user/palettes`, `/admin/users/[id]/collection`) render 8–12 placeholder cards in the same grid template the page uses. Each card is a vertical stack: thumbnail block, title line, meta line.
5. **Detail pages** (`/paints/[id]`, `/palettes/[id]`, `/brands/[id]`, `/users/[id]`, `/hues/[id]`) render breadcrumb (when the page has one), a header block with image/avatar + title + meta, then a content stack matching the page's primary block.
6. **Forms** (profile setup/edit, palette edit, admin user edit) render a Card with stacked input rows: label `Skeleton h-4 w-20` + input `Skeleton h-10 w-full`. End with a primary-button skeleton.
7. **Tables** (admin/users) render heading + filter row + 8 row-skeletons + a pagination row.
8. **Auth pages** share one `(auth)/loading.tsx` because every auth page renders inside the `(auth)/layout.tsx` Card centerer — a single centered card-shaped skeleton with header, two input rows, button, and OAuth divider covers all four routes.

### Step 4 — Update existing `paints/loading.tsx` and `wheel/loading.tsx`

- `paints/loading.tsx`: identical visual output, but rewritten to import `Skeleton` instead of inlining `<div className="... animate-pulse rounded bg-muted" />`. Pure refactor.
- `wheel/loading.tsx`: rewrite the centered orb to mirror the actual wheel page outline. The wheel page lives in `src/app/wheel/page.tsx`. Confirmed during exploration: the only file currently in `src/app/wheel/` is `loading.tsx` itself. **Before writing this skeleton, find the real wheel page** — it lives in a route group or in a module entry point, not at `app/wheel/page.tsx`. Grep `WheelExplorer`/`color-wheel` in `src/modules/color-wheel/components/` to see the rendered structure (toolbar, square wheel surface, side detail panel) and skeleton those three blocks.

### Step 5 — Verify

1. `npm run build` and `npm run lint` pass.
2. Click through each route in dev (`npm run dev`) with throttled CPU/network to actually see each `loading.tsx` render. Loading view's outer container should have the **same width and padding** as the loaded page so there's no shift.
3. Toggle dark mode — every skeleton respects `bg-muted`.
4. The orb is gone. Anywhere in the app where a `loading.tsx` previously rendered the orb (every route except `/paints`) now renders the matching outline.

### Order of operations

1. Step 1 (primitives + CSS) — prerequisite for everything else.
2. Step 2 (root `loading.tsx`) — immediate visible win, simplest skeleton.
3. Step 4 first sub-bullet — refactor `/paints` to consume the new primitive (keeps the diff easy to review).
4. Step 3 — add per-route skeletons. Group commits by area: marketing/landing routes, paints/wheel/schemes, palettes, collection, brands/hues, profile + auth, admin, legal.
5. Step 4 second sub-bullet — rewrite `/wheel` after the wheel page outline is confirmed.
6. Step 5 — manual verification.

## Risks & Considerations

- **Wheel page location.** The wheel `loading.tsx` exists but the page itself isn't at `src/app/wheel/page.tsx` — it's reached via a route group or a module-rendered component. The implementation step above explicitly calls this out so the wheel skeleton isn't built blind.
- **Layout shift between skeleton and real page.** The acceptance criteria require the skeleton to use the same outer container as the real page. If the page uses a different `max-w-*` than the skeleton, the user sees a width snap when content swaps in.
- **Keep skeletons dumb.** A `loading.tsx` must not import from `src/modules/*` — pulling in module components risks bundling client/server code into the loading boundary, which can defeat Next.js's intent of a fast static fallback.
- **Don't over-engineer the variants.** Three primitives (`Skeleton`, `SkeletonCircle`, …) is enough — additional shapes (`SkeletonAvatar`, `SkeletonText`) are cheap to add later if needed. Resist creating one component per page-section type.
- **Auth `(auth)/loading.tsx` placement.** Inside the `(auth)/layout.tsx` Card-centerer, a single shared loading is correct. Per-page auth `loading.tsx` files would duplicate the card and offer no benefit.
- **`(legal)/terms` is a long prose page.** A skeleton for it should be a stack of varying-width text-line skeletons — three `h-4` rows per "paragraph" — so it visually reads as text, not as cards.
