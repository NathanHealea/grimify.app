# Branding Assets

**Epic:** SEO & Branding
**Type:** Feature
**Status:** Todo

## Summary

Create branding assets for the Color Wheel app including a logo, favicon, and social sharing image. These assets establish visual identity and are used across the site, in browser tabs, bookmarks, and social media previews. This is primarily a design task — the development work is placing the assets in the correct locations and referencing them in metadata.

## Acceptance Criteria

- [ ] Logo designed (SVG preferred for scalability)
- [ ] Favicon set created: `favicon.ico` (16x16, 32x32), `apple-touch-icon.png` (180x180), `icon-192.png`, `icon-512.png`
- [ ] Open Graph image created (1200x630px) for social sharing previews
- [ ] All assets placed in `public/` directory
- [ ] Favicon referenced in `src/app/layout.tsx` metadata via `icons` property
- [ ] Logo component or image available for use in the navbar
- [ ] Brand colors documented (primary, secondary, accent) for consistent use

## Implementation Plan

### Step 1: Design branding assets

Create the following assets (design task — outside the codebase):

- **Logo** — SVG format, representing the color wheel concept. Should work at small sizes (navbar) and large sizes (Open Graph image).
- **Favicon** — Derived from the logo. Generate multiple sizes:
  - `favicon.ico` (multi-resolution: 16x16, 32x32)
  - `apple-touch-icon.png` (180x180)
  - `icon-192.png` (192x192, for PWA manifest)
  - `icon-512.png` (512x512, for PWA manifest)
- **Open Graph image** — 1200x630px image with logo, app name, and tagline. Used when the site is shared on social media.
- **Brand colors** — Define primary, secondary, and accent colors. These may align with the DaisyUI "nord" theme already in use, or define custom overrides.

### Step 2: Add assets to public directory

Create `public/` directory and place assets:

```
public/
├── favicon.ico
├── apple-touch-icon.png
├── icon-192.png
├── icon-512.png
├── logo.svg
└── og-image.png
```

### Step 3: Update layout metadata with icons

**`src/app/layout.tsx`** — Add `icons` to the metadata export:

```typescript
export const metadata: Metadata = {
  title: 'Miniature Paint Color Wheel',
  description: 'Interactive color wheel for miniature paint hobbyists',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}
```

### Step 4: Create logo component (optional)

**`src/components/Logo.tsx`** — Simple component rendering the logo SVG, used in the navbar. Accepts `size` prop for flexibility.

### Affected Files

| File | Changes |
|------|---------|
| `public/favicon.ico` | New — multi-resolution favicon |
| `public/apple-touch-icon.png` | New — Apple touch icon |
| `public/icon-192.png` | New — 192px icon |
| `public/icon-512.png` | New — 512px icon |
| `public/logo.svg` | New — logo asset |
| `public/og-image.png` | New — Open Graph social image |
| `src/app/layout.tsx` | Add `icons` to metadata |
| `src/components/Logo.tsx` | New (optional) — logo component |

### Risks & Considerations

- This is primarily a design task. The development implementation is minimal once assets are created.
- Favicon generation tools (like realfavicongenerator.net or favycon) can create all required sizes from a single high-res source image.
- The Open Graph image should be tested with social media debuggers (Facebook Sharing Debugger, Twitter Card Validator) after the SEO Metadata feature is implemented.
