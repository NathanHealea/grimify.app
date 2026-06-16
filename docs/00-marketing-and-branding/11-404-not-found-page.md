# 404 Not-Found Page

**Epic:** Marketing & Branding
**Type:** Feature
**Status:** In Progress
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

- [x] `src/app/not-found.tsx` exists and is the global fallback rendered for any unmatched route or `notFound()` call.
- [x] The page returns HTTP `404` (verified via `curl -I` against a known-bad URL in `npm run dev`).
- [x] Page renders inside the root layout — `Navbar` and `Footer` are visible above and below the 404 body.
- [x] Visual layout matches the design language of `src/app/page.tsx`: a hero-style heading band on top of the `<Main>` shell, then a CTA band of action buttons below.
- [x] Copy is on-brand for Grimify (no Next.js boilerplate text). At minimum: an H1 "Page not found", a sub-headline explaining the route doesn't exist, and a contextual line nudging the user toward what's working.
- [x] Primary CTA links to `/` (button uses `btn btn-primary btn-lg`).
- [ ] Secondary destinations are surfaced as a short list/grid of links: `/paints`, `/wheel`, `/palettes`. When the viewer is signed in, also surface `/collection` and `/user/palettes`.
- [x] Metadata sets `robots: { index: false, follow: false }` via `pageMetadata({ noindex: true })`.
- [x] Page works in light and dark mode — no hardcoded colors; everything uses theme tokens (`bg-muted`, `text-muted-foreground`, etc.).
- [x] Page is responsive — heading scales like the marketing hero (`text-4xl sm:text-5xl lg:text-6xl`), CTA buttons stack on mobile and lay out in a row on `sm:` and up.
- [x] No new dependencies introduced.
- [x] `npm run build` and `npm run lint` pass with no errors or warnings.
- [x] Manual smoke test: hitting `/this-route-does-not-exist` shows the new 404 page with chrome intact. Triggering `notFound()` from an existing detail page (e.g. `/paints/00000000-0000-0000-0000-000000000000`) also renders the same page.

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

**Status: In Progress.** The two core files are already built and wired; the remaining work is reconciling the secondary-destinations list with the routes that actually exist and running the final verification pass.

### Module placement (implemented)

The 404 follows the marketing-component pattern: `src/app/not-found.tsx` is a thin async shim that does the Supabase auth lookup at the route boundary and delegates all markup to `NotFoundContent` in `src/modules/marketing/components/`. This matches the project rule that route files stay thin and domain markup lives in a module.

### Already implemented

- **`src/app/not-found.tsx`** — async server component. Calls `createClient()` + `auth.getUser()` (the same auth dance as `src/app/page.tsx`), wraps the body in `<Main>`, and passes `isAuthenticated={!!user}` to `NotFoundContent`. Exports `metadata = pageMetadata({ title: 'Page not found', description: ..., noindex: true })` — no `path`, so the page has no canonical URL and is `noindex, nofollow`.
- **`src/modules/marketing/components/not-found-content.tsx`** — server component with `NotFoundContentProps { isAuthenticated: boolean }`, both exports carrying JSDoc. Renders:
  - A hero-style heading band (`text-4xl sm:text-5xl lg:text-6xl`, `text-balance`) with "Page not found" + a muted sub-headline, on a `bg-gradient-to-b from-muted/40 to-background` section.
  - A primary `btn btn-primary btn-lg` "Back to home" CTA linking to `/`.
  - A responsive destinations grid (`grid-cols-1 sm:grid-cols-3`) of `card`-style links using `CardHeader` / `CardTitle` / `CardDescription` from `@/components/ui/card`, with `hover:bg-accent`. Always shows **Browse paints (`/paints`)**, **Explore brands (`/brands`)**, **Discover palettes (`/palettes`)**; when `isAuthenticated`, also shows **Your collection (`/collection`)** and **Your palettes (`/user/palettes`)**.
- All theme tokens (`bg-muted`, `text-muted-foreground`, `bg-accent`, etc.) — no hardcoded colors; light/dark safe. No new dependencies, no new CSS file.

This covers all acceptance criteria except the secondary-destinations criterion, which is the only remaining gap.

### Remaining work

#### Phase 1 — Reconcile the secondary destinations (`src/modules/marketing/components/not-found-content.tsx`)

The lone unchecked acceptance criterion lists `/paints`, `/wheel`, `/palettes` as the signed-out destinations. The current implementation surfaces `/paints`, `/brands`, `/palettes` instead. **There is no `/wheel` route in `src/app/`** — `/brands` is the correct, live route — so the implementation is right and the acceptance criterion's `/wheel` reference is stale. Decide and align in one pass:

- **Recommended:** keep `/brands` in the code (it exists; `/wheel` does not) and update the acceptance criterion wording to read `/paints`, `/brands`, `/palettes`. This is a doc-only edit to the criterion text.
- If a color-wheel route is genuinely intended, that is a separate feature (the route does not yet exist) and is out of scope here — do not add a dead link to a non-existent route.

Confirm the signed-in additions (`/collection`, `/user/palettes`) match the criterion — they already do.

This phase touches only the component's link set (if any) plus the doc criterion. Types/lint stay green throughout.

#### Phase 2 — Final verification (no code changes expected)

1. **Build/lint.** `npm run build` and `npm run lint` pass clean.
2. **Unmatched route.** `npm run dev`, visit `/this-route-does-not-exist` — Navbar/Footer chrome intact, 404 body between.
3. **HTTP status.** `curl -I http://localhost:3000/this-route-does-not-exist` → `HTTP/1.1 404`. (Catches an accidental Pages-router `404.tsx` rename that would return 200.)
4. **`notFound()` trigger.** Visit `/paints/00000000-0000-0000-0000-000000000000` — the detail page's `notFound()` should render this same global 404.
5. **Auth-aware CTAs.** Signed-out omits `/collection` + `/user/palettes`; signed-in shows them.
6. **Dark mode + mobile.** Toggle theme (no color regressions); resize to ~375px (heading wraps, CTA stacks).
7. **Metadata.** Page source contains `<meta name="robots" content="noindex,nofollow">`.

### Order of operations

1. Phase 1 — reconcile destinations / criterion wording.
2. Phase 2 — verification pass.

No refactor of the existing two files is expected beyond Phase 1's destination reconciliation.

## Risks & Considerations

- **Supabase client cost on a hot 404 path.** The `createClient()` + `auth.getUser()` round trip runs for every 404 response — including bot scans for `/wp-login.php` and similar nonsense. This is cheap (1 cookie-based call, no DB hit) and matches what `src/app/page.tsx` already does, but if 404 traffic ever becomes a concern, drop the auth check and ship a static destinations list. Don't pre-optimize.
- **Don't break the `noindex` invariant.** A 404 page must always be `noindex, nofollow`. Reviewers should reject any change that adds `path` to `pageMetadata` here.
- **Don't import from non-marketing modules.** The component intentionally lives in `src/modules/marketing/` because its CTAs are marketing-style. Resist the temptation to pull in `PaintGrid`, `RecentPalettes`, or any data-driven block — a 404 page must not run paint queries.
- **Per-segment `not-found.tsx` is out of scope.** If a future ticket needs e.g. admin-area-specific 404 copy, that's a new doc — leave segment-specific files alone in this PR.
- **`src/app/page.tsx` already does the same `createClient` + `auth.getUser()` dance.** When copying that pattern, copy *only* the auth lookup — don't accidentally pull in `Hero`, `FeatureGrid`, or `CtaSection`, which would make the 404 page render an entire homepage.
- **Status code regression risk.** If the file is accidentally named `404.tsx` (Pages-router convention) instead of `not-found.tsx`, Next.js will not return HTTP 404 — it'll render the fallback page with a 200. Step 3.3 (`curl -I`) exists specifically to catch that.
- **Toaster overlap.** The root layout renders `<Toaster position="bottom-right">`. The 404 body should leave room at the bottom-right for toasts — the existing `<Main>` shell already does (the toaster is `position: fixed`), so no extra spacing is needed.
