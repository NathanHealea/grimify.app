# Metadata and OpenGraph

**Epic:** Marketing & Branding
**Type:** Feature
**Status:** Todo
**Branch:** `v1/feature/metadata-and-opengraph`

## Summary

Configure site-wide metadata, OpenGraph tags, and Twitter card tags so that Grimify renders rich previews when shared on social media, search engines, and messaging platforms.

## Acceptance Criteria

- [ ] Root layout exports a `metadata` object with site title, description, and keywords
- [ ] OpenGraph tags are set: `og:title`, `og:description`, `og:image`, `og:url`, `og:type`
- [ ] Twitter card tags are set: `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`
- [ ] A default OG image is created and placed in `public/og-image.png` (1200x630)
- [ ] Favicon and apple-touch-icon are configured
- [ ] `robots.txt` and `sitemap.xml` are generated or stubbed
- [ ] Per-page metadata can override defaults via `generateMetadata`
- [ ] `npm run build` and `npm run lint` pass with no errors

## Key Files

| Action | File | Description |
|---|---|---|
| Modify | `src/app/layout.tsx` | Add metadata export with defaults |
| Create | `public/og-image.png` | Default OpenGraph image (1200x630) |
| Replace | `src/app/favicon.ico` | Brand favicon |
| Create | `public/apple-touch-icon.png` | Apple touch icon (180x180) |
| Create | `src/app/robots.ts` | Robots.txt generation |
| Create | `src/app/sitemap.ts` | Sitemap generation |

## Implementation

### 1. Configure root metadata

Export a `metadata` object from `src/app/layout.tsx` using Next.js Metadata API:

```ts
export const metadata: Metadata = {
  title: {
    default: 'Grimify',
    template: '%s | Grimify',
  },
  description: 'Interactive color research and collection management for miniature painters.',
  keywords: ['miniature painting', 'color wheel', 'paint comparison', 'warhammer', 'paint collection'],
  openGraph: { ... },
  twitter: { ... },
}
```

### 2. Create OG image

Design a 1200x630 image with the Grimify logo/name and a brief tagline. Place in `public/og-image.png`.

### 3. Add favicon and touch icons

Replace the default Next.js favicon with a Grimify-branded icon. Add `apple-touch-icon.png` at 180x180.

### 4. Robots and sitemap

Create `src/app/robots.ts` and `src/app/sitemap.ts` using Next.js file conventions for SEO foundations.

## Notes

- The OG image is a placeholder until final branding assets are ready — it can be updated later.
- Per-page metadata (e.g., paint detail pages showing the paint name) will be added as those features are built.
- Consider `next/og` (ImageResponse) for dynamic OG images in the future.
