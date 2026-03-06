# Brand Ring Button Styling

**Epic:** Brand Features
**Type:** Enhancement
**Status:** Todo

## Summary

The Brand Ring toggle button uses a plain `btn` / `btn-active` class pattern that looks visually inconsistent with the Brand Filter and Color Scheme buttons in the same sidebar. All sidebar toggle/filter buttons should follow a consistent active/inactive styling pattern using DaisyUI semantic classes.

## Current State

**Brand Ring toggle** (`src/app/page.tsx`, line 238):

```tsx
<button
  className={`btn btn-sm w-full ${showBrandRing ? 'btn-active' : ''}`}
  onClick={() => setShowBrandRing(!showBrandRing)}>
  Brand Ring
</button>
```

Uses `btn-active` when on — this applies a generic DaisyUI "pressed" look without a distinct color. It doesn't match the colored active states of Brand Filter and Color Scheme buttons.

**Brand Filter buttons** use inline styles with brand colors (filled background when active, outline when inactive).

**Color Scheme buttons** use inline styles with scheme-specific colors (same pattern).

## Acceptance Criteria

- [ ] Brand Ring toggle uses the same active/inactive styling pattern as the other sidebar buttons
- [ ] Active state has a clear, distinct visual (not just the generic `btn-active`)
- [ ] Inactive state uses an outline/ghost variant consistent with other sidebar buttons

## Implementation Plan

> **Dependency:** This enhancement should be implemented alongside or after `docs/ui-and-layout/scheme-button-readability.md`, which standardizes the Color Scheme and Brand Filter button styling to DaisyUI classes. The Brand Ring toggle should adopt the same pattern established there.

### Step 1 — Apply DaisyUI semantic styling

**File:** `src/app/page.tsx`

Replace the `btn-active` toggle with a DaisyUI semantic color class. Since the Brand Ring is a visualization toggle (not a filter or scheme), use `btn-primary` for the active state and `btn-outline btn-primary` for the inactive state:

```tsx
<button
  className={`btn btn-sm w-full ${showBrandRing ? 'btn-primary' : 'btn-outline btn-primary'}`}
  onClick={() => setShowBrandRing(!showBrandRing)}>
  Brand Ring
</button>
```

Alternatively, if the scheme-button-readability fix establishes a different pattern (e.g., `btn-ghost` for inactive), follow that pattern instead.

### Files Changed

| File | Changes |
|------|---------|
| `src/app/page.tsx` | Update Brand Ring toggle button classes |

## Risks & Considerations

- **Coordination with scheme-button-readability:** This should adopt whatever pattern that fix establishes. If implemented independently, the styling might drift again. Consider bundling this into the scheme-button-readability worktree.
- **Primary color availability:** The DaisyUI theme defines `--color-primary: #6366f1` (indigo). If the scheme-button-readability fix adds more semantic colors, a different color might be more appropriate for the Brand Ring toggle.
