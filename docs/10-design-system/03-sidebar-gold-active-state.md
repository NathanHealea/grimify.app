# Sidebar Gold Active State

**Epic:** Design System
**Type:** Feature
**Status:** Todo
**Branch:** `feature/sidebar-gold-active-state`
**Merge into:** `main`

## Overview

DESIGN.md §4 specifies: "Gold accent on active items" for the admin sidebar. The current `.sidebar-item-active` class uses a plain muted background with foreground text — no gold accent.

**Current (sidebar.css):**
```css
.sidebar-item-active {
  @apply bg-muted font-medium text-foreground;
}
```

**DESIGN.md intent:** Active sidebar items should use the primary (gold) color to signal the current section, consistent with how gold is used as the primary action/focus color throughout the app.

This also applies to how the sidebar background token is used: DESIGN.md calls out `bg-sidebar` (which maps to `--sidebar` token), but `sidebar.css` uses `bg-background` — these tokens have the same value in light mode but diverge slightly in dark mode (sidebar is slightly lighter). Using `bg-sidebar` keeps the sidebar semantically correct.

## Acceptance Criteria

- [ ] `.sidebar-item-active` uses `text-primary` (gold) as the text color
- [ ] `.sidebar-item-active` uses a light primary-tinted background (`bg-primary/10`) instead of plain `bg-muted`
- [ ] Active item has slightly stronger font weight (`font-medium` — already there)
- [ ] `.sidebar` base uses `bg-sidebar` instead of `bg-background`
- [ ] `.sidebar-mobile` base uses `bg-sidebar` instead of `bg-background`
- [ ] Visual result: active sidebar item shows gold text on a subtle gold-tinted background — consistent with `.badge-primary` and `.btn-soft` patterns used elsewhere
- [ ] Works in light and dark mode
- [ ] `npm run build` and `npm run lint` pass with no errors

## Implementation Notes

**Target file:** `src/styles/sidebar.css`

Proposed change:
```css
.sidebar-item-active {
  @apply bg-primary/10 font-medium text-primary;
}
```

And:
```css
.sidebar {
  @apply hidden w-60 flex-col border-r border-sidebar-border bg-sidebar lg:flex;
}

.sidebar-mobile {
  @apply fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-sidebar-border bg-sidebar lg:hidden;
}
```

Verify the active state in the admin sidebar at `/admin` — the component applying these classes is likely in `src/modules/admin/components/` or `src/app/admin/layout.tsx`.
