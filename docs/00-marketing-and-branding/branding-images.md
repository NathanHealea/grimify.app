# Branding Images

**Epic:** Marketing & Branding
**Type:** Feature
**Status:** Todo
**Branch:** `v1/feature/branding-images`

## Summary

Create and integrate the core branding assets for Grimify — logo, icon, and key visual assets used across the app, social media, and marketing.

## Acceptance Criteria

- [ ] Primary logo exists in SVG and PNG formats
- [ ] Icon/mark version exists for small contexts (favicon, app icon, avatar)
- [ ] Logo renders in the app header/navbar
- [ ] Logo has light and dark mode variants (or works on both backgrounds)
- [ ] Assets are organized in `public/branding/`
- [ ] A logo component exists for consistent usage across the app
- [ ] `npm run build` and `npm run lint` pass with no errors

## Key Files

| Action | File                            | Description                           |
| ------ | ------------------------------- | ------------------------------------- |
| Create | `public/branding/logo.svg`      | Primary logo (full)                   |
| Create | `public/branding/logo-dark.svg` | Logo variant for dark backgrounds     |
| Create | `public/branding/icon.svg`      | Square icon/mark                      |
| Create | `public/branding/icon.png`      | Icon in PNG (512x512)                 |
| Create | `src/components/logo.tsx`       | Logo component with dark mode support |

## Implementation

### 1. Design logo assets

Create the Grimify logo and icon mark. The logo should communicate:

- Color/paint (the app's domain)
- Tools/research (the app's purpose)
- Clean, modern aesthetic that works at small and large sizes

### 2. Export assets

Export in multiple formats:

- SVG for web rendering (logo and icon)
- PNG at 512x512 for icon contexts
- Ensure logos work on both light and dark backgrounds

### 3. Create logo component

A React component that renders the logo SVG inline (for color theming) or as an image. Accepts size and variant props. Automatically switches between light/dark variants based on theme.

### 4. Organize in public/branding/

Place all static assets in `public/branding/` for consistent access.

## Notes

- Logo design can be iterated — start with a simple text-based logo and refine later.
- The icon should be recognizable at 16x16 (favicon size) up to 512x512.
- Consider using the logo component in the auth layout, main layout header, and footer.
