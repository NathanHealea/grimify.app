'use client'

import { useRef } from 'react'
import { Bold, Italic, List, ListOrdered } from 'lucide-react'

import { cn } from '@/lib/utils'

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

type Action = 'bold' | 'italic' | 'bullet' | 'numbered'

/**
 * Lightweight WYSIWYG-style markdown editor — a four-button toolbar above an
 * uncontrolled textarea.
 *
 * Supports bold, italic, bullet lists, and numbered lists. The textarea stays
 * uncontrolled so its value is read by `<form action>` via FormData on submit.
 *
 * @remarks
 * - The component does not call `setState` on every keystroke; toolbar actions
 *   mutate the textarea value directly via the DOM and dispatch an `input`
 *   event so any framework-level listeners run.
 * - The four toolbar buttons use `type="button"` to avoid submitting the
 *   parent form.
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
        const placeholderText = action === 'bold' ? 'bold' : 'italic'
        next =
          value.slice(0, start) +
          wrap +
          placeholderText +
          wrap +
          value.slice(end)
        cursorStart = start + wrap.length
        cursorEnd = cursorStart + placeholderText.length
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
        className="flex gap-1 mb-2"
      >
        <button
          type="button"
          aria-label="Bold"
          className="btn btn-ghost btn-sm btn-square"
          onClick={() => insertMarkdown('bold')}
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Italic"
          className="btn btn-ghost btn-sm btn-square"
          onClick={() => insertMarkdown('italic')}
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Bulleted list"
          className="btn btn-ghost btn-sm btn-square"
          onClick={() => insertMarkdown('bullet')}
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Numbered list"
          className="btn btn-ghost btn-sm btn-square"
          onClick={() => insertMarkdown('numbered')}
        >
          <ListOrdered className="h-4 w-4" />
        </button>
      </div>
      <textarea
        ref={textareaRef}
        id={id}
        name={name}
        defaultValue={defaultValue}
        maxLength={maxLength}
        placeholder={placeholder}
        className={cn('textarea w-full', error && 'textarea-error')}
      />
      <p className="mt-1 text-xs text-muted-foreground">
        Supports **bold**, *italic*, bullet lists, and numbered lists.
      </p>
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  )
}
