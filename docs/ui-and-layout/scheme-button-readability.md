# Scheme Button Readability

**Epic:** UI & Layout
**Type:** Bug
**Status:** Todo

## Summary

The Color Scheme buttons in the sidebar use hardcoded inline `style` attributes with poor contrast colors. The Split Complementary button (`#ffee58` yellow background with `#fff` white text) is nearly invisible when active. Complementary (`#4fc3f7`) and Analogous (`#81c784`) also have marginal contrast against white text. The Brand Filter buttons have the same inline-style pattern.

The DaisyUI theme (`colorwheel` in `globals.css`) only defines `primary` and `base` colors. It should be extended with semantic colors (`secondary`, `accent`, `info`, `success`, `warning`, `error`) so buttons can use DaisyUI utility classes (`btn-info`, `btn-success`, etc.) with built-in contrast guarantees instead of inline styles.

## Current Behavior

Color Scheme buttons in `src/app/page.tsx` (lines 301–320):

```tsx
{ label: 'No Scheme', value: 'none', color: '#888' },
{ label: 'Complementary', value: 'complementary', color: '#4fc3f7' },
{ label: 'Split Complementary', value: 'split', color: '#ffee58' },
{ label: 'Analogous', value: 'analogous', color: '#81c784' },
```

Active state: `{ backgroundColor: color, borderColor: color, color: '#fff' }` — white text on these backgrounds fails WCAG contrast for yellow and is borderline for the others.

Inactive state: `{ borderColor: color, color: color }` — colored text on dark base-200 background works but isn't using DaisyUI patterns.

Brand Filter buttons (lines 269–291) use the same pattern with brand colors from `brands.json`.

## Expected Behavior

- All sidebar buttons use DaisyUI utility classes for styling, not inline `style` attributes
- Active buttons have clear, high-contrast text that meets WCAG AA standards
- Inactive buttons use outline/ghost variants with readable colored text
- The DaisyUI theme defines semantic colors used by the app

## Acceptance Criteria

- [ ] DaisyUI theme in `globals.css` extended with semantic colors (`secondary`, `accent`, `info`, `success`, `warning`, `error` and their `-content` counterparts)
- [ ] Color Scheme buttons use DaisyUI classes instead of inline styles
- [ ] Brand Filter buttons use DaisyUI classes instead of inline styles (brand colors via CSS custom properties or minimal inline overrides)
- [ ] All active button states have clear text contrast (no white-on-yellow)
- [ ] Brand Ring toggle uses consistent DaisyUI button styling

## Implementation Plan

### Step 1 — Extend the DaisyUI theme

**File:** `src/app/globals.css`

Add semantic color tokens to the `colorwheel` theme. Choose colors that work on the dark base and provide good contrast for their `-content` counterparts:

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

Key: yellow/green/blue backgrounds get **black** content text for contrast.

### Step 2 — Refactor Color Scheme buttons

**File:** `src/app/page.tsx`

Replace the inline-style color scheme buttons with DaisyUI class-based buttons. Map each scheme to a DaisyUI color:

| Scheme | DaisyUI color | Active class | Inactive class |
|--------|--------------|--------------|----------------|
| No Scheme | neutral (base-300) | `btn-active` | `btn-ghost` |
| Complementary | `info` | `btn-info` | `btn-outline btn-info` |
| Split Complementary | `warning` | `btn-warning` | `btn-outline btn-warning` |
| Analogous | `success` | `btn-success` | `btn-outline btn-success` |

Update the button array to use class names instead of hex colors:

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

Brand colors are per-brand and don't map to fixed DaisyUI semantic colors. Use DaisyUI's `btn-outline` as the base and apply brand colors via minimal CSS custom properties or Tailwind arbitrary values:

- **Inactive:** `btn-ghost` with inline `style={{ color: brand.color }}` for the text/icon color
- **Active:** `btn` with inline `style={{ backgroundColor: brand.color, borderColor: brand.color, color: '#fff' }}` — keep this since brand colors are dynamic

Alternatively, the "All Brands" button can use `btn-active` / `btn-ghost` without any inline styles.

The key improvement is that active brand buttons already have decent contrast (brand colors are chosen to be mid-tone), so the inline style approach is acceptable here. The main fix is consistency.

### Step 4 — Standardize Brand Ring toggle

**File:** `src/app/page.tsx`

The Brand Ring toggle button (line 249) uses `btn-active` class toggling which already follows DaisyUI patterns. Verify it's consistent with the updated scheme buttons. If needed, change to `btn-primary` when active.

### Files Changed

| File | Changes |
|------|---------|
| `src/app/globals.css` | Add semantic color tokens to DaisyUI theme |
| `src/app/page.tsx` | Replace inline styles with DaisyUI classes for scheme and brand buttons |

## Risks & Considerations

- **Brand colors are dynamic:** Brand filter buttons get their color from `brands.json`. These can't be fully mapped to DaisyUI semantic colors. Keeping minimal inline styles for brand-specific colors is acceptable.
- **Wedge overlay colors:** The scheme wedge colors in `colorUtils.ts` (`getSchemeWedges`) use `#fff` and `#ff4` for the SVG overlays. These are separate from button styling and don't need to change.
- **DaisyUI v5 theming:** DaisyUI 5 uses CSS-based `@plugin` syntax. The semantic color format is `--color-{name}` (verified from the existing theme).
