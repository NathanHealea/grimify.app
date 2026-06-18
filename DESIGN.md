# DESIGN.md — Grimify

> Grimify is a **precision craft tool** for miniature painters. It helps painters search, compare, track, and collect paint colors across brands. Every design decision flows from one principle: **color is the hero — the UI is its frame**.

---

## 1. Visual Theme & Atmosphere

**Design character**: Artisan tooling. Functional precision with craft warmth.

Grimify sits at the intersection of three reference points:

| Reference | What Grimify borrows |
|-----------|----------------------|
| **Coolors** | Color-as-hero philosophy — neutral chrome, swatches pop |
| **ArmyCrafter** | Hobbyist utility — filter-heavy, dual-theme, community-aware |
| **Warhammer** | Craft prestige — dark surfaces convey depth and seriousness |

**Mood**: A painter's workbench — organized, purposeful, with a warm light overhead.

**Density**: Moderate. Paint cards are small; comparison and detail views expand. No decoration beyond what communicates.

**Light mode**: Near-white canvas (`#fcfcfc`). Cards are pure white. Gold accents signal action. Neutral grays organize hierarchy.

**Dark mode**: Deep charcoal surfaces (`#1a1a1a` / `#252525`). Gold shifts to a slightly brighter amber. The darkness evokes the hobby room — appropriate, not oppressive.

**Always dual-theme.** Both modes are first-class. The UI should feel equally at home in each.

---

## 2. Color Palette & Roles

All values are defined as OKLch tokens in `src/styles/variables.css` and `src/app/globals.css`. Hex approximations are provided for quick reference — use the CSS tokens in code.

### Brand — Grimify Gold

The sole brand hue. Derived from traditional paint pot metallic gold. Evokes quality, craft, and treasure.

| Token | OKLch | Hex approx | Role |
|-------|-------|------------|------|
| `--grimify-gold` | `oklch(0.6 0.14 80)` | `#b7882a` | Primary — light mode CTAs, focus rings |
| `--grimify-gold-light` | `oklch(0.71 0.15 84)` | `#d4a63a` | Primary — dark mode CTAs, focus rings |
| `--grimify-gold-bright` | `oklch(0.82 0.16 88)` | `#f1c84b` | Highlight accents, hover states on gold |
| `--grimify-gold-dark` | `oklch(0.47 0.11 84)` | `#8a6520` | Pressed states, deep emphasis |

### Semantic — Light Mode

| Token | OKLch | Hex approx | Role |
|-------|-------|------------|------|
| `--background` | `oklch(0.99 0 0)` | `#fcfcfc` | Page background |
| `--card` | `oklch(1 0 0)` | `#ffffff` | Card / surface |
| `--foreground` | `oklch(0.15 0 0)` | `#1f1f1f` | Primary text |
| `--muted-foreground` | `oklch(0.55 0 0)` | `#7a7a7a` | Secondary text, labels, captions |
| `--secondary` / `--muted` | `oklch(0.96 0 0)` | `#f2f2f2` | Muted backgrounds, hover surfaces |
| `--border` / `--input` | `oklch(0.91 0 0)` | `#e5e5e5` | Borders, input outlines |
| `--destructive` | `oklch(0.58 0.24 27)` | `#c44b2b` | Errors, delete actions |
| `--primary` | `--grimify-gold` | `#b7882a` | Primary action color |

### Semantic — Dark Mode

| Token | OKLch | Hex approx | Role |
|-------|-------|------------|------|
| `--background` | `oklch(0.15 0 0)` | `#1a1a1a` | Page background |
| `--card` | `oklch(0.19 0 0)` | `#252525` | Card / elevated surface |
| `--foreground` | `oklch(0.96 0 0)` | `#f2f2f2` | Primary text |
| `--muted-foreground` | `oklch(0.65 0 0)` | `#969696` | Secondary text |
| `--secondary` / `--muted` | `oklch(0.22 0 0)` | `#2d2d2d` | Muted surfaces |
| `--border` / `--input` | `oklch(0.25 0 0)` | `#363636` | Borders |
| `--primary` | `--grimify-gold-light` | `#d4a63a` | Primary action (brighter for contrast) |

### Paint Swatch Colors

Paint swatches are user-supplied hex values rendered as filled circles or squares. They are never styled by the design system — their color IS the content. Always render them against a neutral background (`--card` or `--muted`) so the swatch dominates.

---

## 3. Typography

**Font family**: Geist Sans (Google Fonts / `next/font`) — loaded via `--font-sans`. A clean, modern geometric sans-serif. No second typeface.

```
--font-sans: Geist
--font-heading: var(--font-sans)  /* same family, heavier weight */
```

### Type Scale

| Use | Class | Size | Weight | Notes |
|-----|-------|------|--------|-------|
| Page title | `text-2xl font-bold` | 24px | 700 | Page headers |
| Section heading | `text-xl font-semibold` | 20px | 600 | |
| Card title | `.card-title` → `text-lg font-semibold` | 18px | 600 | |
| Body | `text-sm` | 14px | 400 | Default throughout |
| Caption / label | `text-xs text-muted-foreground` | 12px | 400 | Metadata, help text |
| Badge | `text-xs font-medium` | 12px | 500 | |
| Tiny | `text-[0.625rem]` | 10px | — | `.badge-xs` only |

**Letter-spacing**: Default (`tracking-normal`) for body. `tracking-tight` on brand name (`.navbar-brand`) and card titles.

**Line-height**: Default (`leading-normal`) for body. `leading-none` for display text where tight spacing suits.

---

## 4. Component Stylings

### Buttons (`.btn`)

Base: `h-8`, `px-2.5`, `rounded-lg`, `text-sm`, `font-medium`, `inline-flex`, `gap-1.5`

| Class | Appearance | When to use |
|-------|-----------|-------------|
| `.btn-primary` | Gold fill, dark text | Primary action — Add to Collection, Save Palette |
| `.btn-outline` | Border + bg-background | Secondary actions, alongside a primary |
| `.btn-ghost` | No border, muted text → muted bg on hover | Toolbar actions, icon-only buttons |
| `.btn-soft` | Muted fill, muted text → foreground on hover | Subtle secondary — filter tags, list actions |
| `.btn-destructive` | Red-tinted fill, red text | Delete, remove |
| `.btn-link` | Transparent, primary color, underline on hover | Inline text links |

Sizes: `btn-xs` (h-6), `btn-sm` (h-7), `btn-md` (h-8, default), `btn-lg` (h-9)

Shapes: `btn-square` / `btn-circle` for icon-only. `btn-block` for full-width (mobile CTAs, form submits).

Focus state: 3px gold ring (`focus-visible:ring-3 focus-visible:ring-ring/50`). Destructive buttons use red ring.

### Cards (`.card`)

Base: `rounded-xl`, `border border-border`, `bg-card`, `shadow-sm`

| Sub-element | Class | Notes |
|-------------|-------|-------|
| Content area | `.card-body` | `p-6`, `flex flex-col gap-4` |
| Heading | `.card-title` | `text-lg font-semibold tracking-tight` |
| Description | `.card-description` | `text-sm text-muted-foreground` |
| Footer | `.card-footer` | `p-6 pt-0`, horizontal flex for actions |
| Compact | `.card-compact .card-body` | `p-4`, `gap-3` — used for paint cards in dense grids |

**Paint cards** always show the color swatch prominently — a large filled circle or square using the paint's hex value — before the paint name.

### Inputs (`.input`)

Base: `h-9`, `rounded-lg`, `border border-input`, `text-sm`, `bg-transparent`, gold focus ring

| State | Class |
|-------|-------|
| Error | `.input-error` — red border and ring; also triggered by `aria-invalid` |
| Ghost | `.input-ghost` — borderless, for inline/toolbar search |
| Disabled | `disabled:opacity-50 disabled:pointer-events-none` |

The paint search bar in the navbar uses `.input-ghost .input-sm` styling.

### Badges (`.badge`)

Base: `rounded-md`, `px-2 py-0.5`, `text-xs font-medium`, `bg-muted text-muted-foreground`

| Class | Use |
|-------|-----|
| `.badge-primary` | Brand/hue name tags on paint cards |
| `.badge-soft` | Secondary metadata (paint type, product line) |
| `.badge-outline` | Filter chips in active state |
| `.badge-destructive` | Discontinued paint warning |

### Navbar (`.navbar`)

`h-14`, `border-b border-border`, `bg-background`, `px-4`

- Left: `.navbar-brand` (app name, gold on hover) + mobile hamburger
- Center: paint search bar (desktop)
- Right: user menu (avatar + dropdown)

Mobile: search bar collapses into a sheet or bottom bar. Navigation items move into a slide-in sheet.

### Sidebar (`.sidebar`)

Used for admin navigation. `bg-sidebar`, same border and token structure as navbar. Gold accent on active items.

### Skeleton (`.skeleton`)

`bg-muted animate-pulse rounded-md` — used during server-side data loading on all route pages. Every data-dependent element must have a skeleton loading state.

---

## 5. Layout Principles

### Page Shell (`.main`)

All route pages wrap content in `.main` with a max-width modifier:

| Class | Max-width | Use |
|-------|-----------|-----|
| `.main-4xl` | 56rem (896px) | Most content pages |
| `.main-5xl` | 64rem (1024px) | Paint explorer, comparison |
| `.main-6xl` | 72rem (1152px) | Wide browse/list pages |
| `.main-md` | 28rem (448px) | Auth forms, narrow settings |
| `.main-full` | None | Full-bleed marketing sections |

Padding: `.main-padding` (`px-4 py-12`), `.main-padding-compact` (`px-4 py-8`)

### Grid

Paint grids: `grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3` for compact swatch grids. Larger cards: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`.

Filter sidebars: `flex gap-6` where sidebar is `w-56 shrink-0` and content takes `flex-1 min-w-0`.

### Spacing Scale

Follow Tailwind's default 4px base unit. Key values in practice:

| Use | Value |
|-----|-------|
| Component internal gap | `gap-1.5` (6px) to `gap-4` (16px) |
| Section vertical gap | `space-y-6` (24px) to `space-y-8` (32px) |
| Card padding | `p-6` (24px), `p-4` (16px) compact |
| Page top padding | `py-12` (48px) |
| Navbar height | `h-14` (56px) |

### Whitespace Philosophy

Generous vertical rhythm between sections. Dense inside data tables and paint grids (compact card variant). Never zero padding — even the tightest component has breathing room.

---

## 6. Depth & Elevation

| Layer | Token / Class | Light | Dark |
|-------|--------------|-------|------|
| Page background | `--background` | `#fcfcfc` | `#1a1a1a` |
| Card surface | `--card` + `shadow-sm` | `#ffffff` + soft shadow | `#252525` + no shadow needed |
| Elevated surface (popover, dropdown) | `--popover` + `shadow-md` | `#ffffff` | `#252525` |
| Overlay (dialog) | `bg-background/80 backdrop-blur-sm` | White scrim | Dark scrim |
| Active/hover surface | `--muted` | `#f2f2f2` | `#2d2d2d` |

**Shadow usage**: `shadow-sm` on cards. `shadow-md` on popovers and dropdowns. `shadow-lg` on dialogs. No shadow in dark mode on cards — border provides separation.

**No decorative shadows**. Shadows communicate elevation, not style.

---

## 7. Do's and Don'ts

### Do

- **Let the swatch lead.** Paint color circles/squares are always the largest visual element on a paint card.
- **Use gold sparingly.** One primary action per screen. Gold is valuable because it's rare.
- **Support dark mode equally.** Test every new component in both modes before marking done.
- **Use semantic tokens.** Reference `--foreground`, `--primary`, `--muted-foreground` — not raw Tailwind color values.
- **Neutral backgrounds for color content.** Swatches, palettes, and scheme rings must sit on `--card` or `--muted`, never on a tinted background.
- **Skeleton every async component.** All data-fetching UI must have a `<Skeleton>` loading state.
- **Defer to the ghost button** in toolbars and tables. Only one primary CTA per view.

### Don't

- **Don't mix font families.** Geist only — no Mono, no serif, no system fallback with different metrics.
- **Don't use color for decorative backgrounds.** No tinted hero sections, no gradient fills on non-interactive elements. Color belongs to paint data, not chrome.
- **Don't create new shadow levels.** Use the defined four (sm, md, lg, none).
- **Don't nest cards.** No card inside a card.
- **Don't use raw destructive color on text unless it signals an error.** Red is reserved for validation and delete flows.
- **Don't add border-radius above `rounded-xl`.** The design reads as modern-clean, not bubbly.
- **Don't add icons unless they aid recognition.** Prefer text labels for actions; icons-only only for space-constrained toolbars with clear affordances.
- **Don't use dark Warhammer-style backgrounds for functional UI.** Dark mode is charcoal, not pure black (`#0a0a0a`). Reserve maximum darkness for full-bleed marketing hero sections only.

---

## 8. Responsive Behavior

### Breakpoints (Tailwind defaults)

| Name | Width | Strategy |
|------|-------|----------|
| `sm` | 640px | Single-column → two-column grids |
| `md` | 768px | Navbar search visible; sidebar collapses |
| `lg` | 1024px | Three-column grids; filter sidebars docked |
| `xl` | 1280px | Wider explorer layouts |

### Touch Targets

Minimum 44px touch target on interactive elements for mobile. Use `min-h-[44px]` wrapper on small buttons if stacked in lists.

### Navigation

- **Desktop** (≥ `md`): horizontal navbar with docked search bar center, user menu right.
- **Mobile** (< `md`): hamburger trigger opens slide-in sheet. Search bar moves to sheet or collapsible below navbar.

### Paint Grids

- Mobile: 2-column compact swatch grid
- Tablet: 3–4 columns
- Desktop: 4–5 columns for compact, 3 for standard cards

### Filter Sidebar

- **Desktop**: docked left sidebar, `w-56`, persistent
- **Mobile**: hidden behind a "Filters" button → opens a bottom sheet or drawer

### Cards

Card content never truncates paint names — use `truncate` only as a last resort with a tooltip. Swatch size is fixed (`size-8` / `size-10`); text wraps below.

---

## 9. Agent Prompt Guide

### Quick Reference

```
Brand primary:    #b7882a (light) / #d4a63a (dark)
Background:       #fcfcfc (light) / #1a1a1a (dark)
Card surface:     #ffffff (light) / #252525 (dark)
Text primary:     #1f1f1f (light) / #f2f2f2 (dark)
Text muted:       #7a7a7a (light) / #969696 (dark)
Border:           #e5e5e5 (light) / #363636 (dark)
Error/destructive: #c44b2b
Font:             Geist Sans
Border radius:    rounded-lg (buttons, inputs), rounded-xl (cards)
```

### Starter Prompts

**New page:**
> "Build a [page name] page for Grimify. Use `.main .main-5xl .main-padding` as the shell. Header uses `<PageHeader>` with a title and optional action button (`.btn .btn-primary`). Data cards use `.card .card-body`. Match Grimify's dual-theme: near-white light mode with gold primary, deep charcoal dark mode."

**Paint card:**
> "Create a paint card component for Grimify. Show a color swatch (filled circle, size-10, border border-border rounded-full) using the paint's hex value. Below: paint name in `text-sm font-medium`, brand in `text-xs text-muted-foreground`. Use `.card .card-compact` container. Gold `btn-ghost btn-xs` for collection toggle. Works in light and dark mode."

**Marketing landing section:**
> "Design a hero section for Grimify's homepage. Full-width, dark surface (`bg-foreground` / near-black). Centered `.main .main-5xl .main-padding`. Large heading (`text-4xl font-bold text-background`), subtext in muted. Primary CTA `.btn .btn-primary .btn-lg` in gold. Supporting grid of 3 feature cards below on a `bg-background` section. Dual-theme aware."

**Filter sidebar:**
> "Build a paint filter sidebar for Grimify. Left-docked on desktop (`w-56 shrink-0`), bottom sheet on mobile. Sections: Brand (checkbox list), Paint Type (checkbox), Tags (badge-style toggles using `.badge .badge-outline` active state). Clear button `.btn .btn-ghost .btn-sm`. Use `text-sm` throughout, `text-xs text-muted-foreground` for section labels."
