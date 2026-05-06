# Palette Description — Markdown Editor

**Epic:** Color Palettes
**Type:** Feature
**Status:** Completed
**Branch:** `feature/palette-description-markdown`
**Merge into:** `v1/main`

## Summary

Replace the plain-text `<textarea>` for palette descriptions with a lightweight WYSIWYG markdown editor — a toolbar (bold, italic, bullet list, numbered list) above a `<textarea>`, plus a `MarkdownRenderer` for the read view. Mirrors the pattern used in the grimdark season editor (`src/modules/markdown/`). The description is stored as raw markdown text; no database migration is needed.

## Acceptance Criteria

- [x] The palette edit form (`/palettes/[id]/edit`) shows a markdown toolbar above the description textarea
- [x] Toolbar buttons: **B** (bold), *I* (italic), bullet list, numbered list
- [x] Clicking a toolbar button inserts markdown syntax at the cursor; selected text is wrapped
- [x] Helper text below the textarea explains supported syntax: `**bold**, *italic*, bullet lists, numbered lists`
- [x] The palette detail page (`/palettes/[id]`) renders description markdown as HTML (bold, italic, `ul`, `ol`)
- [x] If no description is set, nothing is rendered (existing behaviour preserved)
- [x] The 1000-character limit still applies to the raw markdown string (validated in JS and enforced by the DB constraint)
- [x] `npm run build` and `npm run lint` pass with no errors

## Implementation Plan

The form already uses `useActionState` with an uncontrolled `<textarea name="description">` (`palette-form.tsx:61-69`), and the action reads `formData.get('description')`. Keep that contract — the new `MarkdownEditor` wraps a name-bearing textarea so React 19's form action picks the value up unchanged. No change to `validation.ts`, `update-palette.ts`, or the DB.

### 1. Install `react-markdown`

```bash
npm install react-markdown
```

Pin to `^9` (React 19 / Next 16 compatible, ESM). It is the only new dependency. `react-markdown` defaults to a safe pipeline — no `dangerouslySetInnerHTML`, no raw HTML pass-through. Lock the rendered tag set with the `allowedElements` prop in Step 3 to avoid future plugin surprises.

### 2. Scaffold `src/modules/markdown/`

Create a new domain module — separate from `palettes/` because the editor and renderer will be reused by future features (recipe notes, palette paint notes per `02-add-to-palette.md` Step 6 deferred work). Per CLAUDE.md, modules are organized by domain; "markdown" is a self-contained text-rendering domain.

```
src/modules/markdown/
└── components/
    ├── markdown-editor.tsx     NEW — toolbar + textarea
    └── markdown-renderer.tsx   NEW — react-markdown wrapper
```

No `actions/`, `services/`, or `validation.ts` needed; the module is purely presentational.

#### 2a. `markdown-editor.tsx` — client component

Props (single source of truth — exported as `MarkdownEditorProps`):

```ts
export type MarkdownEditorProps = {
  /** Required for `<label htmlFor>` and the form-data key. */
  id: string
  /** Required — the `<textarea>` `name` attribute that the parent form action reads. */
  name: string
  /** Initial value; the textarea stays uncontrolled to match the rest of the palette form. */
  defaultValue?: string
  /** Hard cap on character count. The DB constraint is 1000 — pass that here for the palette form. */
  maxLength?: number
  /** Inline error to surface below the textarea (mirrors `palette-form.tsx`'s pattern). */
  error?: string
  /** Optional placeholder for the textarea. */
  placeholder?: string
}
```

Behaviour:

- Stays **uncontrolled**. The component holds a `useRef<HTMLTextAreaElement>` and never calls `setState` on every keystroke. Toolbar actions mutate the textarea via DOM, then dispatch an `input` event so any framework-level listeners run.
- Toolbar is a `<div role="toolbar" aria-label="Formatting" className="flex gap-1 mb-2">` containing four `<button type="button" className="btn btn-ghost btn-sm btn-square">` triggers. `type="button"` is critical — without it the buttons would submit the parent form.
- Icons use `lucide-react` (already a dependency): `Bold`, `Italic`, `List`, `ListOrdered`. Each button has `aria-label` ("Bold", "Italic", "Bulleted list", "Numbered list").
- Textarea: `<textarea ref={textareaRef} id={id} name={name} defaultValue={defaultValue} maxLength={maxLength} placeholder={placeholder} className={cn('textarea w-full', error && 'textarea-error')} />`. The `.textarea` class already includes `field-sizing-content` (`src/styles/input.css:99`), so it auto-grows — no `rows` prop needed.
- Helper text: `<p className="mt-1 text-xs text-muted-foreground">Supports **bold**, *italic*, bullet lists, and numbered lists.</p>` — placed beneath the textarea but above the error.
- Error: `{error && <p className="mt-1 text-sm text-destructive">{error}</p>}`.

`insertMarkdown(action)` helper logic — implement once inside the component, not as a separate module util (it depends on the ref):

```ts
type Action = 'bold' | 'italic' | 'bullet' | 'numbered'

function insertMarkdown(action: Action) {
  const ta = textareaRef.current
  if (!ta) return
  const { selectionStart: start, selectionEnd: end, value } = ta
  const selected = value.slice(start, end)

  let next: string
  let cursorStart: number
  let cursorEnd: number

  if (action === 'bold' || action === 'italic') {
    const wrap = action === 'bold' ? '**' : '*'
    if (selected.length > 0) {
      next = value.slice(0, start) + wrap + selected + wrap + value.slice(end)
      cursorStart = start + wrap.length
      cursorEnd = cursorStart + selected.length
    } else {
      const placeholder = action === 'bold' ? 'bold' : 'italic'
      next = value.slice(0, start) + wrap + placeholder + wrap + value.slice(end)
      cursorStart = start + wrap.length
      cursorEnd = cursorStart + placeholder.length
    }
  } else {
    // List actions: operate on whole lines covering the selection
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    const lineEnd = end + (value.indexOf('\n', end) === -1 ? value.length - end : value.indexOf('\n', end) - end)
    const block = value.slice(lineStart, lineEnd)
    const lines = block.split('\n')
    const transformed =
      action === 'bullet'
        ? lines.map((line) => (line.length > 0 ? `- ${line}` : line)).join('\n')
        : lines.map((line, i) => (line.length > 0 ? `${i + 1}. ${line}` : line)).join('\n')
    next = value.slice(0, lineStart) + transformed + value.slice(lineEnd)
    cursorStart = lineStart
    cursorEnd = lineStart + transformed.length
  }

  ta.value = next
  ta.setSelectionRange(cursorStart, cursorEnd)
  ta.focus()
  ta.dispatchEvent(new Event('input', { bubbles: true }))
}
```

The component does **not** track value in React state — `ta.value` is the truth, and the parent's `<form action>` reads it via FormData on submit. This avoids re-render on every keystroke and matches the existing palette form's uncontrolled pattern.

JSDoc: full block for the component summarizing what it is, when to use it, and a `@remarks` note that it stays uncontrolled. JSDoc on `MarkdownEditorProps` per project convention. JSDoc on the internal `insertMarkdown` is **not** required (CLAUDE.md: internal helpers don't need JSDoc unless non-obvious).

#### 2b. `markdown-renderer.tsx` — server-component-friendly

```tsx
import ReactMarkdown from 'react-markdown'

import { cn } from '@/lib/utils'

const ALLOWED = ['p', 'strong', 'em', 'ul', 'ol', 'li'] as const

const COMPONENTS = {
  p: (props: { children?: React.ReactNode }) => <p className="mb-2 last:mb-0">{props.children}</p>,
  strong: (props: { children?: React.ReactNode }) => <strong className="font-bold">{props.children}</strong>,
  em: (props: { children?: React.ReactNode }) => <em className="italic">{props.children}</em>,
  ul: (props: { children?: React.ReactNode }) => <ul className="mb-2 ml-6 list-disc last:mb-0">{props.children}</ul>,
  ol: (props: { children?: React.ReactNode }) => <ol className="mb-2 ml-6 list-decimal last:mb-0">{props.children}</ol>,
  li: (props: { children?: React.ReactNode }) => <li className="mb-0.5">{props.children}</li>,
}

export type MarkdownRendererProps = {
  /** Raw markdown source. When `null`/empty the component renders `null`. */
  content: string | null | undefined
  /** Optional class applied to the wrapping `<div>`. */
  className?: string
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  if (!content || content.trim().length === 0) return null

  return (
    <div className={cn(className)}>
      <ReactMarkdown allowedElements={[...ALLOWED]} unwrapDisallowed components={COMPONENTS}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
```

Notes:

- No `'use client'`. `react-markdown` works in RSC; it is a pure transform.
- `allowedElements` + `unwrapDisallowed` strips anything outside the four supported syntaxes (e.g., headings, links, code blocks, raw HTML) — the four toolbar actions are the only supported markdown surface for v1, so anything else a user pastes degrades gracefully to plain text.
- No `rehype-raw` / `remark-gfm` — they are not needed for the v1 surface and would re-introduce HTML or extended syntax.

JSDoc the component and `MarkdownRendererProps` per project convention.

### 3. Wire into the palette form

Edit `src/modules/palettes/components/palette-form.tsx`:

1. Add `import { MarkdownEditor } from '@/modules/markdown/components/markdown-editor'`.
2. Replace the existing `<textarea>` block (lines 61-69) with:

```tsx
<MarkdownEditor
  id="palette-description"
  name="description"
  defaultValue={state.values.description}
  maxLength={1000}
  placeholder="Optional description"
  error={state.errors.description}
/>
```

3. Delete the now-redundant `{state.errors.description && <p>...</p>}` block — the editor renders its own error.

> **Class swap is intentional.** The existing block uses `className="input w-full"` and `rows={3}` — that is the `.input` class (single-line styling) applied to a `<textarea>` for legacy convenience. The new `<MarkdownEditor>` internally uses `cn('textarea w-full', error && 'textarea-error')`. `.textarea` is the daisyUI-style multi-line counterpart and includes `field-sizing-content` (`src/styles/input.css:99`), so the textarea auto-grows to fit content. Drop the `rows` prop entirely — do not preserve `rows={3}` by reflex; it would just enforce a hard initial height that fights the auto-grow.

The form's `<form action={formAction}>` continues to submit `description` from the inner textarea. `useActionState` keeps working because the action reads from FormData, not from React state.

### 4. Wire into the palette detail page

Edit `src/modules/palettes/components/palette-detail.tsx:40-42`:

1. Add `import { MarkdownRenderer } from '@/modules/markdown/components/markdown-renderer'`.
2. Replace:

```tsx
{palette.description && (
  <p className="mt-1 text-muted-foreground">{palette.description}</p>
)}
```

with:

```tsx
<MarkdownRenderer content={palette.description} className="mt-1 text-muted-foreground" />
```

`MarkdownRenderer` returns `null` for empty input, so the outer guard is no longer needed. The `text-muted-foreground` class on the wrapping `<div>` cascades to children unless overridden — none of the renderer's element overrides set color, so the muted style still applies.

### 5. Validation — no changes

`src/modules/palettes/validation.ts:22-25` measures `desc.trim().length <= 1000`. Markdown syntax characters (`*`, `-`, etc.) count toward the cap. The DB `CHECK (char_length(description) <= 1000)` constraint is unchanged. No migration required.

### 6. Manual QA checklist

- Open `/palettes/{id}/edit`. The description field shows a four-button toolbar above an auto-growing textarea, plus the helper text underneath.
- Select text → click **B** → text wraps in `**...**`; selection now covers the inserted text. Submitting saves the markdown verbatim.
- No selection → click **B** → `**bold**` inserted at cursor with `bold` selected for easy overwrite. Same behaviour for *I*.
- Place cursor on an empty line → click bullet list → line starts with `- `. Type two more lines, select all three → click bullet list → all three become bullets.
- Select two consecutive lines → click numbered list → lines become `1. ` / `2. `.
- Type a string longer than 1000 chars → input is capped client-side by `maxLength`. Force-save a 1001-char value via Devtools → server-side validation surfaces the existing "Description must be 1000 characters or fewer" error.
- Save the palette, view `/palettes/{id}` → markdown renders as bold / italic / bulleted / numbered HTML. Plain text without markdown still renders as a single paragraph.
- View a palette with `description = null` → no description block is rendered (no empty `<div>`).
- View a palette whose description includes a `<script>` tag pasted by the user → the tag is stripped (allowedElements filter) and surrounding text shows verbatim.
- `npm run build` and `npm run lint` pass.

### Affected Files

| File | Changes |
|------|---------|
| `package.json` | Add `react-markdown` ^9 dependency |
| `src/modules/markdown/components/markdown-editor.tsx` | New — uncontrolled toolbar + textarea client component |
| `src/modules/markdown/components/markdown-renderer.tsx` | New — server-friendly `react-markdown` wrapper with locked-down allowedElements |
| `src/modules/palettes/components/palette-form.tsx` | Swap the description `<textarea>` block for `<MarkdownEditor>`; drop now-redundant inline error block |
| `src/modules/palettes/components/palette-detail.tsx` | Swap the description `<p>` block for `<MarkdownRenderer>` |

### Risks & Considerations

- **No XSS surface**: `react-markdown` does not use `dangerouslySetInnerHTML` and the `allowedElements` allowlist drops any element outside `p / strong / em / ul / ol / li`. A user who manually pastes HTML or unsupported markdown (headings, links, code) sees only the unwrapped text content.
- **Markdown syntax counts toward the 1000-char cap**: A description heavy on `**...**` wrappers loses ~4 visible chars per emphasized run. Acceptable for v1; if it becomes a problem, we can switch validation to count rendered text, but that is a separate ticket.
- **Toolbar accessibility**: `role="toolbar"` + per-button `aria-label`s make the controls screen-reader friendly. `type="button"` on every trigger prevents accidental form submission — easy to forget; verify in QA.
- **Uncontrolled textarea**: Because the editor mutates `ta.value` directly, any future React state that mirrors the description (e.g., live preview) would need to be wired through an `onInput` callback. The `dispatchEvent('input')` call in `insertMarkdown` ensures such a callback would fire correctly, but no caller depends on it yet.
- **Server component renderer**: Mounting `<MarkdownRenderer>` from a server component is the supported path. If a future caller mounts it from a client component, the behavior is identical — `react-markdown` works in both environments.
- **No barrel/index files**: Per CLAUDE.md, import directly from the component file paths (`@/modules/markdown/components/markdown-editor`, not `@/modules/markdown`).
- **Bundle size**: `react-markdown` v9 with no remark/rehype plugins is ~10KB gzipped. Acceptable for the editor + read view; only paint and palette pages pull it in via tree-shaking.
