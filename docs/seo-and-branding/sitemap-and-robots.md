# Sitemap & Robots

**Epic:** SEO & Branding
**Type:** Feature
**Status:** Todo

## Summary

Add a dynamic sitemap and robots.txt to the site so search engines can discover and index all public pages. The sitemap includes static pages and dynamically generated shared palette/project pages. The robots.txt allows crawling of public pages and disallows admin routes.

## Acceptance Criteria

- [ ] Dynamic sitemap generated at `/sitemap.xml` via Next.js `sitemap.ts`
- [ ] Sitemap includes the root page (`/`)
- [ ] Sitemap includes shared palette and project pages (when Sharing feature exists)
- [ ] `robots.txt` generated at `/robots.txt` via Next.js `robots.ts`
- [ ] Robots allows crawling of public pages
- [ ] Robots disallows `/admin/*`, `/profile/*`, `/palettes/*`, `/projects/*` (private user pages)
- [ ] Robots references the sitemap URL
- [ ] Sitemap validates with Google Search Console

## Implementation Plan

### Step 1: Create robots.txt

**`src/app/robots.ts`** — Next.js App Router convention for generating robots.txt:

```typescript
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/profile/', '/palettes/', '/projects/'],
      },
    ],
    sitemap: 'https://colorwheel.nathanhealea.com/sitemap.xml',
  }
}
```

### Step 2: Create sitemap

**`src/app/sitemap.ts`** — Next.js App Router convention for generating sitemap.xml:

```typescript
import type { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: 'https://colorwheel.nathanhealea.com',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ]

  // When Sharing feature exists, add shared palette/project URLs:
  // const sharedPalettes = await getSharedPalettes()
  // const palettePages = sharedPalettes.map(p => ({
  //   url: `https://colorwheel.nathanhealea.com/shared/palette/${p.share_token}`,
  //   lastModified: new Date(p.updated_at),
  //   changeFrequency: 'monthly' as const,
  //   priority: 0.6,
  // }))

  return [...staticPages]
}
```

### Step 3: Verify with search engines

After deploying:
1. Submit sitemap URL to Google Search Console
2. Test robots.txt with Google's robots.txt Tester
3. Verify sitemap validates (no errors, all URLs accessible)

### Affected Files

| File | Changes |
|------|---------|
| `src/app/robots.ts` | New — robots.txt generation |
| `src/app/sitemap.ts` | New — sitemap.xml generation |

### Dependencies

- [SEO Metadata](./seo-metadata.md) — `metadataBase` URL should be consistent

### Risks & Considerations

- **Hardcoded URLs:** The sitemap and robots.txt reference `https://colorwheel.nathanhealea.com`. Consider using an environment variable (`NEXT_PUBLIC_SITE_URL`) for flexibility across environments.
- **Shared pages in sitemap:** When the Sharing feature is implemented, shared palettes/projects should be added to the sitemap dynamically. This requires querying Supabase for all `is_shared = true` items, which means this file will need updating later.
- **Disallowed routes:** User-specific pages (`/palettes/`, `/projects/`, `/profile/`, `/admin/`) are disallowed to prevent indexing of private content. Public shared pages use the `/shared/` path which is allowed.
