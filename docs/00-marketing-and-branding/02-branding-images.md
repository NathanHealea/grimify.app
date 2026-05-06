# Branding Images

**Epic:** Marketing & Branding
**Type:** Feature
**Status:** Completed
**Branch:** `v1/feature/branding-images`
**Merge into:** `v1/main`

## Summary

Create and integrate the core branding assets for Grimify — logo, icon, and key visual assets used across the app, social media, and marketing.

## Acceptance Criteria

- [x] Primary logo exists in SVG and PNG formats
- [x] Icon/mark version exists for small contexts (favicon, app icon, avatar)
- [x] Logo renders in the app header/navbar
- [x] Logo has light and dark mode variants (or works on both backgrounds)
- [x] Assets are organized in `public/branding/`
- [x] A logo component exists for consistent usage across the app
- [x] `npm run build` and `npm run lint` pass with no errors

## Key Files

| Action | File                                | Description                                                       |
| ------ | ----------------------------------- | ----------------------------------------------------------------- |
| Create | `public/branding/logo.svg`          | Primary logo (mark + Grimify wordmark)                            |
| Create | `public/branding/icon.svg`          | Square icon/mark — stroke uses `currentColor` for theming         |
| Create | `public/branding/icon.png`          | Icon in PNG (512x512), rasterized from `icon.svg`                 |
| Create | `public/apple-touch-icon.png`       | 180x180 Apple touch icon, rasterized from `icon.svg`              |
| Create | `src/components/logo.tsx`           | Logo component with `variant`/`size` props; uses `currentColor`   |
| Create | `scripts/generate-branding-pngs.mjs`| Sharp-based rasterizer for PNG outputs                            |
| Modify | `src/components/navbar.tsx`         | Replace text brand link with `<Logo />`                           |

## Implementation

### 1. Design logo assets

The mark is a **G-with-paint-drip** glyph: a stroked counter-clockwise arc forming the G, terminated by an inward bar, with a vertical drip line and small filled circle hanging beneath the curve. ViewBox `0 0 64 72` accommodates the drip below the G's baseline. Stroke width 8, round caps and joins.

The full logo pairs the mark with a "Grimify" wordmark set in **Geist Semibold** at the same x-height as the mark.

### 2. Export assets

- `icon.svg` and `logo.svg` use `stroke="currentColor"` so a single asset themes to any text color (light, dark, branded).
- `icon.png` (512x512) and `apple-touch-icon.png` (180x180) are rasterized at build/script time from `icon.svg` via `scripts/generate-branding-pngs.mjs` (Sharp), substituting `currentColor` with `#0a0a0a` for the static raster.
- Run the rasterizer with `node scripts/generate-branding-pngs.mjs` whenever the icon SVG changes.

### 3. Create logo component

`src/components/logo.tsx` exports a `<Logo>` component with two props:

- `variant`: `'full' | 'mark' | 'wordmark'` (default `'full'`)
- `size`: `'sm' | 'md' | 'lg' | 'xl'` (default `'md'`)

The mark is rendered inline as SVG so it inherits text color via `currentColor`. The wordmark is plain text styled with the site's display font (Geist) — no separate dark-mode variant is needed.

### 4. Organize in public/branding/

All static branding assets live in `public/branding/`. The Apple touch icon lives at `public/apple-touch-icon.png` because Next.js looks for it there by convention.

## Notes

- Logo design can be iterated — start with a simple text-based logo and refine later.
- The icon should be recognizable at 16x16 (favicon size) up to 512x512.
- Consider using the logo component in the auth layout, main layout header, and footer.
