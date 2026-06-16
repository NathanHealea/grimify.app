# Branding Images

**Epic:** Marketing & Branding
**Type:** Feature
**Status:** In Progress
**Branch:** `v1/feature/branding-images`
**Merge into:** `v1/main`

## Summary

Create and integrate the core branding assets for Grimify — logo, icon, and key visual assets used across the app, social media, and marketing.

## Acceptance Criteria

- [ ] Primary logo exists in SVG and PNG formats
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

## Implementation Plan

### Current state (already shipped)

Branding images are largely in place; the implementation diverged from the original "G-with-paint-drip SVG" design in this doc and settled on a **raster-PNG mark + text wordmark**. Confirmed during exploration:

- **Assets in `public/branding/`** — `grimify-logo.png` (square master, ~1.3MB), `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png`, `android-chrome-192x192.png`, `android-chrome-512x512.png`, `site.webmanifest`.
- **Root-level icons** — `src/app/favicon.ico` and `src/app/apple-touch-icon.png` (picked up by Next.js file-based metadata convention).
- **OG image** — `public/og-image.png` (1200×630).
- **Logo component** — `src/components/logo.tsx` exports `Logo`, `LogoVariant` (`full | mark | wordmark`), `LogoSize` (`sm | md | lg | xl | 2xl | 3xl`), `LogoProps`. The `mark` is `grimify-logo.png` via `next/image`; the `wordmark` is text in the display font inheriting `currentColor`. Fully JSDoc'd.
- **Usages** — `src/components/navbar.tsx` (`size="md"`), `src/components/navbar-mobile-menu.tsx` (`size="sm"`), `src/app/(auth)/layout.tsx` (`size="2xl"`).
- **Generator** — `scripts/generate-branding-pngs.mjs` (Sharp) currently produces `public/og-image.png` from the master PNG. It does **not** generate the icon set.
- **Metadata wiring** — `src/app/layout.tsx` references `manifest: '/branding/site.webmanifest'` and OG/Twitter images.

The `Logo` component renders the same PNG mark on light and dark backgrounds (criterion met via a theme-agnostic mark + `currentColor` wordmark). The only criterion not yet satisfied is **"Primary logo exists in SVG and PNG formats"** — no SVG sources exist today.

### Module placement

Branding images are cross-cutting brand UI atoms with no domain logic, so they stay outside `src/modules/*` — exactly as already implemented. `Logo` lives in `src/components/` (shared component), static assets in `public/branding/`, and the rasterizer in `scripts/`. No new module is created; route pages continue to import `Logo` directly from `@/components/logo` (no barrel file).

### Phase 1 — Add SVG sources for the logo and mark

Satisfies the outstanding "SVG and PNG formats" criterion and gives a resolution-independent master for re-rasterizing.

- Create `public/branding/grimify-logo.svg` — vector master of the existing mark (export/trace from `grimify-logo.png`).
- Create `public/branding/icon.svg` — square mark-only vector, with the brand stroke/fill using `currentColor` where it should theme.
- Keep `grimify-logo.png` as the raster master the generator consumes (the `Logo` component continues using the PNG via `next/image`; no component change required this phase).
- Verify `npm run build` and `npm run lint` stay green (adding static files only).

### Phase 2 — Extend the rasterizer to own the full icon set

Make `scripts/generate-branding-pngs.mjs` the single source of truth so every raster is regenerable from a master, not hand-edited.

- Extend the script to emit, from the master (`icon.svg` if added, else `grimify-logo.png`): `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png` (180×180), `android-chrome-192x192.png`, `android-chrome-512x512.png`, and the existing `og-image.png`.
- Keep `public/branding/` as the output directory; mirror `apple-touch-icon.png` and `favicon.ico` into `src/app/` (or document that Next.js file-based metadata reads them from there).
- Add a one-line npm script alias (e.g. `"branding": "node scripts/generate-branding-pngs.mjs"`) so the command is discoverable; update the script's header JSDoc to list every output.
- Run the script, confirm the regenerated files are byte-stable vs. the committed ones (or intentionally improved), and that `build`/`lint` pass.

### Phase 3 — Audit metadata icon coverage

Ensure the icon set is actually advertised to browsers/PWAs, not just present on disk.

- In `src/app/layout.tsx` metadata, confirm/add an `icons` block (`icon`, `shortcut`, `apple`) pointing at the `public/branding/` set, or rely on the `src/app/` file-based convention — pick one approach and make it explicit so there's no ambiguity between the two icon locations.
- Confirm `site.webmanifest` lists the `android-chrome-192/512` icons with correct `sizes`/`type`.
- Verify in a browser: favicon renders in the tab, `apple-touch-icon` is offered on iOS add-to-home, and the manifest validates. `build`/`lint` pass.

### Order of operations

1. Phase 1 — SVG sources (closes the open acceptance criterion; lowest risk, additive only).
2. Phase 2 — rasterizer owns the icon set (refactor of an existing script; regenerate and diff).
3. Phase 3 — metadata audit (verification + small metadata edits).

Each phase is self-contained and leaves types/lint green. The working PNG-based `Logo` component is intentionally left as-is — the original SVG-inline design in the "Implementation" section above was superseded and should not be reverted.

## Risks & Considerations

- **Two icon locations.** Icons exist both in `public/branding/` and `src/app/` (`favicon.ico`, `apple-touch-icon.png`). Phase 3 must settle which path is authoritative to avoid drift; Next.js file-based metadata in `src/app/` will override a `public/`-based `icons` metadata entry.
- **Doc-vs-reality divergence.** The prose "Implementation" section describes an SVG `currentColor` mark and an inline-SVG `Logo`; the shipped component uses a PNG via `next/image`. This plan tracks the shipped reality — do not rebuild the component around inline SVG.
- **Master fidelity.** `grimify-logo.png` is the current master. If a true vector master isn't available, the Phase 1 SVGs are a trace approximation; keep the PNG as the rasterization source until a clean vector exists.
- **Regeneration determinism.** Sharp output can differ across versions; pin/note the Sharp version so regenerated rasters don't churn the diff on unrelated runs.

## Notes

- Logo design can be iterated — start with a simple text-based logo and refine later.
- The icon should be recognizable at 16x16 (favicon size) up to 512x512.
- Consider using the logo component in the auth layout, main layout header, and footer.
