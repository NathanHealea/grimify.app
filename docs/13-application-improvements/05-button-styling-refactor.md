# Button Styling Refactor

**Epic:** Application Improvements
**Type:** Refactor
**Status:** Todo
**Branch:** `refactor/button-styling`
**Merge into:** `main`

## Summary

The current `.btn` CSS implementation in `src/styles/button.css` partially mirrors the daisyUI button API but has structural gaps that cause style modifier classes (`.btn-outline`, `.btn-soft`, `.btn-ghost`) to operate independently of color variant classes (`.btn-primary`, `.btn-destructive`). This leads to cascade conflicts where style modifiers silently override color variant rules, and requires compound selectors as workarounds.

This refactor aligns the button system with daisyUI's composability model so that any color variant combined with any style modifier produces the expected result without special-case rules.

## Problem Analysis

### How daisyUI handles variants

In daisyUI, color and style modifiers are **composable by design**. A `.btn-outline` modifier does not hard-code a background — it reads from a CSS custom property (`--btn-color`) set by whichever color variant is active. This means `.btn-primary.btn-outline` produces a primary-colored outline, `.btn-error.btn-outline` produces a red outline, and so on, automatically.

### How the current implementation handles variants

The current system declares color variants and style modifiers as **independent, flat rules**:

```css
.btn-destructive {
  @apply bg-destructive/10 text-destructive ...;
}

.btn-outline {
  @apply border border-border bg-background text-foreground ...;  /* overrides everything above */
}
```

Because CSS applies rules in source order, any modifier declared after a color variant wins unconditionally. This breaks all multi-class combinations involving both a color and a style:

| Combination                    | Expected                          | Actual                          |
| ------------------------------ | --------------------------------- | ------------------------------- |
| `btn-destructive btn-outline`  | Red border, white bg, red text    | Grey border, white bg, grey text (outline wins) |
| `btn-primary btn-outline`      | Gold border, white bg, gold text  | Grey border, white bg, grey text (outline wins) |
| `btn-destructive btn-soft`     | Muted red bg, red text            | Muted grey bg, grey text (soft wins) |
| `btn-primary btn-ghost`        | Gold text, transparent bg         | Grey text, transparent bg (ghost wins) |

### Current workaround

A compound rule was added as a band-aid fix:

```css
.btn-destructive.btn-outline {
  @apply border border-destructive/30 bg-background text-destructive
    hover:bg-destructive/10 hover:text-destructive;
}
```

This only fixes one combination. Every other color + modifier pairing remains broken. Adding a compound rule for every pairing is not scalable (4 colors × 4 modifiers = 16 rules, plus hover/focus states).

### Missing variants

The current system also has gaps compared to daisyUI's full button API:

- No `.btn-neutral` (default/unfilled action button)
- No `.btn-info`, `.btn-success`, `.btn-warning`, `.btn-error` semantic variants
- `.btn-active` state does not respond to the active color variant
- No `btn-dash` (dashed border outline variant)
- Focus ring uses a generic `outline-ring/50` instead of color-aware focus rings

## Proposed Approach

Refactor `button.css` to use CSS custom properties as a composition layer, following the daisyUI v5 pattern:

### 1. Define per-variant custom properties

Each color variant sets a `--btn-color` custom property (and optionally `--btn-color-content`). Style modifiers read from those properties instead of hard-coding colors.

```css
.btn {
  --btn-color: var(--color-secondary);
  --btn-color-content: var(--color-secondary-foreground);
  --btn-color-hover: color-mix(in oklab, var(--btn-color) 80%, black);
}

.btn-primary   { --btn-color: var(--color-primary);     --btn-color-content: var(--color-primary-foreground); }
.btn-secondary { --btn-color: var(--color-secondary);   --btn-color-content: var(--color-secondary-foreground); }
.btn-accent    { --btn-color: var(--color-accent);      --btn-color-content: var(--color-accent-foreground); }
.btn-destructive { --btn-color: var(--color-destructive); --btn-color-content: var(--color-destructive); }
```

### 2. Rewrite style modifiers to consume `--btn-color`

```css
/* Solid (default) — filled background */
.btn {
  background-color: var(--btn-color);
  color: var(--btn-color-content);
}

/* Outline — border in variant color, transparent background */
.btn-outline {
  background-color: transparent;
  border: 1px solid color-mix(in oklab, var(--btn-color) 50%, transparent);
  color: var(--btn-color);
}
.btn-outline:hover {
  background-color: color-mix(in oklab, var(--btn-color) 10%, transparent);
}

/* Soft — low-opacity background fill */
.btn-soft {
  background-color: color-mix(in oklab, var(--btn-color) 15%, transparent);
  color: var(--btn-color);
}

/* Ghost — no background, muted text, hover fill */
.btn-ghost {
  background-color: transparent;
  color: var(--color-muted-foreground);
}
.btn-ghost:hover {
  background-color: var(--color-muted);
  color: var(--color-foreground);
}
```

### 3. Remove compound workaround rules

Once style modifiers consume `--btn-color`, the `.btn-destructive.btn-outline` compound rule is no longer needed and can be deleted.

### 4. Add missing semantic variants

```css
.btn-success  { --btn-color: oklch(0.55 0.18 142); --btn-color-content: oklch(1 0 0); }
.btn-warning  { --btn-color: oklch(0.75 0.18 85);  --btn-color-content: oklch(0.15 0 0); }
.btn-info     { --btn-color: oklch(0.60 0.15 230);  --btn-color-content: oklch(1 0 0); }
```

## Acceptance Criteria

- [ ] `btn-primary btn-outline` shows a gold/primary-colored outline button
- [ ] `btn-destructive btn-outline` shows a red outline button (no compound workaround needed)
- [ ] `btn-destructive btn-soft` shows a light red background with red text
- [ ] `btn-primary btn-ghost` shows gold text on transparent background
- [ ] `btn-ghost` without a color variant retains its current neutral appearance (no regression)
- [ ] All existing button usages in the codebase render correctly after the change (visual regression check)
- [ ] The `.btn-destructive.btn-outline` compound rule is removed from `button.css`
- [ ] `btn-success`, `btn-warning`, `btn-info` variants are added and documented
- [ ] The CSS file documentation header is updated to reflect all new classes

## Scope

- `src/styles/button.css` — primary change
- `src/app/globals.css` — no change expected
- All component files using `btn-*` classes — audit for any class combinations that behave differently under the new system and update as needed

## References

- [daisyUI Button component](https://daisyui.com/components/button/)
- [daisyUI v5 theming with CSS custom properties](https://daisyui.com/docs/themes/)
- Current workaround: `src/styles/button.css` `.btn-destructive.btn-outline` rule
