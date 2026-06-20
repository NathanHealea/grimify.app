# Palette Tool — DESIGN.md Visual Refactor

**Epic:** Marketing & Branding
**Type:** Refactor
**Status:** Done
**Branch:** `refactor/palette-tool-design`
**Merge into:** `main`

## Overview

Audit and align every component in the `palettes` module and its two public route pages (`/palettes`, `/palettes/[id]`) against `DESIGN.md`. The refactor is purely visual — no service, action, type, or validation changes.

**Core principle from DESIGN.md:** _color is the hero — the UI is its frame._ Every paint swatch must dominate its container. Tokens must come from the design system (`--foreground`, `--primary`, `--muted-foreground`), not raw Tailwind color values.

---

## Target Module

**`src/modules/palettes/`** — `components/` directory only, plus the two route pages in `src/app/palettes/`.

No new module directories. No barrel/index files.

---

## Audit Findings

Gaps identified by comparing current implementation to `DESIGN.md`:

### `palette-card.tsx`

- Swatch strip uses `size="sm"` (16 px). DESIGN.md: "The swatch is always the largest visual element on a paint card." Should be `size="md"` (28 px).
- Card hover state is absent. DESIGN.md elevation spec: cards get `shadow-md` on hover.

### `palette-swatch-strip.tsx`

- Swatches render as `rounded-sm` squares. DESIGN.md describes paint swatches as "filled circles or squares" — both are valid. The strip sits on `--card`, which is correct (neutral background so color pops). Gap is `gap-0.5` (2 px) producing a mosaic. This is appropriate; no layout change needed.
- The `+N` overflow indicator uses `badge badge-soft` inline with the cells. Minor: ensure the overflow cell height matches the swatch size at all three size variants.

### `palette-detail.tsx`

- The large swatch strip (`size="lg"`, 40 px) is rendered _outside_ the header card as a separate block. The palette's colors are not immediately visible when the header card first renders. Move the swatch strip _inside_ the header card, below the name/meta row.
- The owner "Edit" link uses `btn-ghost`. DESIGN.md: secondary action alongside an implicit primary should use `btn-outline btn-sm`.

### `palette-paint-row.tsx`

- Swatch is `size-8 rounded-sm` (32 px square). DESIGN.md specifies circles (`rounded-full`) for paint card swatches. In a dense row/list context squares are acceptable, but circles are the spec default. **Decision:** update to `rounded-full` to match the paint card pattern and the DESIGN.md agent prompt guide.

### `palette-group-header.tsx` (read-only branch)

- `text-sm font-semibold text-muted-foreground uppercase tracking-wide` — `uppercase` is not part of the DESIGN.md type scale and adds visual noise. Change to `text-xs font-medium text-muted-foreground tracking-wide uppercase` (section-label style consistent with the rest of the design system's sub-labels).

### `palette-empty-state.tsx`

- Renders `.card .card-body items-center justify-center py-12 text-center`. This is correct per DESIGN.md. No change needed.

### `src/app/palettes/loading.tsx`

Two issues:
1. Uses hardcoded `mx-auto w-full max-w-6xl px-4 py-12` instead of the `<Main>` shell component. All pages use `<Main>`; the skeleton should match.
2. Skeleton grid is `lg:grid-cols-4` but the actual page grid (`PaletteCardGrid`) is `lg:grid-cols-3`. Mismatched layout means visible reflow when the page loads.

### `src/app/palettes/[id]/loading.tsx`

Two issues:
1. Uses hardcoded `mx-auto w-full max-w-4xl px-4 py-12` instead of `<Main>`.
2. The skeleton renders a paint _grid_ (`grid-cols-2 sm:grid-cols-3 ... lg:grid-cols-6`) but `PaletteDetail` renders a _list_ (`PalettePaintRow` rows). The skeleton layout doesn't match the real page, causing a jarring reflow.

### `src/app/palettes/page.tsx` and `src/app/palettes/[id]/page.tsx`

Both route pages are thin wrappers that delegate to module components — correct per the domain module approach. Minor cleanup only:
- Pagination `className` in `palettes/page.tsx` uses string concatenation; normalize to `cn()`.
- Both pages are otherwise aligned.

---

## Implementation Plan

Each component gets its own isolated commit. No auto-commits — each change awaits approval before moving to the next.

### Worktree

```
git worktree add .claude/worktrees/palette-tool-design -b refactor/palette-tool-design
```

### Phase 1 — Swatch strip & card (2 commits)

| # | File | Change |
|---|------|--------|
| 1 | `components/palette-swatch-strip.tsx` | Verify overflow badge height matches swatch size at all three variants; fix if mismatched |
| 2 | `components/palette-card.tsx` | Bump `size="sm"` → `size="md"`; add `hover:shadow-md transition-shadow` to the card wrapper |

### Phase 2 — Detail view (1 commit)

| # | File | Change |
|---|------|--------|
| 3 | `components/palette-detail.tsx` | Move `PaletteSwatchStrip` inside the header `.card .card-body` block, below the name/meta row; change Edit link from `btn-ghost` → `btn-outline btn-sm` |

### Phase 3 — Paint row & group header (2 commits)

| # | File | Change |
|---|------|--------|
| 4 | `components/palette-paint-row.tsx` | Swatch: `rounded-sm` → `rounded-full` |
| 5 | `components/palette-group-header.tsx` | Read-only heading: remove `font-semibold text-sm`; apply `text-xs font-medium uppercase tracking-wide text-muted-foreground` |

### Phase 4 — Loading skeletons (2 commits)

| # | File | Change |
|---|------|--------|
| 6 | `src/app/palettes/loading.tsx` | Replace hardcoded max-width wrapper with `<Main>`; fix grid from `lg:grid-cols-4` → `lg:grid-cols-3` to match `PaletteCardGrid` |
| 7 | `src/app/palettes/[id]/loading.tsx` | Replace hardcoded wrapper with `<Main>`; replace the paint grid skeleton with a list-row skeleton (8 rows of `flex gap-3 border-border rounded-lg p-3`) |

### Phase 5 — Route page cleanup (1 commit)

| # | File | Change |
|---|------|--------|
| 8 | `src/app/palettes/page.tsx` | Normalize pagination `className` to `cn()` |

### Phase 6 — Build validation

Run `npm run build` and `npm run lint` in the worktree. Fix any errors. Commit if fixes are needed.

---

## What Does Not Change

- `palette-builder.tsx` — edit mode builder; separate concern
- `palette-form.tsx`, `palette-group-form.tsx`, `palette-group-delete-dialog.tsx` — forms; separate audit
- `palette-sort-confirm-dialog.tsx`, `palette-swap-dialog.tsx` — dialogs; separate audit
- `palette-paint-groups-toggle.tsx`, `palette-swap-button.tsx`, `palette-swap-sliders.tsx` — toolbar actions; no visual gaps identified
- `palette-drag-handle.tsx` — utility; no visual gaps identified
- All services, actions, types, utils, validation — logic is out of scope
- `palette-view-tracker.tsx` — tracking utility; no change

---

## Commit Message Format

```
refactor(palettes): <component-name> — <one-line description>
```

Examples:
```
refactor(palettes): palette-card — bump swatch strip to md, add hover elevation
refactor(palettes): palette-detail — move swatch strip into header card, fix edit button variant
refactor(palettes): palette-paint-row — swatch to rounded-full per DESIGN.md
refactor(palettes): loading — align skeletons to Main shell and actual layout
```
