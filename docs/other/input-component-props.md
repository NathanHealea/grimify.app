# Input & Textarea Component Props Refactor

**Epic:** Other
**Type:** Refactor
**Status:** Completed
**Branch:** `refactor/input-component-props`
**Merge into:** `main`

## Summary

Refactor the `Input` and `Textarea` UI components to accept explicit typed props that map to the established daisyUI-style CSS classes in `input.css`. The `className` prop remains available as an escape hatch for one-off overrides. This makes both components' surface areas self-documenting and type-safe, removing the need for callers to know raw class names.

> **Note on shape:** Neither `Input` nor `Textarea` has shape variants in the daisyUI API or in `src/styles/input.css`. No `shape` prop is introduced for either component.

## Acceptance Criteria

### Input

- [x] `Input` accepts a `color` prop (`'primary' | 'secondary' | 'accent' | 'error'`) that maps to the corresponding `input-{color}` class; optional with no default (base `.input` uses a neutral border)
- [x] `Input` accepts a `size` prop (`'xs' | 'sm' | 'md' | 'lg'`) that maps to the corresponding `input-{size}` class; optional with no default (falls back to base `.input` default height of `h-9`)
- [x] `Input` accepts a `variant` prop (`'ghost'`) that maps to `input-ghost`; optional with no default
- [x] `className` continues to work as an override — classes merged via `cn()` and applied after generated prop classes
- [x] All existing `Input` call sites that pass raw class names via `className` continue to work unchanged
- [x] `Input` is fully JSDoc-documented per project conventions

### Textarea

- [x] `Textarea` accepts a `size` prop (`'xs' | 'sm' | 'md' | 'lg'`) that maps to the corresponding `textarea-{size}` class; optional with no default (falls back to base `.textarea` min-height of `5rem`)
- [x] `className` continues to work as an override — classes merged via `cn()` and applied after generated prop classes
- [x] All existing `Textarea` call sites that pass raw class names via `className` continue to work unchanged
- [x] `Textarea` is fully JSDoc-documented per project conventions

### Shared

- [x] No CSS changes required — all classes already exist in `src/styles/input.css`

## Implementation Plan

### Overview

Both components live in `src/components/ui/` and follow the same pattern: wrap a native element with a base CSS class and merge `className`. The refactor adds typed props to each so callers can declaratively apply CSS modifiers.

The CSS layer (`src/styles/input.css`) already defines all required classes — no CSS changes are needed.

The available modifier classes per component are:

| Component | Prop | Values | CSS class |
|-----------|------|--------|-----------|
| `Input` | `color` | `primary`, `secondary`, `accent`, `error` | `input-{color}` |
| `Input` | `size` | `xs`, `sm`, `md`, `lg` | `input-{size}` |
| `Input` | `variant` | `ghost` | `input-ghost` |
| `Textarea` | `size` | `xs`, `sm`, `md`, `lg` | `textarea-{size}` |

---

### Step 1 — Refactor `Input` ([src/components/ui/input.tsx](../../src/components/ui/input.tsx))

**1a — Fix the import.** The current file uses `import * as React from 'react'`, which violates project conventions. Replace with:

```ts
import type { ComponentProps } from 'react'
```

**1b — Define prop type unions** (file-local, do not export):

```ts
type InputColor   = 'primary' | 'secondary' | 'accent' | 'error'
type InputSize    = 'xs' | 'sm' | 'md' | 'lg'
type InputVariant = 'ghost'
```

**1c — Define `InputProps`:**

```ts
interface InputProps extends ComponentProps<'input'> {
  color?:   InputColor
  variant?: InputVariant
  size?:    InputSize
}
```

**1d — Update the component:**

```tsx
function Input({
  color,
  variant,
  size,
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

No color default — the base `.input` class already applies `border-input` (neutral). `className` is always last so caller overrides win.

**1e — Add JSDoc:**

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

### Step 2 — Refactor `Textarea` ([src/components/ui/textarea.tsx](../../src/components/ui/textarea.tsx))

The existing file already uses `import type { ComponentProps } from 'react'` correctly — no import fix needed.

**2a — Define prop type union** (file-local):

```ts
type TextareaSize = 'xs' | 'sm' | 'md' | 'lg'
```

**2b — Define `TextareaProps`:**

```ts
interface TextareaProps extends ComponentProps<'textarea'> {
  size?: TextareaSize
}
```

**2c — Update the component:**

```tsx
function Textarea({ size, className, ...props }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'textarea',
        size && `textarea-${size}`,
        className,
      )}
      {...props}
    />
  )
}
```

**2d — Add JSDoc:**

```ts
/**
 * Styled multi-line textarea built on the project's daisyUI-inspired `.textarea` CSS utility classes.
 *
 * Accepts an explicit `size` prop that maps to the corresponding `.textarea-*` CSS
 * modifier class defined in `src/styles/input.css`. Any additional Tailwind classes
 * can be passed via `className` as an override.
 *
 * @param size      - Size modifier. Optional; falls back to base `.textarea` min-height (5rem).
 * @param className - Additional classes merged after the generated prop classes.
 */
```

---

### Affected Files

| File | Changes |
|------|---------|
| [src/components/ui/input.tsx](../../src/components/ui/input.tsx) | Fix `import * as React` → named import; add `InputProps` with `color`, `size`, `variant`; update class string; add JSDoc |
| [src/components/ui/textarea.tsx](../../src/components/ui/textarea.tsx) | Add `TextareaProps` with `size`; update class string; add JSDoc |

### Risks & Considerations

- **Existing call sites are unaffected** — both components spread `className` last, so all callers using raw class strings continue to work.
- **No CSS changes** — all required modifier classes exist in `input.css`; the refactor is purely in the component layer.
- **`Textarea` has no color/variant CSS** — `input.css` defines color and ghost classes only for `.input-*`, not `.textarea-*`. Do not add a `color` or `variant` prop to `Textarea` until the CSS defines those classes.
- **`InputGroupTextarea`** in `src/components/ui/input-group.tsx` wraps `Textarea` and passes through props — it will automatically inherit the new `size` prop without any changes needed there.
