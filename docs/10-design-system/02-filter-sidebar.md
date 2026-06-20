# Filter Sidebar Component

**Epic:** Design System
**Type:** Feature
**Status:** Todo
**Branch:** `feature/filter-sidebar`
**Merge into:** `main`

## Overview

DESIGN.md specifies a filter sidebar pattern for the paint explorer and similar browse pages. No CSS classes or React component for this pattern currently exist. The sidebar CSS (`sidebar.css`) covers admin navigation, not the paint-filter use case.

The filter sidebar is distinct from the admin sidebar:
- Admin sidebar: persistent vertical nav (`.sidebar`, `.sidebar-item`, `.sidebar-item-active`)
- Filter sidebar: collapsible filter panel with checkbox lists, badge toggles, and a clear action

DESIGN.md specification:
> "Left-docked on desktop (`w-56 shrink-0`), bottom sheet on mobile. Sections: Brand (checkbox list), Paint Type (checkbox), Tags (badge-style toggles using `.badge .badge-outline` active state). Clear button `.btn .btn-ghost .btn-sm`. Use `text-sm` throughout, `text-xs text-muted-foreground` for section labels."

## Acceptance Criteria

- [ ] `src/styles/filter-sidebar.css` defines the following CSS classes:
  - `.filter-sidebar` — `w-56 shrink-0 flex flex-col gap-4` (desktop docked layout)
  - `.filter-section` — section wrapper with vertical flex
  - `.filter-section-label` — `text-xs font-semibold text-muted-foreground uppercase` section heading
  - `.filter-section-body` — `flex flex-col gap-1` list of filter items
  - `.filter-item` — checkbox row: `flex items-center gap-2 text-sm cursor-pointer rounded-md px-2 py-1 hover:bg-muted`
  - `.filter-item-active` — active/checked state highlight
  - `.filter-tag-group` — `flex flex-wrap gap-1.5` for badge-style toggles
- [ ] CSS file is imported in `globals.css` under `layer(components)`
- [ ] A `FilterSidebar` React component is created at `src/modules/paints/components/filter-sidebar.tsx` (or a suitable location in the paints module)
- [ ] On desktop (≥ `lg`): renders as a docked left panel
- [ ] On mobile (< `lg`): hidden behind a "Filters" button that opens a bottom Sheet
- [ ] Sections: Brand (checkboxes), Paint Type (checkboxes), active state uses `.badge .badge-outline` style for tag toggles
- [ ] Clear-all button uses `.btn .btn-ghost .btn-sm`
- [ ] Works in light and dark mode
- [ ] `npm run build` and `npm run lint` pass with no errors

## Implementation Notes

**Target module:** `src/modules/paints/`
**CSS file:** `src/styles/filter-sidebar.css`

The filter sidebar layout follows the grid pattern from DESIGN.md §5:
```tsx
<div className="flex gap-6">
  <aside className="filter-sidebar hidden lg:flex">
    {/* filter sections */}
  </aside>
  <div className="flex-1 min-w-0">
    {/* paint grid */}
  </div>
</div>
```

Mobile: use the existing `Sheet` component (`src/components/ui/sheet.tsx`) triggered by a `.btn .btn-ghost .btn-sm` "Filters" button. The sheet content mirrors the desktop sidebar sections.

Active badge toggles should use `badge badge-outline` for inactive and `badge badge-primary` for active state (not `badge-outline` as DESIGN.md mentions — `badge-primary` is more visually clear as "selected").
