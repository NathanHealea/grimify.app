# Metadata and OpenGraph

**Epic:** Marketing & Branding
**Type:** Feature
**Status:** In Progress
**Branch:** `v1/feature/metadata-and-opengraph`
**Merge into:** `v1/main`

## Summary

Configure site-wide metadata, OpenGraph tags, and Twitter card tags so Grimify renders rich previews when shared on social media, search engines, and messaging platforms.

Metadata is **dynamic per route**: each page that has unique content (paints, palettes, brands, hues, user profiles) generates its own title, description, and OpenGraph image at request time using Next.js's `generateMetadata` and the `next/og` `ImageResponse` API. Static routes (home, list pages, auth) fall back to a single shared `og-image.png` and the root metadata defaults.

The dynamic OG image handler renders real content — a paint's hex swatch with its name and brand, a palette's color strip with its title, a profile's avatar and display name — instead of a generic banner. This makes shared links visually distinct and recognizable.

## Acceptance Criteria

- [x] Root `src/app/layout.tsx` exports a `metadata` object with site title (with `%s | Grimify` template), description, keywords, and default OpenGraph + Twitter card fields
- [x] A static `public/og-image.png` (1200×630) exists as the fallback OG image for routes without dynamic content
- [x] Favicon and `apple-touch-icon.png` (180×180) are configured, sourced from the branding icon
- [ ] `src/app/robots.ts` exposes a robots policy (allow all in production, disallow in non-prod via env)
- [ ] `src/app/sitemap.ts` generates a sitemap including all public static routes plus public palettes, paints, brands, hues, and profiles
- [ ] `src/app/paints/[id]/page.tsx` exports `generateMetadata` returning the paint's name + brand in the title and a description containing the paint's hex / hue
- [ ] `src/app/brands/[id]/page.tsx` exports `generateMetadata` with brand name + paint count
- [ ] `src/app/hues/[id]/page.tsx` exports `generateMetadata` with hue name + Itten classification
- [x] `src/app/users/[id]/page.tsx` exports `generateMetadata` with display name + bio snippet
- [x] `src/app/palettes/[id]/page.tsx` exports `generateMetadata` with palette name + paint count (only when palette is public; private palettes return `noindex` metadata)
- [ ] Dynamic OG image route handlers exist at `src/app/api/og/paint/[id]/route.tsx`, `src/app/api/og/palette/[id]/route.tsx`, `src/app/api/og/brand/[id]/route.tsx`, `src/app/api/og/hue/[id]/route.tsx`, `src/app/api/og/user/[id]/route.tsx`, each returning a 1200×630 `ImageResponse`
- [ ] Each dynamic page wires its OG image URL into `openGraph.images` and `twitter.images` via `generateMetadata`
- [ ] Private palettes do NOT expose a dynamic OG image (the route handler returns 404 for non-public palettes)
- [ ] `npm run build` and `npm run lint` pass with no errors

## Key Files

| Action | File                                          | Description                                                                       |
| ------ | --------------------------------------------- | --------------------------------------------------------------------------------- |
| Modify | `src/app/layout.tsx`                          | Add `metadata` export with site defaults                                          |
| Create | `public/og-image.png`                         | Default 1200×630 OG image (fallback for routes without dynamic data)              |
| Create | `public/apple-touch-icon.png`                 | 180×180 Apple touch icon                                                          |
| Modify | `src/app/favicon.ico`                         | Brand favicon (sourced from branding icon)                                        |
| Create | `src/app/robots.ts`                           | Robots policy                                                                     |
| Create | `src/app/sitemap.ts`                          | Sitemap generator                                                                 |
| Modify | `src/app/paints/[id]/page.tsx`                | Add `generateMetadata` exporting paint title/description/OG-image URL             |
| Modify | `src/app/brands/[id]/page.tsx`                | Add `generateMetadata` exporting brand title/description/OG-image URL             |
| Modify | `src/app/hues/[id]/page.tsx`                  | Add `generateMetadata` exporting hue title/description/OG-image URL               |
| Modify | `src/app/users/[id]/page.tsx`                 | Add `generateMetadata` exporting profile title/description/OG-image URL           |
| Modify | `src/app/palettes/[id]/page.tsx`              | Add `generateMetadata`; private palettes return `noindex`                         |
| Create | `src/app/api/og/paint/[id]/route.tsx`         | Dynamic OG image — paint swatch + name + brand                                    |
| Create | `src/app/api/og/palette/[id]/route.tsx`       | Dynamic OG image — palette color strip + name + paint count                       |
| Create | `src/app/api/og/brand/[id]/route.tsx`         | Dynamic OG image — brand name + paint count                                       |
| Create | `src/app/api/og/hue/[id]/route.tsx`           | Dynamic OG image — hue name + Itten classification + sample swatch                |
| Create | `src/app/api/og/user/[id]/route.tsx`          | Dynamic OG image — avatar + display name + bio snippet                            |
| Create | `src/modules/seo/utils/build-og-url.ts`       | Helper that builds an absolute OG image URL from a request's site origin + entity |
| Create | `src/modules/seo/utils/site-url.ts`           | Resolves the canonical site origin (env `NEXT_PUBLIC_SITE_URL` with fallback)     |

## Implementation

### Status snapshot

**Already shipped:**

- Root layout `metadata` in `src/app/layout.tsx` — title template (`%s · Grimify`), description, keywords, OG, Twitter, `robots: { index: true, follow: true }`, `metadataBase` via `siteUrl()`.
- Static `public/og-image.png` (1200×630), `src/app/apple-icon.png`, `src/app/favicon.ico`, and `src/app/icon.svg` picked up via Next.js file conventions.
- `src/modules/seo/utils/site-url.ts` and `src/modules/seo/utils/page-metadata.ts` helpers. `pageMetadata()` already routes a single `image` input into both `openGraph.images` and `twitter.images`.
- Basic `generateMetadata` for paints, brands, hues, users, and palettes (private palettes / private viewer return `noindex`). All current implementations call `pageMetadata()`.

**Remaining work** (one PR per step is fine; steps 1–3 are independent of step 4):

1. `src/app/robots.ts` and `src/app/sitemap.ts`.
2. Enrich paint, brand, and hue `generateMetadata` descriptions to match the spec (paint hex, brand paint count, hue Itten parent).
3. `src/modules/seo/utils/build-og-url.ts` helper.
4. Five dynamic OG image route handlers under `src/app/api/og/<entity>/[id]/route.tsx`.
5. Wire each `generateMetadata` to point its OG image at the dynamic handler via `pageMetadata({ image })`.
6. Verify with `npm run lint` and `npm run build`, then smoke-test each handler in dev.

### Module placement

The SEO module owns shared SEO helpers; route files own page-specific metadata and OG handlers (per `CLAUDE.md` — domain modules don't own route files, but they own utilities the routes consume).

| Path                                          | Module / kind | Action |
| --------------------------------------------- | ------------- | ------ |
| `src/app/robots.ts`                           | route file    | Create |
| `src/app/sitemap.ts`                          | route file    | Create |
| `src/modules/seo/utils/build-og-url.ts`       | seo           | Create (one export per file) |
| `src/app/api/og/paint/[id]/route.tsx`         | route file    | Create |
| `src/app/api/og/palette/[id]/route.tsx`       | route file    | Create |
| `src/app/api/og/brand/[id]/route.tsx`         | route file    | Create |
| `src/app/api/og/hue/[id]/route.tsx`           | route file    | Create |
| `src/app/api/og/user/[id]/route.tsx`          | route file    | Create |
| `src/app/paints/[id]/page.tsx`                | route file    | Modify (description + OG URL) |
| `src/app/brands/[id]/page.tsx`                | route file    | Modify (description + OG URL) |
| `src/app/hues/[id]/page.tsx`                  | route file    | Modify (description + OG URL) |
| `src/app/users/[id]/page.tsx`                 | route file    | Modify (OG URL) |
| `src/app/palettes/[id]/page.tsx`              | route file    | Modify (OG URL — public only) |

### Step 1 — `robots.ts` and `sitemap.ts`

`src/app/robots.ts`:

```ts
import type { MetadataRoute } from 'next'
import { siteUrl } from '@/modules/seo/utils/site-url'

export default function robots(): MetadataRoute.Robots {
  const isProd = process.env.NEXT_PUBLIC_ENV === 'production'
  return {
    rules: isProd
      ? { userAgent: '*', allow: '/', disallow: ['/admin', '/api/'] }
      : { userAgent: '*', disallow: '/' },
    sitemap: `${siteUrl()}/sitemap.xml`,
  }
}
```

`src/app/sitemap.ts` should:

- Use `createClient()` from `src/lib/supabase/server.ts` (RLS-respecting). Crawlers are anonymous, so private palettes and soft-deleted rows fall out automatically — no separate filtering needed for palettes once `is_public` RLS is in place. (If RLS doesn't already filter, add an explicit `.eq('is_public', true)` for palettes.)
- Emit static URLs first: `/`, `/paints`, `/brands`, `/hues`, `/schemes`, `/wheel`, `/palettes`.
- Then query each entity's `id` + `updated_at` (fallback `created_at`) and append:
  - `paints`: `changeFrequency: 'monthly'`, `priority: 0.6`.
  - `brands`: `changeFrequency: 'monthly'`, `priority: 0.5`.
  - `hues`: `changeFrequency: 'yearly'`, `priority: 0.4`.
  - `palettes` (`is_public = true`): `changeFrequency: 'weekly'`, `priority: 0.5`.
  - `profiles`: `changeFrequency: 'weekly'`, `priority: 0.3`. Skip rows with no `display_name`.
- Keep each query to a single `select id, updated_at` — large catalogs are fine, no need to paginate.

### Step 2 — Enrich paint / brand / hue descriptions

The shipped descriptions don't yet match the acceptance criteria. Update each `generateMetadata`:

- **`src/app/paints/[id]/page.tsx`** — paint already comes back with `paint.hex` and `paint.product_lines.brands.name`. Change:
  ```ts
  description: `${paint.name} miniature paint on Grimify.`
  ```
  to:
  ```ts
  description: `${paint.name} by ${paint.product_lines.brands.name}. Hex ${paint.hex.toUpperCase()}.`
  ```
- **`src/app/brands/[id]/page.tsx`** — fetch the paint count via `brandService.getBrandPaints(numericId)` (already used downstream) or a slimmer count query, and produce:
  ```ts
  description: `${brand.name} miniature paints on Grimify. ${count} ${count === 1 ? 'paint' : 'paints'}.`
  ```
- **`src/app/hues/[id]/page.tsx`** — when `hue.parent_id` is set, fetch the parent and append the Itten classification:
  ```ts
  const parent = hue.parent_id ? await hueService.getHueById(hue.parent_id) : null
  const description = parent
    ? `${hue.name} (${parent.name}) — browse miniature paints in this hue on Grimify.`
    : `Browse miniature paints in the ${hue.name} hue on Grimify.`
  ```

### Step 3 — `build-og-url` helper

`src/modules/seo/utils/build-og-url.ts` (one export, no barrel):

```ts
/** Entities that have a dynamic OG image route. */
export type OgEntity = 'paint' | 'palette' | 'brand' | 'hue' | 'user'

/**
 * Builds the relative URL for an entity's dynamic OG image. The root
 * layout's `metadataBase` resolves this to an absolute URL when Next.js
 * renders the meta tags.
 */
export function buildOgUrl(entity: OgEntity, id: string | number): string {
  return `/api/og/${entity}/${id}`
}
```

### Step 4 — Dynamic OG image handlers

Five sibling files under `src/app/api/og/<entity>/[id]/route.tsx`. Common shape:

```tsx
import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const contentType = 'image/png'
export const size = { width: 1200, height: 630 }
```

Each handler:

1. Awaits `params`, resolves `id`.
2. Fetches the entity using the existing service (`getPaintService`, `getBrandService`, `getHueService`, `createPaletteService`) bound to a server Supabase client. Confirm during implementation that each `*-service.server.ts` runs on Edge — if any imports a Node-only module, copy a minimal inline query in the handler instead.
3. Returns `new Response('Not found', { status: 404 })` for missing entities, soft-deleted rows, private palettes (`!palette.is_public`), or profiles with no `display_name`.
4. Returns the `ImageResponse` with cache headers:
   ```ts
   return new ImageResponse(<Card />, {
     ...size,
     headers: { 'Cache-Control': 'public, max-age=300, s-maxage=86400' },
   })
   ```

Per-entity layouts (1200×630, dark background `#0a0a0a`, white text `#fafafa`):

| Entity   | Layout                                                                                                                                                                          |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| paint    | Left 600px = `paint.hex` swatch. Right = brand name (32px, 70% opacity) + paint name (72px, 600 weight) + uppercase hex (28px, 60% opacity).                                      |
| palette  | Top = palette name (large). Bottom = horizontal strip of up to 10 paint swatches (`palette_paints[].paints.hex`). If more, show "+N more" tile. Show owner display name (small). |
| brand    | Brand name (large) + total paint count + sampled row of up to 10 paint swatches from `getBrandPaints`. Logo is intentionally omitted (we don't host brand marks).                |
| hue      | Hue name (large) + parent hue name as Itten classification (small) + a single 600×630 swatch on the right in `hue.hex_code`.                                                     |
| user     | Left = circular avatar (or initials tile if no `avatar_url`) + display name. Right = bio truncated to 140 chars. 404 when no display name.                                       |

### Step 5 — Wire OG URLs into `generateMetadata`

`pageMetadata()` already accepts an `image` input and propagates it to OG and Twitter. For each public detail page, pass:

```ts
image: {
  url: buildOgUrl('paint', id),
  width: 1200,
  height: 630,
  alt: paint.name,
}
```

Pages to update:

- `src/app/paints/[id]/page.tsx` → `buildOgUrl('paint', id)`
- `src/app/brands/[id]/page.tsx` → `buildOgUrl('brand', numericId)`
- `src/app/hues/[id]/page.tsx` → `buildOgUrl('hue', id)`
- `src/app/users/[id]/page.tsx` → `buildOgUrl('user', id)`
- `src/app/palettes/[id]/page.tsx` → `buildOgUrl('palette', id)` only when `palette.isPublic && !noindex` branch

`metadataBase` from the root layout makes the relative `/api/og/...` paths absolute in the rendered tags.

### Step 6 — Verify

- `npm run lint` — clean.
- `npm run build` — clean. Watch specifically for Edge-runtime warnings from the OG handlers (a service module dragging in a Node-only import is the most likely failure).
- Manual smoke test against dev:
  - `GET /api/og/paint/<id>` and the other four entities — each returns a 1200×630 PNG.
  - `GET /api/og/palette/<private-id>` returns 404 from the anon client.
  - `GET /robots.txt` and `GET /sitemap.xml` resolve.
  - View-source on `/paints/<id>` shows `og:image` pointing at `/api/og/paint/<id>` with absolute origin.

### Risks & considerations

- **Edge runtime constraints.** `next/og` requires Edge runtime, but several of our `*-service.server.ts` modules import `createClient()` from `src/lib/supabase/server.ts` which uses `next/headers` cookies — that's Edge-safe, but any service that adds a Node-only dependency in the future will break the OG handlers. Audit each service file at implementation time before importing.
- **RLS vs service role.** OG handlers must use the cookie-aware (anon-by-RLS) client so crawlers can never pull private rows. Do **not** use a service-role client here. The explicit `is_public` and `display_name` guards in step 4 are belt-and-braces in case RLS policies drift.
- **Sitemap query cost.** Lean queries (`select id, updated_at`) are fine even with thousands of rows. If the catalog grows past tens of thousands, switch the sitemap to `export const revalidate = 3600` to regenerate hourly rather than on every request.
- **`metadataBase` in production.** Verify `NEXT_PUBLIC_SITE_URL` is set in Vercel/prod env so OG URLs resolve absolutely. Without it, social platforms may discard the tag.
- **Caching.** The `s-maxage=86400` on OG responses lets Slack / Discord / Twitter cache for a day. Stale images after a paint or palette edit are an acceptable tradeoff; if not, lower to `s-maxage=3600` or trigger revalidation on entity update (out of scope for v1).
- **Edit fall-through to `pageMetadata`.** `pageMetadata()` currently sets `og.images` only when `image` is provided. That's fine — the root layout's static `og-image.png` continues to fall through for routes that don't pass an image. No helper changes needed.

## Notes

- **Edge runtime** for OG handlers is required for `next/og`'s satori-based rendering. Keep DB queries to a single `select` per request — the budget is tight.
- **Caching**: by default, `next/og` `ImageResponse` is cacheable. Consider adding `Cache-Control: public, max-age=300, s-maxage=86400` to OG responses so social-media crawlers (Slack, Discord, Twitter) get a fast hit and revalidation happens daily.
- **Private palettes** must never expose an OG image — the OG handler checks `is_public` and returns 404 for private rows. Same check for soft-deleted profiles, paints, etc.
- **Sitemap dynamic content** is fetched from Supabase. If queries are heavy, switch the sitemap to be revalidated on a schedule rather than rebuilt on every deploy.
- The static `public/og-image.png` covers `/`, `/paints`, `/brands`, `/schemes`, `/palettes`, `/collection`, `(auth)` routes, and any future static page.
- Per-route `generateMetadata` should not throw on missing entities — return a "Not found" title with `robots: { index: false }` so crawlers don't index 404 pages.
- Future enhancement: dynamic OG for `/schemes` could render the generated scheme wheel snapshot. Out of scope for v1 — `/schemes` is interactive client-side state.
