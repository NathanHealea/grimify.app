# UI Component Consistency Refactor

**Epic:** Marketing & Branding
**Type:** Refactor
**Status:** Todo
**Branch:** `refactor/component-consistency-refactor`
**Merge into:** `main`

## Summary

The codebase has established shared UI primitives — `<Button>`, `<Input>`, `<Textarea>`, `<PageHeader>`/`<PageTitle>`, and `<Main>` — but raw HTML elements (`<button>`, `<input>`, `<textarea>`, `<h1>`) continue to be used in dozens of files across every module. This refactor audits every usage and replaces the raw elements with the appropriate component, ensuring consistent styling, accessibility attributes (`data-slot`), and a single place to update appearance globally.

Fixes a pre-existing bug in the `<Button>` component: the default class is `btn btn-primary`, which forces `btn-primary` onto every variant usage (e.g. `<Button className="btn-ghost">` renders `btn btn-primary btn-ghost`). The fix changes the base to `btn` only, requiring all callers that want the primary variant to pass `className="btn-primary"` explicitly.

## Acceptance Criteria

- [ ] `<Button>` component base class is changed from `btn btn-primary` to `btn`
- [ ] All existing `<Button>` usages that depend on the `btn-primary` default are updated to pass `className="btn-primary"` explicitly
- [ ] All raw `<button className="btn ...">` elements across every module are replaced with `<Button className="...">`
- [ ] All text-type raw `<input>` elements (type `text`, `email`, `password`, `number`, `search`, `url`, or no type) are replaced with `<Input>`; hidden, checkbox, color, and range inputs are untouched
- [ ] Raw `<textarea>` elements in `recipe-note-card.tsx` and `markdown-editor.tsx` are replaced with `<Textarea>`
- [ ] Raw `<h1>` page-title headings across route pages and components are replaced with `<PageHeader>`+`<PageTitle>` (or `<PageTitle>` alone where no subtitle is needed); marketing hero and document-structure headings are excluded
- [ ] `<Main>` wrapper coverage is verified; any route pages missing it are corrected
- [ ] `npm run build` and `npm run lint` pass with no errors

## Implementation Plan

### Step 1 — Fix `<Button>` base class

**File:** `src/components/ui/button.tsx`

Change:
```tsx
className={cn('btn btn-primary', className)}
```
to:
```tsx
className={cn('btn', className)}
```

This is a **breaking change**: every `<Button>` that previously relied on the default `btn-primary` style will lose its color until `className="btn-primary"` is added. Step 2 restores those callers.

### Step 2 — Restore `btn-primary` on existing `<Button>` callers

Search for every `<Button` usage that does **not** already pass a color variant. Add `className="btn-primary"` (or merge with any existing `className`).

Known files that use `<Button>` as a submit / primary action button and will need updating:

| File | Current usage | Fix |
|------|---------------|-----|
| `src/modules/auth/components/sign-in-form.tsx` | `<Button>` (no className) | `<Button className="btn-primary">` |
| `src/modules/auth/components/sign-up-form.tsx` | `<Button>` (no className) | `<Button className="btn-primary">` |
| `src/modules/auth/components/forgot-password-form.tsx` | `<Button>` (no className) | `<Button className="btn-primary">` |
| `src/modules/auth/components/reset-password-form.tsx` | `<Button>` (no className) | `<Button className="btn-primary">` |
| `src/modules/user/components/change-password-form.tsx` | `<Button>` (no className) | `<Button className="btn-primary">` |
| `src/modules/user/components/profile-form.tsx` | `<Button>` (no className) | `<Button className="btn-primary">` |
| `src/modules/admin/components/admin-edit-profile-form.tsx` | `<Button>` (no className) | `<Button className="btn-primary">` |
| `src/modules/paints/components/hero-search.tsx` | `<Button className="btn-lg sm:w-auto">` | `<Button className="btn-primary btn-lg sm:w-auto">` |

Scan for any additional `<Button` usages without a color variant class before finalising.

### Step 3 — Replace raw `<button>` with `<Button>` — admin module

Target: `src/modules/admin/components/`

Replace every `<button className="btn ...">` with `<Button className="...">` (drop the leading `btn` since the component adds it). Keep all other classes intact. Add `import { Button } from '@/components/ui/button'` where missing.

Key files:
- `brand-form.tsx`, `product-line-form.tsx`, `delete-brand-button.tsx`
- `hue-form.tsx`, `hue-paint-list.tsx`, `add-paints-to-hue.tsx`, `delete-hue-button.tsx`
- `paint-form.tsx`, `delete-paint-button.tsx`
- `admin-nav.tsx`, `hue-selector.tsx`
- `admin-edit-profile-form.tsx` (already uses `<Button>` for submit — check for any secondary actions)

### Step 4 — Replace raw `<button>` with `<Button>` — paints module

Target: `src/modules/paints/components/`

Notable cases:
- Search / filter controls, pagination buttons
- `paint-card.tsx`, `paint-hue-badge.tsx`, `paint-swatch.tsx` action buttons
- Any icon-only buttons: add `aria-label` if not already present

### Step 5 — Replace raw `<button>` with `<Button>` — palettes module

Target: `src/modules/palettes/components/`

Notable cases:
- `palette-form.tsx`, `palette-paint-list.tsx`, `palette-paint-row.tsx`
- `palette-swap-dialog.tsx`, `delete-palette-button.tsx`
- `new-palette-inline-form.tsx`, `add-to-palette-menu.tsx`

### Step 6 — Replace raw `<button>` with `<Button>` — recipes module

Target: `src/modules/recipes/components/`

Notable cases:
- Inline section/step/note card edit controls (these use ghost styling; verify `<Button className="btn-ghost">` renders correctly after Step 1 fix)
- Delete/remove action buttons within cards

### Step 7 — Replace raw `<button>` with `<Button>` — collection module

Target: `src/modules/collection/components/`

### Step 8 — Replace raw `<button>` with `<Button>` — color-schemes module

Target: `src/modules/color-schemes/components/`

Notable cases:
- `scheme-type-selector.tsx`, `base-color-picker.tsx` — already some `<Button>` usage; confirm no raw `<button>` remnants

### Step 9 — Replace raw `<button>` with `<Button>` — remaining modules and app

Target: remaining modules (`hues/`, `brands/`, `user/`, `community/`) and any `src/app/**/` component files.

### Step 10 — Replace raw `<input>` with `<Input>`

**Scope:** Only `type="text"`, `type="email"`, `type="password"`, `type="number"`, `type="search"`, `type="url"`, or inputs with no explicit `type` attribute.

**Exclude:** `type="hidden"`, `type="checkbox"`, `type="radio"`, `type="color"`, `type="range"`, `type="file"`.

Pattern for each replacement:
```tsx
// Before
<input type="text" className="input ..." {...props} />

// After
<Input type="text" className="..." {...props} />
// (drop the leading "input" class — component adds it)
```

Add `import { Input } from '@/components/ui/input'` where missing.

Key files to convert:
- `src/modules/admin/components/paint-form.tsx` — name, hex, brand-paint-id fields
- `src/modules/admin/components/hue-form.tsx` — name, slug, hex_code fields
- `src/modules/admin/components/brand-form.tsx` — name, slug, URL fields
- `src/modules/admin/components/add-paints-to-hue.tsx` — search input
- `src/modules/paints/components/hero-search.tsx` — search text input
- `src/modules/palettes/components/palette-form.tsx` — name field
- `src/modules/palettes/components/new-palette-inline-form.tsx` — name field
- `src/modules/recipes/components/recipe-section-card.tsx` — section title input (inline editor; verify ghost override works)
- `src/modules/recipes/components/recipe-step-card.tsx` — step title input (inline editor)
- `src/modules/collection/components/` — any search/filter inputs
- `src/modules/user/components/profile-form.tsx` — display name, username fields
- `src/modules/auth/components/` — email/password fields (may already use `<Input>`)

For inline-editor ghost inputs that use a borderless style, ensure the CSS file (`src/styles/input.css`) has an `.input-ghost` variant, or verify that `className="input-ghost"` overrides correctly after the base `.input` class is applied.

### Step 11 — Replace raw `<textarea>` with `<Textarea>`

Two files:

**`src/modules/recipes/components/recipe-note-card.tsx`**
```tsx
// Before
<textarea className="textarea ..." />

// After
<Textarea className="..." />
```

**`src/modules/markdown-editor/components/markdown-editor.tsx`** (or equivalent path)
```tsx
// Before
<textarea ... />

// After
<Textarea ... />
```

Add `import { Textarea } from '@/components/ui/textarea'` in each.

### Step 12 — Replace raw `<h1>` page titles with `<PageTitle>`

**Scope:** Route-level page title headings (`<h1>`) that should use the `.page-title` scale. Use `<PageTitle>` standalone when no subtitle is needed, or wrap in `<PageHeader>` when a subtitle or action slot is present.

**Exclude:**
- `src/modules/marketing/components/hero-section.tsx` — custom hero sizing, not the page-title scale
- Legal/policy page section headings (`<h2>`, `<h3>`) — document structure, not page titles

Files to convert (verify path and current heading content before editing):
- `src/app/admin/page.tsx` — dashboard heading
- `src/app/admin/brands/page.tsx` — "Brands" heading
- `src/app/admin/brands/new/page.tsx` — "New Brand" heading
- `src/app/admin/hues/page.tsx` — "Hues" heading
- `src/app/admin/hues/new/page.tsx` — "New Hue" heading
- `src/app/admin/paints/page.tsx` — "Paints" heading
- `src/app/admin/paints/new/page.tsx` — "New Paint" heading
- `src/app/(authenticated)/palettes/page.tsx` — "Palettes" heading (if raw)
- `src/app/(authenticated)/collection/page.tsx` — "Collection" heading (if raw)

Import pattern:
```tsx
import { PageHeader, PageTitle } from '@/components/page-header'

// No subtitle needed:
<PageTitle>Brands</PageTitle>

// With subtitle or action:
<PageHeader>
  <PageTitle>Brands</PageTitle>
  <PageSubtitle>Manage paint brands and product lines</PageSubtitle>
</PageHeader>
```

### Step 13 — Verify `<Main>` wrapper coverage

Search for route `page.tsx` files that render a top-level `<div>` instead of `<Main>`. The `<Main>` component applies consistent max-width, padding, and the `.main` CSS class.

```tsx
import { Main } from '@/components/main'
// or wherever the Main component lives — check src/components/
```

Any page missing `<Main>` at the top level should be corrected.

### Step 14 — Lint and build verification

```bash
npm run lint
npm run build
```

Fix any type errors or import issues surfaced.

## Key Files

| Action | File | Description |
|--------|------|-------------|
| Modify | `src/components/ui/button.tsx` | Change base class from `btn btn-primary` to `btn` |
| Modify | `src/modules/auth/components/sign-in-form.tsx` | Add `btn-primary` to `<Button>` |
| Modify | `src/modules/auth/components/sign-up-form.tsx` | Add `btn-primary` to `<Button>` |
| Modify | `src/modules/auth/components/forgot-password-form.tsx` | Add `btn-primary` to `<Button>` |
| Modify | `src/modules/auth/components/reset-password-form.tsx` | Add `btn-primary` to `<Button>` |
| Modify | `src/modules/user/components/change-password-form.tsx` | Add `btn-primary` to `<Button>` |
| Modify | `src/modules/user/components/profile-form.tsx` | Add `btn-primary` to `<Button>` |
| Modify | `src/modules/admin/components/admin-edit-profile-form.tsx` | Add `btn-primary` to `<Button>` |
| Modify | `src/modules/paints/components/hero-search.tsx` | Add `btn-primary` to `<Button>` |
| Modify | `src/modules/admin/components/*.tsx` (~12 files) | Replace raw `<button>` with `<Button>` |
| Modify | `src/modules/paints/components/*.tsx` (~15 files) | Replace raw `<button>` with `<Button>` |
| Modify | `src/modules/palettes/components/*.tsx` (~8 files) | Replace raw `<button>` with `<Button>` |
| Modify | `src/modules/recipes/components/*.tsx` (~10 files) | Replace raw `<button>` with `<Button>` |
| Modify | `src/modules/collection/components/*.tsx` (~5 files) | Replace raw `<button>` with `<Button>` |
| Modify | `src/modules/color-schemes/components/*.tsx` (~5 files) | Replace raw `<button>` with `<Button>` |
| Modify | Various other module components | Replace raw `<button>` with `<Button>` |
| Modify | ~13 form/search files | Replace text-type `<input>` with `<Input>` |
| Modify | `src/modules/recipes/components/recipe-note-card.tsx` | Replace `<textarea>` with `<Textarea>` |
| Modify | Markdown editor component | Replace `<textarea>` with `<Textarea>` |
| Modify | ~9 route pages / components | Replace raw `<h1>` with `<PageTitle>` / `<PageHeader>` |

## Risks & Considerations

- **Button variant regression** — The base-class change in Step 1 silently breaks every `<Button>` that didn't pass a color class. Complete Step 2 in the same PR before any visual testing.
- **Inline-editor inputs use ghost/borderless styles** — Recipe section/step title inputs render as plain editable text. If the `.input` base class adds a border, these will visually break. Verify that `className="input-ghost border-none"` (or an equivalent override) is available and applied.
- **Icon-only buttons** — Buttons containing only an SVG icon need an `aria-label` for accessibility. Check each icon-only button during Steps 3–9 and add `aria-label` where missing.
- **Form `<button type="submit">` vs `<button type="button">`** — The `<Button>` component defaults to `type="button"` in some implementations. Confirm the component passes `type` through via `...props`; for submit buttons, keep `type="submit"` explicit.
- **`<Input>` and `autoComplete`** — Auth-form inputs typically carry `autoComplete` attributes. These pass through `...props`, so no special handling is needed, but verify after each auth-form edit.
- **`<PageTitle>` level prop** — `<PageTitle>` supports `level={1|2}` for semantic heading level. All page-title headings should use `level={1}` (default). Section sub-headings within a page should continue to use raw `<h2>` / `<h3>` Tailwind classes or the `size="md"` variant as appropriate.
