# Design System

Answers: what should it look and feel like?

> Anything marked **TBD** is undecided. Ask; don't guess.

**Decision:** The marketing site matches the app. The app's design system (`../my.grimify.app/docs/DESIGN_SYSTEM.md`) and tokens (`../my.grimify.app/src/styles/tokens.css`) are the source of truth. This repo copies the tokens it uses into `src/styles/tokens.css`, keeping the same names and values. When this document and the app's disagree, the app wins; update this repo to match.

## 1. Design Direction

- **Style:** Clean and neutral, as in the app.
- **Mood:** Calm, precise, uncluttered. The paint colors are the decoration; the interface stays quiet.
- **Principles:**
  - **Paint is the hero.** UI chrome stays neutral grays. Any color on the page comes from paint swatches or app imagery.
  - **Fast over fancy.** Static HTML and CSS, system fonts, no web-font download, and no animation that isn't needed.
  - **The jump to the app should feel like the same product.** Same tokens, type and buttons.
- **Existing system or brand that applies:** The Grimify app's design system (above). No University of Oregon branding; this is a personal project.

## 2. Brand

- **Name:** Grimify.
- **Logo rules:** **TBD.** The artwork doesn't exist yet (app GitHub issue #3). Until it does, use the word "Grimify" in text. Favicon: **TBD**, same artwork.
- **Voice:** The tone rules in PRD §10: first person, specific (named paints and brands), no hype words, no roadmap promises, and no pushing sign-ups. Short labels, no exclamation marks, matching the app's voice.

## 2a. Open Graph Image

The image shown when a link to the site is shared (PRD Feature 4).

- **Artwork:** **TBD.** It depends on the logo (app issue #3). Until it exists, pages ship without `og:image`, and that test is skipped with a clear message. Never use a placeholder that looks finished.
- **Size and format:** **TBD.** 1200×630 PNG is the size commonly recommended for large link previews; I haven't checked it against each platform's docs.
- **Content:** The word "Grimify" plus a one-line description, on the Background token color, meeting the same 4.5:1 contrast as the page. Paint swatches only from the app's catalog, never invented hex values.
- **Alt text:** Set `og:image:alt` to describe the image. Platforms that support it show it to screen-reader users.
- **Location:** `public/og/default.png`, served from the site's own origin. A per-page override goes next to it.

## 3. Color Palette

Every text/background pair must meet WCAG contrast: 4.5:1 for body text, and 3:1 for large text, UI components and focus indicators.

The values are copied from the app's `tokens.css`. Dark mode follows the system preference (`prefers-color-scheme`), as in the app.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--color-primary` | `#171717` | `#FAFAFA` | Primary button, emphasis |
| `--color-primary-foreground` | `#FAFAFA` | `#171717` | Text on Primary |
| `--color-secondary` | `#F5F5F5` | `#262626` | Secondary surfaces and buttons |
| `--color-background` | `#FFFFFF` | `#0A0A0A` | Page background |
| `--color-surface` | `#FFFFFF` | `#171717` | Cards |
| `--color-text` | `#0A0A0A` | `#FAFAFA` | Body text |
| `--color-muted-text` | `#737373` | `#A3A3A3` | Secondary text |
| `--color-border` | `#E5E5E5` | `#262626` | Decorative dividers only (1.26:1) |
| `--color-ring` | `#737373` | `#A3A3A3` | Focus ring (4.74:1 on white) |

The app's status colors (success, warning, error) aren't needed: the site has no forms or status messages. Add them from the app's `tokens.css` if that changes.

Rules carried from the app:

- No brand accent hue. Interactive emphasis uses Primary.
- Use only tokens (`var(--color-text)`) in CSS, never a raw hex value outside `tokens.css`.
- Don't put muted text on Secondary surfaces: it's 4.35:1, under 4.5:1 (an open item in the app's design system).
- The `theme-color` meta tag matches Background.

## 4. Typography

- **Heading font:** The system font stack, same as body.
- **Body font:** `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` (`--font-sans`).

| Style | Size | Weight | Line height |
|---|---|---|---|
| Display | 34px | 800 | 40px, `-0.02em` tracking |
| H1 | 24px | 700 | 32px |
| H2 | 20px | 600 | 28px |
| H3 | 16px | 600 | 24px |
| Body | 16px | 400 | 24px |
| Small | 13px | 400 | 18px |

These are the app's sizes. **TBD:** whether the landing-page hero needs a larger size than Display. If so, add one token here and nowhere else.

## 5. Spacing

- **Base unit:** 4px.
- **Scale:** 4, 8, 12, 16, 24, 32, 48, 64, 96px (`--space-1` through `--space-24`, as in the app).
- **Page horizontal padding on mobile:** 16px.

## 6. Border Radius

- **Small / medium / large / pill:** 6px / 8px / 12px / 9999px (`--radius-sm|md|lg|pill`).

## 7. Shadows

- **Small / medium / large:** As in the app (`--shadow-sm|md|lg`). In dark mode, use borders instead of shadows.

## 8. Components

- **Component library or CSS framework:** None. Astro components styled with plain CSS files (see CODE_STYLE.md). shadcn/ui and React aren't used here.
- **Buttons:** Calls to action are links (`<a>`) styled as buttons, because they navigate.
  - Primary: the "Open Grimify" link, styled like the app's `default` button (Primary background, Primary foreground text, `--radius-md`).
  - Secondary: Secondary background.
  - Danger, disabled and loading: not needed; there are no actions to confirm or wait for.
  - Minimum target size: 44×44px.
- **Inputs:** None. The site has no forms (PRD §7).
- **Cards:** Feature sections may use cards: Surface background, `--color-border` border, `--radius-lg`, `--shadow-sm` (borders only in dark mode). **TBD:** whether features are cards or plain sections.
- **Navigation:** UX_FLOWS.md.
  - The header on every page has Grimify (home), FAQ, and Open Grimify.
  - The footer repeats the same three links.
  - A "Skip to main content" link comes first in the tab order.
  - The current page's link has `aria-current="page"`.
  - **TBD:** the header layout on narrow screens. Three short links fit at 320px without a menu toggle, which avoids needing JavaScript.

## 9. States

- **Loading / empty / error / success / disabled:** Not applicable. Pages are static, with no state changes after load. The 404 page is the only error state (UX_FLOWS Flow 3).
- **Interactive states:**
  - Links and buttons have hover and visible `:focus-visible` styles.
  - The focus ring is 2px `--color-ring` with a 2px offset, as in the app.

## 10. Icons

- **Library:** **TBD.** The app uses lucide (`lucide-react`). Here, the options are to inline lucide SVGs or use no icons. Either way, adding a package needs approval.
- **Default size:** 20px (`--icon-size`), if icons are used.
- **Style:** Outline, stroke 2, as in the app.
- Decorative icons get `aria-hidden="true"`. Meaningful icons have a text alternative.

## 11. Responsive Design

| Breakpoint | Range | Rules |
|---|---|---|
| Mobile | < 640px | Single column; header links in one row |
| Tablet | 640–1023px | **TBD:** feature sections in two columns or one |
| Desktop | ≥ 1024px | Content max width 1024px, centered |

Use literal breakpoint values in `@media` queries; custom properties don't work there.

Content reflows without horizontal scrolling at 320 CSS pixels wide and stays usable at 200% zoom.

## 12. Accessibility

Requirement: **WCAG 2.1 Level AA.**

- Use semantic HTML before ARIA: `<header>`, `<nav>`, `<main>`, `<footer>`, and one `<h1>` per page.
- Meet the contrast ratios in section 3, in both light and dark mode.
- Every interactive element is reachable and operable by keyboard, in a logical order.
- Focus is always visible.
- Every link has an accessible name that makes sense out of context. For example, "Open Grimify", not "Click here".
- Never convey information by color alone.
- Images have text alternatives; decorative images have empty `alt=""`. Screenshots of the app need alt text that describes what the screenshot shows.
- Motion can be paused and respects `prefers-reduced-motion`.
- `<html lang="en">` on every page.

## 13. Open Questions

- **TBD:** Logo and favicon artwork (app issue #3).
- **TBD:** Open Graph image artwork, size and format (§2a).
- **TBD:** Icon approach: inline lucide SVGs, or none (§10).
- **TBD:** Hero type size (§4).
- **TBD:** Feature sections as cards or plain sections, and the tablet layout (§8, §11).
- **TBD:** How token drift is caught when the app's `tokens.css` changes. It's a manual copy for now.
- Assumption: the site shows no paint swatches with brand-specific hex values. If it does, they come from the app's catalog, never invented.
