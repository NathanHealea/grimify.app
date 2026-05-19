# Button Component Props Refactor

**Epic:** Other
**Type:** Refactor
**Status:** Todo
**Branch:** `refactor/button-component-props`
**Merge into:** `main`

## Summary

Refactor the `Button` UI component to accept explicit `color`, `variant`, `size`, and `shape` props that map to the established daisyUI-style CSS classes in `button.css`. The `className` prop remains available as an escape hatch for one-off overrides or additional Tailwind classes. This makes the component's surface area self-documenting and type-safe, and avoids callers needing to know the raw class names.

## Acceptance Criteria

- [ ] `Button` accepts a `color` prop (`'primary' | 'secondary' | 'accent' | 'destructive'`) that maps to the corresponding `btn-{color}` class; defaults to `'primary'`
- [ ] `Button` accepts a `variant` prop (`'outline' | 'soft' | 'ghost' | 'link'`) that maps to the corresponding `btn-{variant}` class; optional with no default
- [ ] `Button` accepts a `size` prop (`'xs' | 'sm' | 'md' | 'lg'`) that maps to the corresponding `btn-{size}` class; optional with no default (falls back to the base `.btn` default size)
- [ ] `Button` accepts a `shape` prop (`'square' | 'circle' | 'wide' | 'block'`) that maps to the corresponding `btn-{shape}` class; optional with no default
- [ ] `className` continues to work as an override — classes are merged via `cn()` and applied after the generated prop classes so callers can still override anything
- [ ] All existing call sites that currently pass raw class names (e.g. `btn-ghost btn-sm`) continue to work unchanged through `className`
- [ ] The component and its exported types are fully JSDoc-documented per project conventions
- [ ] No CSS changes required — all classes already exist in `src/styles/button.css`

## Implementation Plan

### Overview

The `Button` component at [src/components/ui/button.tsx](../../src/components/ui/button.tsx) currently hard-codes `btn btn-primary` and spreads `className` at the end. The refactor adds four optional props that each map to a CSS modifier class, building up the `className` string dynamically before merging any caller-supplied overrides.

The CSS layer (`src/styles/button.css`) already defines all required classes — no CSS changes are needed.

---

### Step 1 — Define prop type unions

Add four union type aliases at the top of `button.tsx`:

```ts
type ButtonColor   = 'primary' | 'secondary' | 'accent' | 'destructive'
type ButtonVariant = 'outline' | 'soft' | 'ghost' | 'link'
type ButtonSize    = 'xs' | 'sm' | 'md' | 'lg'
type ButtonShape   = 'square' | 'circle' | 'wide' | 'block'
```

These are file-local — **do not export them** unless a consumer needs them for a typed prop. If a consumer does need the types (e.g. a wrapper component), export a single `ButtonProps` interface instead.

---

### Step 2 — Define `ButtonProps` and update the component signature

Replace the inline `React.ComponentProps<'button'>` spread with a named interface so JSDoc can annotate each prop:

```ts
interface ButtonProps extends React.ComponentProps<'button'> {
  color?:   ButtonColor
  variant?: ButtonVariant
  size?:    ButtonSize
  shape?:   ButtonShape
}
```

---

### Step 3 — Build the class string dynamically

Destructure the new props in the component body, apply defaults, and assemble the class string:

```tsx
function Button({
  color = 'primary',
  variant,
  size,
  shape,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      data-slot="button"
      className={cn(
        'btn',
        color   && `btn-${color}`,
        variant && `btn-${variant}`,
        size    && `btn-${size}`,
        shape   && `btn-${shape}`,
        className,
      )}
      {...props}
    />
  )
}
```

`color` defaults to `'primary'` so existing call sites that rely on `<Button>` rendering as primary continue to work. The `className` prop is always last so caller overrides win.

---

### Step 4 — Add JSDoc

Document the component and each prop per project JSDoc conventions:

```ts
/**
 * Styled button built on the project's daisyUI-inspired `.btn` CSS utility classes.
 *
 * Accepts explicit `color`, `variant`, `size`, and `shape` props that map to the
 * corresponding `.btn-*` CSS modifier classes defined in `src/styles/button.css`.
 * Any additional Tailwind classes can be passed via `className` as an override.
 *
 * @param color   - Color variant. Defaults to `'primary'`.
 * @param variant - Style variant (outline, soft, ghost, link). Optional.
 * @param size    - Size modifier. Optional; falls back to base `.btn` height (h-8).
 * @param shape   - Shape modifier (square, circle, wide, block). Optional.
 * @param className - Additional classes merged after the generated prop classes.
 */
```

---

### Affected Files

| File | Changes |
|------|---------|
| [src/components/ui/button.tsx](../../src/components/ui/button.tsx) | Add `ButtonProps` interface with `color`, `variant`, `size`, `shape` props; update component to build class string dynamically; add JSDoc |

### Risks & Considerations

- **Existing call sites are unaffected** — all current usages pass raw class names via `className` (e.g. in `navbar.tsx`, `navbar-mobile-menu.tsx`). These continue to work because `className` is still merged last.
- **`color` default is `'primary'`** — preserves the current hard-coded default so bare `<Button>` renders identically before and after the refactor.
- **No CSS changes** — all required `.btn-*` classes already exist in `button.css`; the refactor is purely in the component layer.
- **Type imports** — follow CLAUDE.md: use named imports from `'react'`, not `import * as React` or `React.ComponentProps`. Update the import to `import type { ComponentProps } from 'react'` and reference `ComponentProps<'button'>` directly.
