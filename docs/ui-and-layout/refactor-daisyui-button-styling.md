# Refactor DaisyUI Button Styling

**Epic:** UI & Layout
**Type:** Refactor
**Status:** In Progress

## Summary

All sidebar buttons (Brand Ring toggle, Brand Filter, Color Scheme) use inconsistent styling approaches — a mix of `btn-active` class toggling, hardcoded inline `style` attributes, and raw hex colors. This creates visual inconsistency and a WCAG contrast failure (white text on yellow for Split Complementary). The DaisyUI theme only defines `primary` and `base` colors, leaving no semantic palette for the rest of the UI.

This refactor extends the DaisyUI theme with semantic colors and migrates all sidebar buttons to DaisyUI utility classes for a cohesive, accessible design.

## Current State

### DaisyUI theme (`src/app/globals.css`)

Only `primary` and `base` colors are defined. No `secondary`, `accent`, `info`, `success`, `warning`, or `error` tokens exist.

### Brand Ring toggle (`src/app/page.tsx`, line 255)

Uses `btn-active` when on — a generic DaisyUI "pressed" look with no distinct color. Doesn't match the colored active states of the other sidebar buttons.

```tsx
<button className={`btn btn-sm w-full ${showBrandRing ? 'btn-active' : ''}`} ...>
```

### Brand Filter buttons (`src/app/page.tsx`, lines 275–297)

Inline `style` with brand hex colors. Active: filled background + white text. Inactive: colored border + colored text. The "All Brands" button uses `#888`.

```tsx
style={brandFilter.has(brand.id)
  ? { backgroundColor: brand.color, borderColor: brand.color, color: '#fff' }
  : { borderColor: brand.color, color: brand.color }}
```

### Color Scheme buttons (`src/app/page.tsx`, lines 307–326)

Same inline `style` pattern with hardcoded colors. Split Complementary uses `#ffee58` yellow background with `#fff` white text — nearly invisible and fails WCAG AA contrast.

```tsx
style={colorScheme === value
  ? { backgroundColor: color, borderColor: color, color: '#fff' }
  : { borderColor: color, color }}
```

## Acceptance Criteria

- [x] DaisyUI theme in `globals.css` extended with semantic color tokens (`secondary`, `accent`, `info`, `success`, `warning`, `error` and their `-content` counterparts)
- [x] Color Scheme buttons use DaisyUI classes instead of inline styles
- [x] All active button states meet WCAG AA contrast (no white-on-yellow)
- [x] Brand Filter buttons use DaisyUI `btn-outline` / `btn-ghost` patterns with minimal inline overrides for brand-specific colors
- [x] Brand Ring toggle uses the same active/inactive styling pattern as the other sidebar buttons
- [x] Inactive states across all sidebar button groups use a consistent outline/ghost variant

## Implementation Plan

### Step 1 — Extend the DaisyUI theme

**File:** `src/app/globals.css`

Add semantic color tokens to the `colorwheel` theme. Choose colors that work on the dark base and use black `-content` text where needed for contrast:

```css
--color-secondary: #a78bfa;
--color-secondary-content: #ffffff;
--color-accent: #f59e0b;
--color-accent-content: #000000;
--color-info: #38bdf8;
--color-info-content: #000000;
--color-success: #4ade80;
--color-success-content: #000000;
--color-warning: #facc15;
--color-warning-content: #000000;
--color-error: #f87171;
--color-error-content: #000000;
```

Key: yellow, green, and blue backgrounds get **black** content text to guarantee WCAG AA contrast.

### Step 2 — Refactor Color Scheme buttons

**File:** `src/app/page.tsx`

Replace inline-style color scheme buttons with DaisyUI class-based buttons. Map each scheme to a semantic color:

| Scheme | DaisyUI color | Active class | Inactive class |
|--------|--------------|--------------|----------------|
| No Scheme | neutral (base-300) | `btn-active` | `btn-ghost` |
| Complementary | `info` | `btn-info` | `btn-outline btn-info` |
| Split Complementary | `warning` | `btn-warning` | `btn-outline btn-warning` |
| Analogous | `success` | `btn-success` | `btn-outline btn-success` |

Update the button data array to reference class names instead of hex colors:

```tsx
const schemeOptions = [
  { label: 'No Scheme', value: 'none', activeClass: 'btn-active', inactiveClass: 'btn-ghost' },
  { label: 'Complementary', value: 'complementary', activeClass: 'btn-info', inactiveClass: 'btn-outline btn-info' },
  { label: 'Split Complementary', value: 'split', activeClass: 'btn-warning', inactiveClass: 'btn-outline btn-warning' },
  { label: 'Analogous', value: 'analogous', activeClass: 'btn-success', inactiveClass: 'btn-outline btn-success' },
] as const
```

Remove the `style` prop entirely. Use `className` with the appropriate active/inactive class.

### Step 3 — Refactor Brand Filter buttons

**File:** `src/app/page.tsx`

Brand colors are per-brand and dynamic (from `brands.json`), so they can't map to fixed DaisyUI semantic colors. Use DaisyUI structural classes with minimal inline color overrides:

- **"All Brands" button:** `btn-active` / `btn-ghost` — no inline styles needed
- **Inactive brand buttons:** `btn-ghost` with `style={{ color: brand.color }}` for text color
- **Active brand buttons:** `btn` with `style={{ backgroundColor: brand.color, borderColor: brand.color, color: '#fff' }}` — acceptable since brand colors are mid-tone with good contrast against white

The key improvement is consistency: all inactive states use `btn-ghost`, all active states are visually distinct.

### Step 4 — Refactor Brand Ring toggle

**File:** `src/app/page.tsx`

Replace the generic `btn-active` toggle with `btn-primary` for the active state and `btn-outline btn-primary` for the inactive state, matching the pattern established in Steps 2–3:

```tsx
<button
  className={`btn btn-sm w-full ${showBrandRing ? 'btn-primary' : 'btn-outline btn-primary'}`}
  onClick={() => setShowBrandRing(!showBrandRing)}>
  Brand Ring
</button>
```

### Files Changed

| File | Changes |
|------|---------|
| `src/app/globals.css` | Add semantic color tokens to DaisyUI theme |
| `src/app/page.tsx` | Replace inline styles with DaisyUI classes for all sidebar buttons |

## Risks & Considerations

- **Brand colors are dynamic:** Brand filter buttons get their color from `brands.json`. These can't be fully mapped to DaisyUI semantic colors, so minimal inline styles remain acceptable for brand-specific colors.
- **Wedge overlay colors:** The scheme wedge colors in `colorUtils.ts` (`getSchemeWedges`) use separate colors for SVG overlays. These are independent of button styling and don't change.
- **DaisyUI v5 theming:** DaisyUI 5 uses CSS-based `@plugin` syntax. The semantic color format is `--color-{name}` (verified from the existing theme).
- **Primary color usage:** The existing theme defines `--color-primary: #6366f1` (indigo). The Brand Ring toggle uses this to distinguish itself as a visualization toggle rather than a filter or scheme selector.
