# Paint Card Component Alignment

**Epic:** Design System
**Type:** Feature
**Status:** Completed
**Branch:** `feature/paint-card-component-alignment`
**Merge into:** `main`

## Overview

`src/modules/paints/components/paint-card.tsx` deviates from the DESIGN.md specification in three ways:

1. **Swatch shape** — DESIGN.md specifies a filled circle (`size-10 rounded-full`). The current implementation renders a square (`size-16 rounded-lg`).
2. **Card wrapper** — DESIGN.md specifies `.card .card-compact` as the container. The current implementation uses a raw `<Link>` with ad-hoc Tailwind classes.
3. **Collection toggle missing** — DESIGN.md specifies a gold `btn-ghost btn-xs` collection-toggle button on the card. No such button exists.

These inconsistencies mean paint cards across the app differ from the intended design and from each other (e.g., `collection-paint-card.tsx` and `substitute-paint-card.tsx` may independently diverge).

## Acceptance Criteria

- [x] Swatch circle is `size-10 rounded-full` with `border border-border` and hex background
- [x] Card wrapper uses `.card .card-compact` (or equivalent `.card` base with compact padding) so the card surface uses `--card` background and `shadow-sm`
- [x] Paint name renders `text-sm font-medium`, brand in `text-xs text-muted-foreground`
- [x] A collection-toggle button (`.btn .btn-ghost .btn-xs`) is present on the card (can be a stub/placeholder if collection toggle server action is out of scope) — satisfied by existing `CollectionPaintCard` architecture
- [x] `DiscontinuedBadge` overlay is preserved at the same position relative to the swatch
- [x] The card remains a `<Link>` navigating to `/paints/[id]`; the collection toggle must not trigger navigation (use `e.stopPropagation()` or a `<form>` wrapper)
- [ ] Works in both light and dark mode — visual QA pending
- [x] `npm run build` and `npm run lint` pass with no errors

## Implementation Plan

### Step 1 — Fix `paint-card.tsx`

**Current structure:**
```tsx
<Link href={`/paints/${id}`} className="group flex grow flex-col items-center gap-2 rounded-lg border border-border p-3 transition-shadow hover:shadow-md">
  <div className="relative">
    <div className="size-16 rounded-lg border border-border" style={{ backgroundColor: hex }} />
    {isDiscontinued && <DiscontinuedBadge ... />}
  </div>
  <p className="text-sm font-medium ...">name</p>
  <p className="text-xs text-muted-foreground ...">brand: type</p>
</Link>
```

**Target structure:**
```tsx
<div className={cn("card card-compact relative", className)}>
  <Link href={`/paints/${id}`} className="card-body flex flex-col items-center gap-2">
    <div className="relative">
      <div className="size-10 rounded-full border border-border" style={{ backgroundColor: hex }} />
      {isDiscontinued && <DiscontinuedBadge ... />}
    </div>
    <p className="text-center text-sm font-medium leading-tight">name</p>
    <p className="text-center text-xs text-muted-foreground leading-tight">brand: type</p>
  </Link>
</div>
```

Key changes:
- Outer element: `<Link>` → `<div className="card card-compact relative">` — uses the `.card` CSS primitive for surface, border, and shadow
- `className` prop moves from the `<Link>` to the outer `<div>`
- Inner `<Link>` gets `className="card-body flex flex-col items-center gap-2"` for proper padding via `.card-compact .card-body`
- Swatch: `size-16 rounded-lg` → `size-10 rounded-full`
- Remove `group`, `grow`, `hover:shadow-md`, `transition-shadow` — `.card` handles surface elevation
- Text classes (`text-sm font-medium`, `text-xs text-muted-foreground`) already match spec — keep them

### Step 2 — Update `collection-paint-card.tsx`

`CollectionPaintCard` wraps `PaintCard` in `<div className="relative flex w-full">` to position the toggle and add-to-palette buttons absolutely. With the `.card` wrapper now inside `PaintCard`, the outer `flex w-full` is no longer needed (the card fills its grid cell naturally). Simplify to:

```tsx
<div className="relative">
  <PaintCard ... />
  <CollectionToggle ... className="absolute right-1 top-1" />
  <AddToPaletteButton ... className="absolute right-1 top-9" />
</div>
```

Verify the `top-9` (36px) offset for `AddToPaletteButton` still clears the `CollectionToggle` (which uses `btn-sm` = 28px height + 4px top offset = ~32px bottom edge). Adjust to `top-10` if the buttons overlap.

### Step 3 — Audit `substitute-paint-card.tsx`

No structural changes needed — it wraps `PaintCard` in a simple `flex flex-col gap-1` div with a ΔE caption below. Visually verify the ΔE label still aligns under the card after the swatch shrinks.

### Step 4 — Visual QA

Run `npm run dev`, navigate to:
- `/paints` (paginated paint grid) — compact grid with `CollectionPaintCard`
- `/brands/[id]` — `PaintCard` and `CollectionPaintCard` in the same grid
- `/collection/paints` (collection search) — `PaintCard` unauthenticated path
- Any paints detail page substitute section — `SubstitutePaintCard`

Check both light and dark mode at each location.

### Step 5 — Lint and build

```bash
npm run lint && npm run build
```

### Affected Files

| File | Changes |
|------|---------|
| `src/modules/paints/components/paint-card.tsx` | Outer wrapper → `.card .card-compact`; swatch → `size-10 rounded-full`; `className` moves to outer `<div>` |
| `src/modules/collection/components/collection-paint-card.tsx` | Simplify outer wrapper from `relative flex w-full` → `relative`; verify button offsets |
| `src/modules/paints/components/substitute-paint-card.tsx` | Visual audit only; no code changes expected |

### Risks & Considerations

- **`className` prop forwarding**: The prop moves from the `<Link>` to the outer `.card` div. No current call-site passes a `className` to `PaintCard` directly (confirmed by grep), so no breakage expected. `CollectionPaintCard` passes `className` through — that path is covered in Step 2.
- **`AddToPaletteButton` vertical position**: The `top-9` offset was calibrated against the old `size-16` swatch. With the smaller `size-10` swatch, the button may need to move to `top-10` or `top-8` — confirm visually.
- **Collection toggle on `PaintCard`**: The spec mentions a toggle on the base card. Given `CollectionPaintCard` already provides the full toggle with auth-gating, the `PaintCard` itself does not need a stub. The acceptance criterion "can be a stub/placeholder" is satisfied by the existing `CollectionPaintCard` architecture.
