# Grimify

Interactive color research and collection management app for miniature painters. Combines a visual paint library, cross-brand comparison tools, color theory exploration, and a social community for sharing recipes, palettes, and collections.

## Docs

Planning and feature documentation lives in `docs/`.

## Conventions

- Use conventional commit format: `type(scope): description`
- Feature docs follow the `/plan` → `/implement` → `/stage` → `/release` workflow
- For branches forked off `v1/main`, `/stage` should create the PR targeting `v1/main` (not `main`)

## Project Structure

Feature code uses a modular structure under `src/modules/<module>/`. Route pages in `src/app/` should be thin — they import logic from modules.

```
src/modules/<module>/
├── actions/           # Server actions — one file per action (e.g., setup-profile.ts)
├── components/        # React components owned by this module
├── types/             # TypeScript types — one file per type (e.g., profile-form-state.ts)
└── validation.ts      # Validation logic (or validation/ directory if multiple)
```

- **actions/**: Each server action gets its own file named after the action (e.g., `actions/setup-profile.ts` exports `setupProfile`)
- **types/**: Each type gets its own file named after the type (e.g., `types/profile-form-state.ts` exports `ProfileFormState`)
- **components/**: Module-specific React components (e.g., `components/profile-form.tsx`)
- **Route pages** (`src/app/**/page.tsx`) only handle layout and data fetching — they import components and actions from the module
- Do not create barrel/index re-export files — import directly from the specific file

## React & TypeScript Best Practices

- **No `React.` namespace** — import types directly: `import type { ReactNode } from 'react'`, not `React.ReactNode`
- **No `import * as React`** — use named imports: `import { useState, useEffect } from 'react'`
- **No deprecated React types** — use `SubmitEvent` (not `FormEvent`), `ChangeEvent` (not generic `SyntheticEvent`), `ReactElement` (not `ReactChild`)
- **`useActionState`** — import from `'react'` (React 19), not `'react-dom'`
- **Use `type` imports** for types: `import type { ReactNode } from 'react'`
- **Form components** should only contain the `<form>` element — card layouts, headers, and footers belong in the route page

## JSDoc Documentation

All exported types, functions, components, and constants must have JSDoc comments. Follow these conventions:

### What to document

| Export kind     | Required JSDoc content                                                       |
| --------------- | ---------------------------------------------------------------------------- |
| **Type/Interface** | Summary describing the shape and each notable field. Note the `null` state for union types. |
| **Server action**  | Summary of what it does, side effects (redirects, revalidation), and error handling. |
| **Component**      | Summary, purpose, and `@param` for each prop.                                |
| **Utility function** | Summary, `@param` for each parameter, `@returns` describing the return value. |
| **Constant**       | One-line `/** ... */` describing its purpose.                                |

### Conventions

- Use `{@link TypeName}` to cross-reference related types and functions.
- Use `@param` tags for function/component parameters.
- Use `@returns` for non-obvious return values.
- Use `@remarks` for supplementary details (e.g. validation rules, edge cases).
- Keep the first line as a concise summary — details go in the body.
- Do not document trivial route pages that are only layout wrappers with no logic.
- Do not add JSDoc to internal/private helper functions unless the logic is non-obvious.

## Styling

Use a daisyUI-inspired styling approach on top of shadcn/ui and Tailwind CSS 4:

- **UI primitives** live in `src/components/ui/` — thin wrappers that apply daisyUI-style CSS classes (e.g., `className="btn btn-primary"`)
- **daisyUI-style utility classes** are defined in `src/styles/*.css` files — these provide shorthand class names (e.g., `.btn`, `.btn-primary`, `.card`, `.input`) for quick markup styling
- **CSS imports** use `@import '...' layer(components)` in `globals.css` so Tailwind v4 processes `@apply` correctly
- **Naming pattern**: `.component-variant` (e.g., `.btn-primary`, `.badge-secondary`), size modifiers (`-xs`, `-sm`, `-md`, `-lg`, `-xl`), style modifiers (`-outline`, `-soft`, `-ghost`, `-dash`)
- **Theme tokens** use CSS custom properties in OKLch color format, defined in a `variables.css` file with light/dark mode support
- **Class merging** uses the `cn()` utility (`clsx` + `tailwind-merge`)
- Reference `/Users/nhealea/Development/duckling/duckling-nextjs-frontend/styles/` for daisyUI-style CSS class definitions when implementing component styles

### CSS file documentation

Each `src/styles/*.css` file must include a documentation header with:

1. **Component name** and description
2. **daisyUI reference link** (e.g., `https://daisyui.com/components/button/`)
3. **Class inventory** listing all classes with descriptions (base, sizes, colors, styles, shapes, states)
4. **Section dividers** between groups using `/* --- */` comment blocks
5. **Multi-line `@apply`** rules broken by concern (layout, text, placeholder, focus, disabled, aria states)

Example header format:
```css
/*
 * Component Name
 *
 * Based on the daisyUI Component API.
 * https://daisyui.com/components/component/
 *
 * Implements daisyUI's class naming conventions using this project's
 * Tailwind CSS theme tokens instead of daisyUI's built-in theme system.
 *
 * Classes:
 *   Base:    .component        — Description
 *   Sizes:   .component-sm    — Description
 */
```

## Testing

- **Framework**: none
- **Test location**: no test files found
- **Naming**: `*.test.ts` / `*.test.tsx` (default convention)
- **Mocking**: none
- **Run command**: `npm test`

### What to test

- Happy path and error states for all new components

### What NOT to test

- No specific exclusions — follow existing test patterns

## Workflow

- **Docs directory**: `docs/`
- **Remote type**: `github`
- **PR template**: `github-default`
