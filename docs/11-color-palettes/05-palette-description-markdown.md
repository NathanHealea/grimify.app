# Palette Description — Markdown Editor

**Epic:** Color Palettes
**Type:** Feature
**Status:** Todo
**Branch:** `feature/palette-description-markdown`
**Merge into:** `v1/main`

## Summary

Replace the plain-text `<textarea>` for palette descriptions with a lightweight WYSIWYG markdown editor — a toolbar (bold, italic, bullet list, numbered list) above a `<textarea>`, plus a `MarkdownRenderer` for the read view. Mirrors the pattern used in the grimdark season editor (`src/modules/markdown/`). The description is stored as raw markdown text; no database migration is needed.

## Acceptance Criteria

- [ ] The palette edit form (`/palettes/[id]/edit`) shows a markdown toolbar above the description textarea
- [ ] Toolbar buttons: **B** (bold), *I* (italic), bullet list, numbered list
- [ ] Clicking a toolbar button inserts markdown syntax at the cursor; selected text is wrapped
- [ ] Helper text below the textarea explains supported syntax: `**bold**, *italic*, bullet lists, numbered lists`
- [ ] The palette detail page (`/palettes/[id]`) renders description markdown as HTML (bold, italic, `ul`, `ol`)
- [ ] If no description is set, nothing is rendered (existing behaviour preserved)
- [ ] The 1000-character limit still applies to the raw markdown string (validated in JS and enforced by the DB constraint)
- [ ] `npm run build` and `npm run lint` pass with no errors

## Implementation Plan

### 1. Install `react-markdown`

```bash
npm install react-markdown
```

`react-markdown` is the only dependency needed — no heavy WYSIWYG library.

### 2. Scaffold `src/modules/markdown/`

Create the module with two components. This module is intentionally separate from `palettes/` so it can be reused by future features (recipe notes, palette paint notes, etc.).

#### `src/modules/markdown/components/markdown-editor.tsx`

Client component. Adapted from the grimdark season editor:

- Props: `Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> & { defaultValue?: string; error?: string }`
- `useState` for value, `useRef` for the textarea element
- `insertMarkdown(type: 'bold' | 'italic' | 'bullet' | 'numbered')` helper — same cursor-position logic as grimdark
- Toolbar: `<div className="flex gap-1 mb-2">` with four `<button type="button" className="btn btn-sm">` buttons
  - B (bold), *I* (italic), `<List />` (lucide-react, bullet), `<ListOrdered />` (lucide-react, numbered)
- Textarea: `<textarea className={`textarea w-full ${error ? 'textarea-error' : ''}`} .../>`
- Helper text: `<p className="mt-1 text-xs text-muted-foreground">...</p>`
- Error message: `{error && <p className="text-destructive text-sm mt-1">{error}</p>}`
- JSDoc on the component and props type

#### `src/modules/markdown/components/markdown-renderer.tsx`

Server component (no directives needed — stateless). Copied directly from grimdark with Tailwind class adjustments to match grimify's token names:

- Uses `react-markdown` with custom `components` overrides
- `p`: `mb-2 last:mb-0`
- `strong`: `font-bold`
- `em`: `italic`
- `ul`: `mb-2 ml-6 list-disc last:mb-0`
- `ol`: `mb-2 ml-6 list-decimal last:mb-0`
- `li`: `mb-0.5`
- Props: `{ content: string | null; className?: string }`
- Returns `null` if `content` is falsy
- JSDoc on the component and props type

### 3. Update `palette-form.tsx`

File: `src/modules/palettes/components/palette-form.tsx`

- Remove the `<textarea>` for description
- Import `MarkdownEditor` from `../../markdown/components/markdown-editor`
- Replace with `<MarkdownEditor id="palette-description" name="description" defaultValue={state.values.description} error={state.errors.description} />`
- Remove the `maxLength={1000}` attribute — validation remains in `validation.ts`; the editor's helper text informs users of supported syntax

### 4. Update `palette-detail.tsx`

File: `src/modules/palettes/components/palette-detail.tsx`

- Import `MarkdownRenderer` from `../../markdown/components/markdown-renderer`
- Replace `{palette.description && <p className="mt-1 text-muted-foreground">{palette.description}</p>}` with `<MarkdownRenderer content={palette.description} className="mt-1 text-muted-foreground" />`
- The null-guard is now inside `MarkdownRenderer`, so the outer conditional can be removed

### 5. Verify validation — no changes needed

`src/modules/palettes/validation.ts` measures `description.trim().length <= 1000`. This applies to the raw markdown string exactly as before. The DB constraint `char_length(description) <= 1000` is unchanged.

### Affected Files

| File | Changes |
|------|---------|
| `package.json` | Add `react-markdown` dependency |
| `src/modules/markdown/components/markdown-editor.tsx` | New — WYSIWYG toolbar + textarea |
| `src/modules/markdown/components/markdown-renderer.tsx` | New — `react-markdown` renderer with Tailwind overrides |
| `src/modules/palettes/components/palette-form.tsx` | Swap `<textarea>` for `<MarkdownEditor>` |
| `src/modules/palettes/components/palette-detail.tsx` | Swap `<p>` for `<MarkdownRenderer>` |

### Risks & Considerations

- `react-markdown` renders `<p>`, `<strong>`, `<ul>` etc. directly — no XSS risk since it does not use `dangerouslySetInnerHTML` by default. Custom `components` overrides keep full control.
- The 1000-char DB constraint counts raw markdown characters. A description heavy on markdown syntax (e.g. many `**...**` wraps) leaves fewer visible characters, but this is acceptable for the current feature scope.
- `field-sizing-content` on `.textarea` means the textarea auto-grows; the `MarkdownEditor` inherits this behaviour — no fixed `rows` needed.
- No barrel/index files — import directly from the component file paths.
