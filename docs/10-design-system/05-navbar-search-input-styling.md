# Navbar Search Input Styling

**Epic:** Design System
**Type:** Feature
**Status:** Todo
**Branch:** `feature/navbar-search-input-styling`
**Merge into:** `main`

## Overview

DESIGN.md §4 (Inputs) specifies:
> "The paint search bar in the navbar uses `.input-ghost .input-sm` styling."

The current implementation uses `SearchInput` (a full `InputGroup` with a search icon and clear button), not a plain `.input-ghost.input-sm`. While the InputGroup is functionally richer, it visually differs from the spec — the navbar search area appears as a bordered group control rather than a clean ghost input that blends into the navbar.

The DESIGN.md design intent for the navbar search is a minimal, borderless control so it doesn't compete visually with the navbar chrome. The current InputGroup has a visible border by default.

## Acceptance Criteria

- [ ] The navbar search input uses `.input-ghost` so it appears borderless in the default/idle state
- [ ] On focus, the ghost input shows the standard gold focus ring
- [ ] The search icon (via InputGroup addon) is preserved — it provides clear affordance
- [ ] The clear button is preserved when a value is present
- [ ] The `InputGroup` wrapper for the navbar search uses `.input-group` with `.input-ghost` applied to the inner control (`.input-group-control`) so the group border is suppressed in idle state
- [ ] At mobile breakpoints, the search bar remains hidden; it appears only at `lg` and above (existing behavior)
- [ ] Works in light and dark mode — ghost input should be nearly invisible against the navbar background in idle state
- [ ] `npm run build` and `npm run lint` pass with no errors

## Implementation Notes

**Target component:** `src/modules/paints/components/navbar-search-bar.tsx` and/or `src/components/search.tsx`

Two implementation approaches:

**Option A — Ghost InputGroup (preferred):** Apply `.input-group-ghost` or modify the `InputGroup` to accept a `ghost` prop that suppresses the border and sets the focus-within ring. The `SearchInput` component already uses `InputGroup`; adding a `ghost` variant preserves the icon/clear button behavior.

**Option B — Separate NavbarSearch component:** Create a standalone `NavbarSearchInput` that uses a plain `input` with `.input.input-ghost.input-sm` and renders the search icon separately (e.g., via `position: relative` + absolute icon). This is simpler but duplicates the clear-button logic.

Option A is preferred. Proposed `input-group.css` addition:
```css
/* Ghost modifier — suppresses border in idle state */
.input-group-ghost {
  @apply border-transparent;
}
.input-group-ghost:focus-within {
  @apply border-ring;
}
```

Then in `NavbarSearchBar`:
```tsx
<InputGroup ghost> {/* maps to input-group-ghost */}
  <InputGroupAddon>...</InputGroupAddon>
  <InputGroupInput ... />
</InputGroup>
```
