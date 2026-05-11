# 404 Not-Found Page

**Epic:** Marketing & Branding
**Type:** Feature
**Status:** Todo
**Branch:** `feature/404-not-found-page`
**Merge into:** `main`

## Summary

Add a branded, web-designed 404 page using the Next.js [`not-found.tsx`](https://nextjs.org/docs/app/api-reference/file-conventions/not-found) file convention. Today the app has **no `not-found.tsx`** anywhere, so unmatched routes and explicit `notFound()` calls (used in 10 detail/edit pages — see [Affected pages that call `notFound()`](#affected-pages-that-call-notfound)) fall back to Next.js's bare framework default, which is unstyled, branded as Next.js, and breaks the chrome (Navbar/Footer still render via the root layout, but the body is a tiny centered "404 — This page could not be found" string with no app context). This feature ships a single root `src/app/not-found.tsx` that mirrors the homepage's visual language (hero band + CTA band) so the 404 view feels like part of Grimify rather than a framework error.

The page will:

- Render inside the existing root layout (Navbar + Footer + Toaster apply automatically).
- Use the project's `<Main>` + `<PageHeader>` primitives and daisyUI-style classes.
- Provide a clear apology, a primary action back to the homepage, and a short list of common destinations (`/paints`, `/wheel`, `/palettes`, `/collection` for signed-in users) so the user has a productive next step.
- Return HTTP **404** automatically (Next.js sets the status code for `not-found.tsx` segments).
- Set `noindex, nofollow` metadata so search engines don't index the page.

## Acceptance Criteria

- [ ] `src/app/not-found.tsx` exists and is the global fallback rendered for any unmatched route or `notFound()` call.
- [ ] The page returns HTTP `404` (verified via `curl -I` against a known-bad URL in `npm run dev`).
- [ ] Page renders inside the root layout — `Navbar` and `Footer` are visible above and below the 404 body.
- [ ] Visual layout matches the design language of `src/app/page.tsx`: a hero-style heading band on top of the `<Main>` shell, then a CTA band of action buttons below.
- [ ] Copy is on-brand for Grimify (no Next.js boilerplate text). At minimum: an H1 "Page not found", a sub-headline explaining the route doesn't exist, and a contextual line nudging the user toward what's working.
- [ ] Primary CTA links to `/` (button uses `btn btn-primary btn-lg`).
- [ ] Secondary destinations are surfaced as a short list/grid of links: `/paints`, `/wheel`, `/palettes`. When the viewer is signed in, also surface `/collection` and `/user/palettes`.
- [ ] Metadata sets `robots: { index: false, follow: false }` via `pageMetadata({ noindex: true })`.
- [ ] Page works in light and dark mode — no hardcoded colors; everything uses theme tokens (`bg-muted`, `text-muted-foreground`, etc.).
- [ ] Page is responsive — heading scales like the marketing hero (`text-4xl sm:text-5xl lg:text-6xl`), CTA buttons stack on mobile and lay out in a row on `sm:` and up.
- [ ] No new dependencies introduced.
- [ ] `npm run build` and `npm run lint` pass with no errors or warnings.
- [ ] Manual smoke test: hitting `/this-route-does-not-exist` shows the new 404 page with chrome intact. Triggering `notFound()` from an existing detail page (e.g. `/paints/00000000-0000-0000-0000-000000000000`) also renders the same page.

## Affected pages that call `notFound()`

The following 10 routes already call `notFound()` from `next/navigation` and will start rendering the new global `not-found.tsx` automatically — no per-route work is needed unless we later want a scoped 404 for one of them:

| Route                                | Why it calls `notFound()`                                  |
| ------------------------------------ | ---------------------------------------------------------- |
| `/users/[id]`                        | Profile lookup miss                                        |
| `/palettes/[id]`                     | Palette miss or private palette viewed by non-owner        |
| `/recipes/[id]`                      | Recipe miss or private recipe viewed by non-owner          |
| `/paints/[id]`                       | Paint lookup miss                                          |
| `/hues/[id]`                         | Hue lookup miss                                            |
| `/user/palettes/[id]/edit`           | Palette miss or owned-by-other                             |
| `/user/recipes/[id]/edit`            | Recipe miss or owned-by-other                              |
| `/admin/users/[id]`                  | User lookup miss                                           |
| `/admin/users/[id]/edit`             | User lookup miss / role-gated miss                         |
| `/admin/roles/[id]`                  | Role lookup miss                                           |

Out of scope for this feature: shipping per-segment `not-found.tsx` files for any of these. They can be added later if specific routes need tailored copy (e.g. an admin-area 404 with a "back to admin dashboard" CTA).

## Key Files

| Action | File                                                  | Description                                                                                  |
| ------ | ----------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Create | `src/app/not-found.tsx`                               | Root `not-found.tsx` — thin page that imports the marketing module's content component.      |
| Create | `src/modules/marketing/components/not-found-content.tsx` | Server component rendering the heading band, CTA buttons, and contextual links. Owns all 404-specific markup. |
| Modify | *(none — root layout already provides Navbar/Footer/Toaster)* | The 404 page is rendered as a child of `RootLayout` automatically.                  |

No new CSS files. The page composes existing utilities (`btn`, `btn-primary`, `btn-ghost`, page shell utilities) and Tailwind classes — adding a `not-found.css` would be over-engineering for one page.

## Implementation Plan

### Module placement

A 404 page is app-wide chrome — there's no domain in `src/modules/<module>/` that "owns" 404s. Two reasonable options:

1. **Inline in `src/app/not-found.tsx`** (matches what `src/app/loading.tsx` does today).
2. **Extract a `NotFoundContent` component** under `src/modules/marketing/components/` (matches what the homepage does with `Hero`, `FeatureGrid`, `CtaSection`).

This plan picks **option 2** because:

- The 404 is a *visual* page with copy, headings, and CTAs — the same shape as the marketing hero/CTA pair. Putting it in `src/modules/marketing/components/` keeps the marketing visual language in one place and lets future marketing tweaks (e.g. a sitewide font/color refresh) update the 404 by association.
- It aligns with the project rule: "Route pages (`src/app/**/page.tsx`) only handle layout and data fetching — they import components, actions, and services from the module." A 404 page that's anything more than 2 lines of layout belongs in a module.
- It keeps `src/app/not-found.tsx` a true 1-import-and-render shim, matching the spirit of `src/app/page.tsx`.

`auth-awareness` for the CTA list is a simple Supabase user lookup, same pattern used in `src/app/page.tsx`. Keep that in the route page (boundary), not in the module component — pass `isAuthenticated: boolean` as a prop. This mirrors `CtaSection` in `src/modules/marketing/components/cta-section.tsx`.

### Step 1 — Create the marketing `NotFoundContent` component

File: `src/modules/marketing/components/not-found-content.tsx`

Server component. Props: `{ isAuthenticated: boolean }`.

Structure (mirrors `Hero` + `CtaSection`):

```tsx
import Link from 'next/link'

import { PageHeader, PageSubtitle, PageTitle } from '@/components/page-header'

/**
 * Props for {@link NotFoundContent}.
 */
export interface NotFoundContentProps {
  /** Whether the current viewer has a Supabase session. Drives which secondary destinations render. */
  isAuthenticated: boolean
}

/**
 * 404 page body rendered by the root `not-found.tsx` segment.
 *
 * Lays out a hero-style heading band (Page not found / subtitle), a primary
 * "Back to home" CTA, and a contextual list of common destinations. The
 * destination list grows by one row when the viewer is signed in.
 *
 * @param props - See {@link NotFoundContentProps}.
 */
export function NotFoundContent({ isAuthenticated }: NotFoundContentProps) {
  // 1. <PageHeader> with PageTitle "Page not found" + PageSubtitle copy.
  // 2. Primary CTA row: Link to "/" with .btn .btn-primary .btn-lg.
  // 3. Destinations grid: /paints, /wheel, /palettes — plus /collection and /user/palettes when isAuthenticated.
}
```

Visual rules:

- Outer wrapper: a vertically-stacked column with generous gap. Use the existing `page-header` class for the heading row, not bespoke `text-4xl ...` — this stays consistent with every other page header in the app.
- Sub-copy: `<PageSubtitle>` (uses `page-subtitle` class, already muted).
- Primary CTA: `<Link href="/" className="btn btn-primary btn-lg">Back to home</Link>`.
- Destinations: a small grid (`grid grid-cols-1 sm:grid-cols-2 gap-3`) of `card-style` link cards or simple `btn btn-ghost` links — each row shows a label and a short hint ("Browse paints", "Explore the color wheel", etc.). Use `btn btn-ghost` to keep the implementation tiny; no new card variants needed.

JSDoc: every export gets a one-line `/** ... */` per project convention.

### Step 2 — Create the root `not-found.tsx` page

File: `src/app/not-found.tsx`

```tsx
import { Main } from '@/components/main'
import { createClient } from '@/lib/supabase/server'
import { NotFoundContent } from '@/modules/marketing/components/not-found-content'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'

export const metadata = pageMetadata({
  title: 'Page not found',
  description: 'We couldn’t find that page on Grimify. Try one of the popular destinations below.',
  noindex: true,
})

export default async function NotFound() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <Main>
      <NotFoundContent isAuthenticated={!!user} />
    </Main>
  )
}
```

Notes:

- **`async` + Supabase lookup is fine here.** Next.js renders `not-found.tsx` as a server component and supports async — same pattern as `src/app/page.tsx`.
- **Do not pass `path` to `pageMetadata`.** The 404 page has no canonical URL.
- **Always `noindex`.** A 404 page must not be indexable.
- **Use `<Main>`, not a bespoke wrapper.** Keeps width and padding consistent with every other page; no layout shift between the surrounding chrome of the previous page and the 404.

### Step 3 — Verify

1. **Build/lint.** `npm run build` and `npm run lint` pass.
2. **Unmatched route.** `npm run dev`, then visit `/this-route-does-not-exist`. Expect: Navbar at top, footer at bottom, the new 404 body in between.
3. **HTTP status.** `curl -I http://localhost:3000/this-route-does-not-exist` → expect `HTTP/1.1 404 Not Found`. This is automatic for `not-found.tsx` — if the status is 200, the file is misnamed/misplaced.
4. **`notFound()` trigger.** Visit `/paints/00000000-0000-0000-0000-000000000000` — a clearly-invalid UUID. The detail page calls `notFound()` (see `src/app/paints/[id]/page.tsx`), which should now render the new global 404.
5. **Auth-aware CTAs.** Visit the 404 signed-out — the destinations list omits `/collection` and `/user/palettes`. Sign in and revisit — those two destinations now appear.
6. **Dark mode.** Toggle the theme. No hardcoded colors should regress.
7. **Mobile.** Resize to ~375px wide. Heading wraps cleanly; CTA buttons stack.
8. **Metadata.** View page source — `<meta name="robots" content="noindex,nofollow">` must be present.

### Order of operations

1. Step 1 — `NotFoundContent` (the only component with real markup).
2. Step 2 — `src/app/not-found.tsx` shim.
3. Step 3 — verify in dev.

Both files are net-new; there's nothing to refactor.

## Risks & Considerations

- **Supabase client cost on a hot 404 path.** The `createClient()` + `auth.getUser()` round trip runs for every 404 response — including bot scans for `/wp-login.php` and similar nonsense. This is cheap (1 cookie-based call, no DB hit) and matches what `src/app/page.tsx` already does, but if 404 traffic ever becomes a concern, drop the auth check and ship a static destinations list. Don't pre-optimize.
- **Don't break the `noindex` invariant.** A 404 page must always be `noindex, nofollow`. Reviewers should reject any change that adds `path` to `pageMetadata` here.
- **Don't import from non-marketing modules.** The component intentionally lives in `src/modules/marketing/` because its CTAs are marketing-style. Resist the temptation to pull in `PaintGrid`, `RecentPalettes`, or any data-driven block — a 404 page must not run paint queries.
- **Per-segment `not-found.tsx` is out of scope.** If a future ticket needs e.g. admin-area-specific 404 copy, that's a new doc — leave segment-specific files alone in this PR.
- **`src/app/page.tsx` already does the same `createClient` + `auth.getUser()` dance.** When copying that pattern, copy *only* the auth lookup — don't accidentally pull in `Hero`, `FeatureGrid`, or `CtaSection`, which would make the 404 page render an entire homepage.
- **Status code regression risk.** If the file is accidentally named `404.tsx` (Pages-router convention) instead of `not-found.tsx`, Next.js will not return HTTP 404 — it'll render the fallback page with a 200. Step 3.3 (`curl -I`) exists specifically to catch that.
- **Toaster overlap.** The root layout renders `<Toaster position="bottom-right">`. The 404 body should leave room at the bottom-right for toasts — the existing `<Main>` shell already does (the toaster is `position: fixed`), so no extra spacing is needed.
