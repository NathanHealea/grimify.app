# Color Scheme and Theme

**Epic:** Marketing & Branding
**Type:** Feature
**Status:** Done
**Branch:** `v1/feature/color-scheme-and-theme`

## Summary

Define the Grimify brand color palette and configure the app's light/dark theme using CSS custom properties. The theme must be intentionally subdued — Grimify is a color exploration tool, so the UI chrome should recede and let paint swatches be the most colorful things on screen.

## Context

Grimify was primarily built for a group of friends painting Warhammer and Age of Sigmar miniatures. The theme should have a subtle nod to the grimdark hobby aesthetic without competing with the thousands of paint colors users are browsing, comparing, and exploring. Neutral backgrounds, minimal brand color usage, and strong contrast for text.

## Acceptance Criteria

- [x] Brand primary color is defined with WCAG 2.1 AA contrast compliance
- [x] Light mode theme is configured with brand colors in `globals.css`
- [x] Dark mode theme is configured with brand colors in `globals.css`
- [x] Theme tokens use OKLch color format for perceptual consistency
- [x] Color variables are documented in a `src/styles/variables.css` file
- [x] Backgrounds are neutral (near-zero chroma) so paint swatches display accurately
- [x] All existing components render correctly with the updated theme
- [x] `npm run build` and `npm run lint` pass with no errors

## Design Principle

**The UI is the frame, not the painting.** Brand color only appears on interactive elements (buttons, links, focus rings). Everything else is neutral gray.

## Chosen Theme: Gold

Brand colors derived from `#b7882a`, `#d4a63a`, `#f1c84b`.

### WCAG 2.1 AA Contrast Audit

Gold is a mid-lightness hue — it needs **dark text on gold backgrounds**, and a **darkened variant** for text on light backgrounds.

| Usage                                    | Colors                 | Ratio   | AA (4.5:1) |
| ---------------------------------------- | ---------------------- | ------- | ---------- |
| **Button**: dark text on `#b7882a` bg    | `#171717` on `#b7882a` | 5.61:1  | PASS       |
| **Button**: dark text on `#d4a63a` bg    | `#171717` on `#d4a63a` | 7.95:1  | PASS       |
| **Button**: dark text on `#f1c84b` bg    | `#171717` on `#f1c84b` | 11.19:1 | PASS       |
| **Button**: white text on `#b7882a` bg   | `#fafafa` on `#b7882a` | 3.06:1  | FAIL       |
| **Light link**: `#b7882a` text on white  | `#b7882a` on `#fafafa` | 3.06:1  | FAIL       |
| **Light link**: `#8a6a1e` text on white  | `#8a6a1e` on `#fafafa` | 4.84:1  | PASS       |
| **Dark link**: `#d4a63a` text on dark bg | `#d4a63a` on `#171717` | 7.95:1  | PASS       |
| **Dark link**: `#f1c84b` text on dark bg | `#f1c84b` on `#171717` | 11.19:1 | PASS       |

### Token Mapping

| Token                    | Light Mode                          | Dark Mode                                           |
| ------------------------ | ----------------------------------- | --------------------------------------------------- |
| **Primary**              | `#b7882a` — button bg, focus rings  | `#d4a63a` — button bg, lighter for dark bg contrast |
| **Primary Foreground**   | `#171717` — dark text on gold       | `#171717` — dark text on gold                       |
| **Ring**                 | `#b7882a`                           | `#d4a63a`                                           |
| **Background**           | `#fafafa` — near white, zero chroma | `#171717` — near black, zero chroma                 |
| **Card**                 | `#ffffff` — white                   | `#262626` — dark gray                               |
| **Foreground**           | `#171717` — near black              | `#f5f5f5` — near white                              |
| **Muted**                | `#f5f5f5` — light gray              | `#2e2e2e` — dark gray                               |
| **Muted Foreground**     | `#737373` — mid gray                | `#a3a3a3` — mid gray                                |
| **Border**               | `#e5e5e5`                           | `#333333`                                           |
| **Input**                | `#e5e5e5`                           | `#333333`                                           |
| **Secondary**            | `#f5f5f5` — neutral gray            | `#2e2e2e` — neutral gray                            |
| **Secondary Foreground** | `#171717`                           | `#f5f5f5`                                           |
| **Accent**               | `#f5f5f5` — neutral gray            | `#2e2e2e` — neutral gray                            |
| **Accent Foreground**    | `#171717`                           | `#f5f5f5`                                           |
| **Destructive**          | `#dc2626` — functional red          | `#ef4444` — functional red                          |

All surface tokens (background, card, muted, secondary, accent) are **zero chroma neutrals** — paint swatches always display accurately.

### Brand Color Variables

| Variable                | Value                 | Hex       | Purpose                                 |
| ----------------------- | --------------------- | --------- | --------------------------------------- |
| `--grimify-gold`        | `oklch(0.60 0.14 80)` | `#b7882a` | Base brand gold                         |
| `--grimify-gold-light`  | `oklch(0.71 0.15 84)` | `#d4a63a` | Dark mode primary, hover states         |
| `--grimify-gold-bright` | `oklch(0.82 0.16 88)` | `#f1c84b` | Highlights, badges                      |
| `--grimify-gold-dark`   | `oklch(0.47 0.11 84)` | `#8a6a1e` | Light mode text on white (AA compliant) |

## Key Files

| Action | File                       | Description                                                      |
| ------ | -------------------------- | ---------------------------------------------------------------- |
| Create | `src/styles/variables.css` | Brand gold color definitions                                     |
| Modify | `src/app/globals.css`      | Update `:root` and `.dark` theme variables, import variables.css |

## Implementation

### Step 1: Create `src/styles/variables.css`

```css
/*
 * Grimify Brand Colors
 * Gold palette derived from #b7882a, #d4a63a, #f1c84b.
 * Single brand hue — neutral everything else.
 */

:root {
  --grimify-gold: oklch(0.6 0.14 80);
  --grimify-gold-light: oklch(0.71 0.15 84);
  --grimify-gold-bright: oklch(0.82 0.16 88);
  --grimify-gold-dark: oklch(0.47 0.11 84);
}
```

### Step 2: Update `:root` in `src/app/globals.css`

Add `@import '../styles/variables.css';` after the tailwind imports. Update `:root` light mode:

```css
:root {
  --background: oklch(0.99 0 0);
  --foreground: oklch(0.15 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.15 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.15 0 0);
  --primary: var(--grimify-gold);
  --primary-foreground: oklch(0.15 0 0);
  --secondary: oklch(0.96 0 0);
  --secondary-foreground: oklch(0.15 0 0);
  --muted: oklch(0.96 0 0);
  --muted-foreground: oklch(0.55 0 0);
  --accent: oklch(0.96 0 0);
  --accent-foreground: oklch(0.15 0 0);
  --destructive: oklch(0.58 0.24 27);
  --border: oklch(0.91 0 0);
  --input: oklch(0.91 0 0);
  --ring: var(--grimify-gold);
  --radius: 0.625rem;
}
```

### Step 3: Update `.dark` in `src/app/globals.css`

```css
.dark {
  --background: oklch(0.15 0 0);
  --foreground: oklch(0.96 0 0);
  --card: oklch(0.19 0 0);
  --card-foreground: oklch(0.96 0 0);
  --popover: oklch(0.19 0 0);
  --popover-foreground: oklch(0.96 0 0);
  --primary: var(--grimify-gold-light);
  --primary-foreground: oklch(0.15 0 0);
  --secondary: oklch(0.22 0 0);
  --secondary-foreground: oklch(0.96 0 0);
  --muted: oklch(0.22 0 0);
  --muted-foreground: oklch(0.65 0 0);
  --accent: oklch(0.22 0 0);
  --accent-foreground: oklch(0.96 0 0);
  --destructive: oklch(0.65 0.22 25);
  --border: oklch(0.25 0 0);
  --input: oklch(0.25 0 0);
  --ring: var(--grimify-gold-light);
}
```

### Step 4: Verify

1. `npm run build` and `npm run lint` pass
2. Buttons show gold background with dark text — readable in both modes
3. Focus rings show gold
4. All surfaces are neutral gray — no color cast on paint swatches
5. Destructive elements stay red

## Notes

- **Primary foreground is always dark** (`#171717`) — gold is too light for white text to meet AA. This applies in both light and dark mode.
- Dark mode uses the lighter gold (`#d4a63a`) for better visibility on dark backgrounds.
- For links/text rendered in gold on light backgrounds, use `--grimify-gold-dark` (`#8a6a1e`, 4.84:1 on white) to ensure AA compliance.
- `--secondary` and `--accent` are kept as neutral grays — no second brand color needed.
- Dark mode is likely the primary mode for this audience.
