# Paint Swatch CSS Primitive

**Epic:** Design System
**Type:** Feature
**Status:** Todo
**Branch:** `feature/paint-swatch-css-primitive`
**Merge into:** `main`

## Overview

DESIGN.md §2 (Paint Swatch Colors) and §7 (Do's) state:
> "Paint swatches are user-supplied hex values rendered as filled circles or squares. They are never styled by the design system — their color IS the content. Always render them against a neutral background (`--card` or `--muted`) so the swatch dominates."
> "Let the swatch lead. Paint color circles/squares are always the largest visual element on a paint card."

Currently there are no CSS classes for paint swatches. Each usage site independently implements swatch sizing and border, leading to inconsistency:
- `paint-card.tsx`: `size-16 rounded-lg` (square)
- `collection-paint-card.tsx`: unknown (needs audit)
- `paint-detail.tsx`: unknown (needs audit)

A shared `.paint-swatch` CSS primitive would ensure consistent sizing, border, and neutral background across all contexts.

## Acceptance Criteria

- [ ] `src/styles/paint-swatch.css` is created with the following classes:
  - `.paint-swatch` — base circle: `size-10 rounded-full border border-border flex-shrink-0`
  - `.paint-swatch-sm` — `size-8 rounded-full border border-border flex-shrink-0`
  - `.paint-swatch-lg` — `size-14 rounded-full border border-border flex-shrink-0`
  - `.paint-swatch-xl` — `size-16 rounded-full border border-border flex-shrink-0` (for detail views)
  - `.paint-swatch-square` — modifier that changes `rounded-full` to `rounded-lg` (for square variant)
- [ ] The file is imported in `globals.css` under `layer(components)` with a proper doc header matching the CSS file documentation convention
- [ ] Existing swatch usages in `paint-card.tsx`, `collection-paint-card.tsx`, and `paint-detail.tsx` are updated to use `.paint-swatch` + appropriate size modifier
- [ ] Color is always applied inline via `style={{ backgroundColor: hex }}` — never via a CSS class
- [ ] Works in light and dark mode (border token adapts automatically)
- [ ] `npm run build` and `npm run lint` pass with no errors

## Implementation Notes

**Target CSS file:** `src/styles/paint-swatch.css`

Example usage:
```tsx
<div
  className="paint-swatch"
  style={{ backgroundColor: hex }}
  aria-hidden="true"
/>
```

For a square variant (e.g., comparison view):
```tsx
<div
  className="paint-swatch paint-swatch-xl paint-swatch-square"
  style={{ backgroundColor: hex }}
/>
```

Check these files for swatch usage:
- `src/modules/paints/components/paint-card.tsx`
- `src/modules/paints/components/paint-detail.tsx`
- `src/modules/collection/components/collection-paint-card.tsx`
- `src/modules/paints/components/substitute-paint-card.tsx`
- Any comparison or scheme explorer components
