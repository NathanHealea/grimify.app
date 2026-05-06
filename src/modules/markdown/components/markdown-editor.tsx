'use client'

import { useRef, useState, type KeyboardEvent } from 'react'
import {
  Bold,
  Code,
  Eye,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { MarkdownRenderer } from '@/modules/markdown/components/markdown-renderer'

/**
 * Props accepted by {@link MarkdownEditor}.
 *
 * @remarks
 * The editor is intentionally uncontrolled. It mirrors the existing palette
 * form pattern where `<form action>` reads field values directly from the
 * underlying textarea via FormData on submit.
 */
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

type Action =
  | 'bold'
  | 'italic'
  | 'code'
  | 'h2'
  | 'h3'
  | 'bullet'
  | 'numbered'

/**
 * Lightweight WYSIWYG-style markdown editor — a toolbar above an uncontrolled
 * textarea, with a Preview button that swaps the textarea for a
 * {@link MarkdownRenderer}.
 *
 * Supports bold, italic, bullet lists, and numbered lists. The textarea stays
 * uncontrolled so its value is read by `<form action>` via FormData on submit.
 *
 * @remarks
 * - The component does not call `setState` on every keystroke; toolbar actions
 *   mutate the textarea value directly via the DOM and dispatch an `input`
 *   event so any framework-level listeners run.
 * - All toolbar buttons use `type="button"` to avoid submitting the parent
 *   form.
 * - In preview mode the textarea is hidden via CSS (not unmounted) so its
 *   value remains in the form's submission payload. The preview snapshot is
 *   captured into local state on toggle, then rendered through
 *   {@link MarkdownRenderer}.
 * - Keyboard shortcuts: `Ctrl/Cmd+B` toggles bold and `Ctrl/Cmd+I` toggles
 *   italic on the focused textarea.
 *
 * @param props - See {@link MarkdownEditorProps}.
 */
export function MarkdownEditor({
  id,
  name,
  defaultValue,
  maxLength,
  error,
  placeholder,
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [previewMode, setPreviewMode] = useState(false)
  const [previewContent, setPreviewContent] = useState('')
  const [count, setCount] = useState(defaultValue?.length ?? 0)

  function togglePreview() {
    if (!previewMode) {
      setPreviewContent(textareaRef.current?.value ?? '')
    }
    setPreviewMode((p) => !p)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (!(e.ctrlKey || e.metaKey)) return
    const key = e.key.toLowerCase()
    if (key === 'b') {
      e.preventDefault()
      insertMarkdown('bold')
    } else if (key === 'i') {
      e.preventDefault()
      insertMarkdown('italic')
    }
  }

  function insertMarkdown(action: Action) {
    const ta = textareaRef.current
    if (!ta) return
    const { selectionStart: start, selectionEnd: end, value } = ta
    const selected = value.slice(start, end)

    let next: string
    let cursorStart: number
    let cursorEnd: number

    if (action === 'bold' || action === 'italic' || action === 'code') {
      const wrap = action === 'bold' ? '**' : action === 'italic' ? '*' : '`'
      if (selected.length > 0) {
        next = value.slice(0, start) + wrap + selected + wrap + value.slice(end)
        cursorStart = start + wrap.length
        cursorEnd = cursorStart + selected.length
      } else {
        const placeholderText = action
        next =
          value.slice(0, start) +
          wrap +
          placeholderText +
          wrap +
          value.slice(end)
        cursorStart = start + wrap.length
        cursorEnd = cursorStart + placeholderText.length
      }
    } else if (action === 'h2' || action === 'h3') {
      const prefix = action === 'h2' ? '## ' : '### '
      const lineStart = value.lastIndexOf('\n', start - 1) + 1
      if (selected.length > 0) {
        const nextNewline = value.indexOf('\n', end)
        const lineEnd = nextNewline === -1 ? value.length : nextNewline
        const block = value.slice(lineStart, lineEnd)
        const lines = block.split('\n')
        const transformed = lines
          .map((line) => (line.length > 0 ? prefix + line : line))
          .join('\n')
        next = value.slice(0, lineStart) + transformed + value.slice(lineEnd)
        cursorStart = lineStart
        cursorEnd = lineStart + transformed.length
      } else {
        const currentLineEndIndex = value.indexOf('\n', start)
        const currentLineEnd =
          currentLineEndIndex === -1 ? value.length : currentLineEndIndex
        const currentLine = value.slice(lineStart, currentLineEnd)
        if (currentLine.length === 0) {
          const placeholderText = 'Heading'
          next =
            value.slice(0, lineStart) +
            prefix +
            placeholderText +
            value.slice(lineStart)
          cursorStart = lineStart + prefix.length
          cursorEnd = cursorStart + placeholderText.length
        } else {
          next = value.slice(0, lineStart) + prefix + value.slice(lineStart)
          cursorStart = start + prefix.length
          cursorEnd = cursorStart
        }
      }
    } else {
      const lineStart = value.lastIndexOf('\n', start - 1) + 1
      const nextNewline = value.indexOf('\n', end)
      const lineEnd = nextNewline === -1 ? value.length : nextNewline
      const block = value.slice(lineStart, lineEnd)
      const lines = block.split('\n')
      const transformed =
        action === 'bullet'
          ? lines.map((line) => (line.length > 0 ? `- ${line}` : line)).join('\n')
          : lines
              .map((line, i) =>
                line.length > 0 ? `${i + 1}. ${line}` : line
              )
              .join('\n')
      next = value.slice(0, lineStart) + transformed + value.slice(lineEnd)
      cursorStart = lineStart
      cursorEnd = lineStart + transformed.length
    }

    ta.value = next
    ta.setSelectionRange(cursorStart, cursorEnd)
    ta.focus()
    ta.dispatchEvent(new Event('input', { bubbles: true }))
  }

  return (
    <div>
      <div
        role="toolbar"
        aria-label="Formatting"
        className="flex flex-wrap gap-1 mb-2"
      >
        <button
          type="button"
          aria-label="Bold"
          disabled={previewMode}
          className="btn btn-ghost btn-sm btn-square"
          onClick={() => insertMarkdown('bold')}
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Italic"
          disabled={previewMode}
          className="btn btn-ghost btn-sm btn-square"
          onClick={() => insertMarkdown('italic')}
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Inline code"
          disabled={previewMode}
          className="btn btn-ghost btn-sm btn-square"
          onClick={() => insertMarkdown('code')}
        >
          <Code className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Heading 2"
          disabled={previewMode}
          className="btn btn-ghost btn-sm btn-square"
          onClick={() => insertMarkdown('h2')}
        >
          <Heading2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Heading 3"
          disabled={previewMode}
          className="btn btn-ghost btn-sm btn-square"
          onClick={() => insertMarkdown('h3')}
        >
          <Heading3 className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Bulleted list"
          disabled={previewMode}
          className="btn btn-ghost btn-sm btn-square"
          onClick={() => insertMarkdown('bullet')}
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Numbered list"
          disabled={previewMode}
          className="btn btn-ghost btn-sm btn-square"
          onClick={() => insertMarkdown('numbered')}
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label={previewMode ? 'Show editor' : 'Show preview'}
          aria-pressed={previewMode}
          className="btn btn-ghost btn-sm ml-auto"
          onClick={togglePreview}
        >
          <Eye className="h-4 w-4" />
          <span className="ml-1 text-xs">
            {previewMode ? 'Edit' : 'Preview'}
          </span>
        </button>
      </div>
      {previewMode && (
        <div className="textarea w-full" style={{ minHeight: '17rem' }}>
          {previewContent.trim().length > 0 ? (
            <MarkdownRenderer content={previewContent} />
          ) : (
            <p className="italic text-muted-foreground">Nothing to preview</p>
          )}
        </div>
      )}
      <textarea
        ref={textareaRef}
        id={id}
        name={name}
        defaultValue={defaultValue}
        maxLength={maxLength}
        placeholder={placeholder}
        rows={10}
        onInput={(e) => setCount(e.currentTarget.value.length)}
        onKeyDown={handleKeyDown}
        className={cn(
          'textarea w-full',
          error && 'textarea-error',
          previewMode && 'hidden'
        )}
      />
      <div className="mt-1 flex justify-between gap-2 text-xs text-muted-foreground">
        <p>
          Supports **bold**, *italic*, `code`, ## headings, and lists.
        </p>
        {maxLength != null && (
          <p
            className={cn(
              'tabular-nums',
              count > maxLength && 'text-destructive'
            )}
          >
            {count} / {maxLength}
          </p>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  )
}
