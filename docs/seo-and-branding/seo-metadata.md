# SEO Metadata

**Epic:** SEO & Branding
**Type:** Feature
**Status:** Todo

## Summary

Implement comprehensive SEO metadata across the site including Open Graph tags, Twitter Card tags, canonical URLs, structured data (JSON-LD), and a web app manifest. This ensures the site appears correctly in search results, social media shares, and browser features.

## Acceptance Criteria

- [ ] Open Graph meta tags set: `og:title`, `og:description`, `og:image`, `og:url`, `og:type`, `og:site_name`
- [ ] Twitter Card meta tags set: `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`
- [ ] Canonical URL set via metadata
- [ ] JSON-LD structured data for `WebApplication` type
- [ ] Web app manifest (`manifest.json`) with app name, icons, theme color, background color
- [ ] Metadata is dynamic for shared pages (palettes, projects) — shows palette/project name and description
- [ ] All meta tags validate with social media debuggers (Facebook, Twitter/X)
- [ ] Google Search Console verification meta tag placeholder

## Implementation Plan

### Step 1: Update root layout metadata

**`src/app/layout.tsx`** — Expand the metadata export with full SEO properties:

```typescript
export const metadata: Metadata = {
  title: {
    default: 'Miniature Paint Color Wheel',
    template: '%s | Color Wheel',
  },
  description:
    'Interactive color wheel for miniature paint hobbyists. Visualize 400+ paints from Citadel, Army Painter, Vallejo, and Green Stuff World by hue and lightness. Compare brands, explore color schemes, and build palettes.',
  metadataBase: new URL('https://colorwheel.nathanhealea.com'),
  openGraph: {
    type: 'website',
    siteName: 'Miniature Paint Color Wheel',
    title: 'Miniature Paint Color Wheel',
    description:
      'Interactive color wheel for miniature paint hobbyists. Visualize 400+ paints by hue and lightness.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Miniature Paint Color Wheel',
    description:
      'Interactive color wheel for miniature paint hobbyists. Visualize 400+ paints by hue and lightness.',
    images: ['/og-image.png'],
  },
  manifest: '/manifest.json',
  robots: {
    index: true,
    follow: true,
  },
}
```

The `title.template` allows sub-pages (palettes, projects, shared pages) to set their own title that gets appended with "| Color Wheel".

### Step 2: Add JSON-LD structured data

**`src/app/layout.tsx`** — Add a `<script type="application/ld+json">` tag in the `<head>` via Next.js metadata or a component:

```json
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Miniature Paint Color Wheel",
  "url": "https://colorwheel.nathanhealea.com",
  "description": "Interactive color wheel for miniature paint hobbyists",
  "applicationCategory": "UtilityApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  }
}
```

### Step 3: Create web app manifest

**`public/manifest.json`**:

```json
{
  "name": "Miniature Paint Color Wheel",
  "short_name": "Color Wheel",
  "description": "Interactive color wheel for miniature paint hobbyists",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#eceff4",
  "theme_color": "#0a0a0a",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

The `background_color` uses the DaisyUI nord theme base color. `theme_color` matches the existing viewport config.

### Step 4: Add dynamic metadata for shared pages

When the Sharing feature (Color Palette epic) is implemented, shared palette and project pages should export their own metadata:

**`src/app/shared/palette/[token]/page.tsx`**:

```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const palette = await getSharedPalette(params.token)
  return {
    title: palette.name,
    description: palette.description || `A color palette with ${palette.paints.length} paints`,
    openGraph: {
      title: palette.name,
      description: palette.description || `A color palette with ${palette.paints.length} paints`,
    },
  }
}
```

This step is deferred until the Sharing feature exists. Document it here for future reference.

### Affected Files

| File | Changes |
|------|---------|
| `src/app/layout.tsx` | Expand metadata with OG, Twitter, manifest, structured data |
| `public/manifest.json` | New — web app manifest |

### Dependencies

- [Branding Assets](./branding-assets.md) — Open Graph image and icons must exist before metadata references them

### Risks & Considerations

- **`metadataBase`** must match the production URL. Use an environment variable if the domain changes.
- **Dynamic metadata for shared pages** depends on the Sharing feature from the Color Palette epic. The root metadata covers the main pages; dynamic metadata is added incrementally.
- **Social media caching:** After deploying, use Facebook Sharing Debugger and Twitter Card Validator to clear cached previews and verify the new metadata.
- **Structured data testing:** Use Google's Rich Results Test to validate JSON-LD markup.
