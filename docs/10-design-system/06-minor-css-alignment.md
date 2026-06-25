# Minor CSS Alignment Fixes

**Epic:** Design System
**Type:** Feature
**Status:** Todo
**Branch:** `feature/minor-css-alignment`
**Merge into:** `main`

## Overview

Small mismatches between DESIGN.md and the current CSS implementation that are too minor to warrant individual feature branches but are worth tracking and fixing together.

## Issues

### 1. Skeleton — `rounded` vs `rounded-md`

**DESIGN.md §4:** "`.skeleton` — `bg-muted animate-pulse rounded-md`"

**Current (`skeleton.css`):**
```css
.skeleton {
  @apply animate-pulse rounded bg-muted;
}
```
Uses `rounded` (4px) instead of `rounded-md` (6px). Consistent with card `rounded-xl` and button `rounded-lg` — slightly rounder is more on-brand.

**Fix:** Change `rounded` → `rounded-md` on `.skeleton`.

---

### 2. Page Title Scale — `text-3xl` vs `text-2xl`

**DESIGN.md §3 Type Scale:** "Page title | `text-2xl font-bold` | 24px | 700"

**Current (`page-header.css`):**
```css
.page-title { @apply text-3xl font-bold; }      /* 30px */
.page-title-md { @apply text-2xl font-bold; }   /* 24px */
```

`.page-title` renders at 30px, not 24px. `.page-title-md` is the spec value. This may be an intentional revision — 30px gives more presence for page headers. **Needs team decision:** accept the deviation and update the DESIGN.md, or revert `.page-title` to `text-2xl`.

---

### 3. `btn-soft` hover — color vs foreground

**DESIGN.md §4:** `.btn-soft` — "Muted fill, muted text → foreground on hover"

**Current (`button.css`):**
```css
.btn-soft:hover {
  background-color: color-mix(in oklab, var(--btn-color) 22%, transparent);
}
```
Hover increases the background opacity but the text remains `var(--btn-color)` — it doesn't transition to `text-foreground`. Minor inconsistency with the spec description.

**Fix (optional):** Add `color: var(--color-foreground)` on hover for `.btn-soft` — only if the design intent is confirmed to prefer foreground text on hover.

---

### 4. `card-bordered` — not in DESIGN.md

`card.css` defines `.card-bordered` (border-2) but DESIGN.md doesn't mention it. This is an addition beyond the spec. No action needed — document it as an intentional extension.

## Acceptance Criteria

- [ ] `.skeleton` base uses `rounded-md` instead of `rounded`
- [ ] `.page-title` deviation is resolved: either DESIGN.md updated to `text-3xl` or `.page-title` reverted to `text-2xl`
- [ ] `.btn-soft` hover behavior decision documented (foreground text on hover or keep color)
- [ ] `npm run build` and `npm run lint` pass with no errors

## Implementation Notes

**Target files:**
- `src/styles/skeleton.css` — `rounded` → `rounded-md`
- `src/styles/page-header.css` — confirm/revert `.page-title`
- `src/styles/button.css` — confirm `.btn-soft` hover intent
- `DESIGN.md` — update if deviations are accepted as intentional
