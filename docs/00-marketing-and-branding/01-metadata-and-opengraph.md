# Metadata and OpenGraph

**Epic:** Marketing & Branding
**Type:** Feature
**Status:** Todo
**Branch:** `v1/feature/metadata-and-opengraph`
**Merge into:** `v1/main`

## Summary

Configure site-wide metadata, OpenGraph tags, and Twitter card tags so Grimify renders rich previews when shared on social media, search engines, and messaging platforms.

Metadata is **dynamic per route**: each page that has unique content (paints, palettes, brands, hues, user profiles) generates its own title, description, and OpenGraph image at request time using Next.js's `generateMetadata` and the `next/og` `ImageResponse` API. Static routes (home, list pages, auth) fall back to a single shared `og-image.png` and the root metadata defaults.

The dynamic OG image handler renders real content — a paint's hex swatch with its name and brand, a palette's color strip with its title, a profile's avatar and display name — instead of a generic banner. This makes shared links visually distinct and recognizable.

## Acceptance Criteria

- [ ] Root `src/app/layout.tsx` exports a `metadata` object with site title (with `%s | Grimify` template), description, keywords, and default OpenGraph + Twitter card fields
- [ ] A static `public/og-image.png` (1200×630) exists as the fallback OG image for routes without dynamic content
- [ ] Favicon and `apple-touch-icon.png` (180×180) are configured, sourced from the branding icon
- [ ] `src/app/robots.ts` exposes a robots policy (allow all in production, disallow in non-prod via env)
- [ ] `src/app/sitemap.ts` generates a sitemap including all public static routes plus public palettes, paints, brands, hues, and profiles
- [ ] `src/app/paints/[id]/page.tsx` exports `generateMetadata` returning the paint's name + brand in the title and a description containing the paint's hex / hue
- [ ] `src/app/brands/[id]/page.tsx` exports `generateMetadata` with brand name + paint count
- [ ] `src/app/hues/[id]/page.tsx` exports `generateMetadata` with hue name + Itten classification
- [ ] `src/app/users/[id]/page.tsx` exports `generateMetadata` with display name + bio snippet
- [ ] `src/app/palettes/[id]/page.tsx` exports `generateMetadata` with palette name + paint count (only when palette is public; private palettes return `noindex` metadata)
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

### 1. Configure root metadata

In `src/app/layout.tsx`, export a `Metadata` object with the site-wide defaults:

```ts
import type { Metadata } from 'next'
import { siteUrl } from '@/modules/seo/utils/site-url'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: 'Grimify',
    template: '%s | Grimify',
  },
  description:
    'Interactive color research and collection management for miniature painters. Search paints, compare brands, explore color theory, and build palettes.',
  keywords: ['miniature painting', 'color wheel', 'paint comparison', 'warhammer paints', 'paint collection', 'color palette'],
  openGraph: {
    type: 'website',
    siteName: 'Grimify',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og-image.png'],
  },
}
```

The `metadataBase` ensures relative OG image URLs resolve against the canonical site origin in production. `siteUrl()` reads `NEXT_PUBLIC_SITE_URL` with a sensible fallback for local dev.

### 2. Static fallback OG image and favicons

Place a single 1200×630 `og-image.png` in `public/`. Replace `src/app/favicon.ico` with the branded favicon and add `public/apple-touch-icon.png` at 180×180. Both are sourced from the branding icon authored in [`02-branding-images.md`](./02-branding-images.md).

### 3. Robots and sitemap

`src/app/robots.ts`:

```ts
import type { MetadataRoute } from 'next'
import { siteUrl } from '@/modules/seo/utils/site-url'

export default function robots(): MetadataRoute.Robots {
  const isProd = process.env.NEXT_PUBLIC_ENV === 'production'
  return {
    rules: { userAgent: '*', allow: isProd ? '/' : undefined, disallow: isProd ? ['/admin'] : '/' },
    sitemap: `${siteUrl()}/sitemap.xml`,
  }
}
```

`src/app/sitemap.ts` queries Supabase for public entities (palettes where `is_public`, all paints, all brands, all hues, all profiles) and emits a `MetadataRoute.Sitemap` with appropriate `lastModified` and `changeFrequency` values. This runs at build time (or revalidates on a schedule) — keep the queries lean.

### 4. Per-route `generateMetadata`

Each dynamic public route exports `generateMetadata` that fetches the entity, returns its title/description, and points OG images at the corresponding `/api/og/...` handler. Example for `src/app/paints/[id]/page.tsx`:

```ts
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const paint = await getPaintById(id)
  if (!paint) return { title: 'Paint not found' }

  return {
    title: `${paint.name} — ${paint.brand_name}`,
    description: `${paint.name} by ${paint.brand_name}. Hex ${paint.hex_color}.`,
    openGraph: { images: [{ url: `/api/og/paint/${id}`, width: 1200, height: 630 }] },
    twitter: { images: [`/api/og/paint/${id}`] },
  }
}
```

Private palettes return:

```ts
return { title: 'Palette', robots: { index: false, follow: false } }
```

### 5. Dynamic OG image handlers (`next/og`)

Each `src/app/api/og/<entity>/[id]/route.tsx` is a route handler that returns an `ImageResponse`. Example for paints:

```tsx
import { ImageResponse } from 'next/og'
import { getPaintById } from '@/modules/paints/services/paint-service'

export const runtime = 'edge'
export const contentType = 'image/png'
export const size = { width: 1200, height: 630 }

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const paint = await getPaintById(id)
  if (!paint) return new Response('Not found', { status: 404 })

  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%', background: '#0a0a0a' }}>
        <div style={{ width: 600, background: paint.hex_color }} />
        <div style={{ flex: 1, padding: 64, color: '#fafafa', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 32, opacity: 0.7 }}>{paint.brand_name}</div>
          <div style={{ fontSize: 72, fontWeight: 600, marginTop: 16 }}>{paint.name}</div>
          <div style={{ fontSize: 28, marginTop: 32, opacity: 0.6 }}>{paint.hex_color.toUpperCase()}</div>
        </div>
      </div>
    ),
    { ...size },
  )
}
```

Apply the same pattern to:

- **Palette OG**: render the palette name and a horizontal strip of paint hex swatches; show paint count if more than fit in the strip.
- **Brand OG**: brand name + total paint count + a sampling row of paint swatches.
- **Hue OG**: hue name + Itten parent classification + a swatch in the hue's representative color.
- **User OG**: avatar (or initial circle), display name, bio snippet (truncated to ~140 chars). Profiles that are private or have no display name return 404.

Each handler defends against missing entities with a 404 — crawlers that hit a stale URL get a clean miss instead of a broken image.

### 6. Wire OG URLs from `generateMetadata`

`src/modules/seo/utils/build-og-url.ts`:

```ts
export function buildOgUrl(entity: 'paint' | 'palette' | 'brand' | 'hue' | 'user', id: string): string {
  return `/api/og/${entity}/${id}`
}
```

Each `generateMetadata` calls `buildOgUrl('paint', id)` and uses the result for both `openGraph.images` and `twitter.images`. `metadataBase` from the root layout makes relative URLs absolute in the rendered tags.

## Notes

- **Edge runtime** for OG handlers is required for `next/og`'s satori-based rendering. Keep DB queries to a single `select` per request — the budget is tight.
- **Caching**: by default, `next/og` `ImageResponse` is cacheable. Consider adding `Cache-Control: public, max-age=300, s-maxage=86400` to OG responses so social-media crawlers (Slack, Discord, Twitter) get a fast hit and revalidation happens daily.
- **Private palettes** must never expose an OG image — the OG handler checks `is_public` and returns 404 for private rows. Same check for soft-deleted profiles, paints, etc.
- **Sitemap dynamic content** is fetched from Supabase. If queries are heavy, switch the sitemap to be revalidated on a schedule rather than rebuilt on every deploy.
- The static `public/og-image.png` covers `/`, `/paints`, `/brands`, `/schemes`, `/palettes`, `/collection`, `(auth)` routes, and any future static page.
- Per-route `generateMetadata` should not throw on missing entities — return a "Not found" title with `robots: { index: false }` so crawlers don't index 404 pages.
- Future enhancement: dynamic OG for `/schemes` could render the generated scheme wheel snapshot. Out of scope for v1 — `/schemes` is interactive client-side state.
