# Input Component Props Refactor

**Epic:** Other
**Type:** Refactor
**Status:** Todo
**Branch:** `refactor/input-component-props`
**Merge into:** `main`

## Summary

Refactor the `Input` UI component to accept explicit `color`, `variant`, and `size` props that map to the established daisyUI-style CSS classes in `input.css`. The `className` prop remains available as an escape hatch for one-off overrides or additional Tailwind classes. This makes the component's surface area self-documenting and type-safe, removing the need for callers to know raw class names.

> **Note on shape:** Unlike `Button`, the `Input` component has no shape variants in the daisyUI API or in `src/styles/input.css`. No `shape` prop is introduced.

## Acceptance Criteria

- [ ] `Input` accepts a `color` prop (`'primary' | 'secondary' | 'accent' | 'error'`) that maps to the corresponding `input-{color}` class; optional with no default (base `.input` uses a neutral border)
- [ ] `Input` accepts a `size` prop (`'xs' | 'sm' | 'md' | 'lg'`) that maps to the corresponding `input-{size}` class; optional with no default (falls back to base `.input` default height of `h-9`)
- [ ] `Input` accepts a `variant` prop (`'ghost'`) that maps to `input-ghost`; optional with no default
- [ ] `className` continues to work as an override — classes are merged via `cn()` and applied after the generated prop classes so callers can still override anything
- [ ] All existing call sites that currently pass raw class names via `className` continue to work unchanged
- [ ] The component and its exported types are fully JSDoc-documented per project conventions
- [ ] No CSS changes required — all classes already exist in `src/styles/input.css`

## Implementation Plan

### Overview

The `Input` component at [src/components/ui/input.tsx](../../src/components/ui/input.tsx) currently hard-codes only the `input` base class and spreads `className` at the end. The refactor adds three optional props (`color`, `size`, `variant`) that each map to a CSS modifier class, building up the `className` string dynamically before merging any caller-supplied overrides.

The CSS layer (`src/styles/input.css`) already defines all required classes — no CSS changes are needed.

---

### Step 1 — Define prop type unions

Add three union type aliases at the top of `input.tsx`:

```ts
type InputColor   = 'primary' | 'secondary' | 'accent' | 'error'
type InputSize    = 'xs' | 'sm' | 'md' | 'lg'
type InputVariant = 'ghost'
```

These are file-local — do not export them unless a consumer needs them for a typed prop.

---

### Step 2 — Define `InputProps` and update the component signature

Replace the inline `React.ComponentProps<'input'>` spread with a named interface so JSDoc can annotate each prop. Also fix the existing `import * as React` to use named imports per project conventions:

```ts
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends ComponentProps<'input'> {
  color?:   InputColor
  size?:    InputSize
  variant?: InputVariant
}
```

---

### Step 3 — Build the class string dynamically

Destructure the new props in the component body and assemble the class string:

```tsx
function Input({
  color,
  size,
  variant,
  className,
  type,
  ...props
}: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'input',
        color   && `input-${color}`,
        size    && `input-${size}`,
        variant && `input-${variant}`,
        className,
      )}
      {...props}
    />
  )
}
```

No color defaults — the base `.input` class already applies a neutral `border-input` style, so omitting `color` gives the standard unstyled look. The `className` prop is always last so caller overrides win.

---

### Step 4 — Add JSDoc

Document the component and each prop per project JSDoc conventions:

```ts
/**
 * Styled single-line input built on the project's daisyUI-inspired `.input` CSS utility classes.
 *
 * Accepts explicit `color`, `size`, and `variant` props that map to the
 * corresponding `.input-*` CSS modifier classes defined in `src/styles/input.css`.
 * Any additional Tailwind classes can be passed via `className` as an override.
 *
 * @param color   - Border/ring color variant. Optional; defaults to neutral border.
 * @param size    - Size modifier. Optional; falls back to base `.input` height (h-9).
 * @param variant - Style variant (`'ghost'` removes the border). Optional.
 * @param className - Additional classes merged after the generated prop classes.
 */
```

---

### Affected Files

| File | Changes |
|------|---------|
| [src/components/ui/input.tsx](../../src/components/ui/input.tsx) | Fix `import * as React` → named import; add `InputProps` interface with `color`, `size`, `variant` props; update component to build class string dynamically; add JSDoc |

### Risks & Considerations

- **Existing call sites are unaffected** — all current usages pass extra classes via `className` (e.g. `className="max-w-40 font-mono"`). These continue to work because `className` is still merged last.
- **No color default** — unlike `Button` (which defaults to `primary`), `Input` has no opinionated color default. The base `.input` class already renders with `border-input`, which is the correct neutral state.
- **`import * as React` fix** — the current file uses `import * as React from 'react'` which violates CLAUDE.md conventions. Update to `import type { ComponentProps } from 'react'` as part of this refactor.
- **No CSS changes** — all required `.input-*` classes already exist in `input.css`; the refactor is purely in the component layer.
