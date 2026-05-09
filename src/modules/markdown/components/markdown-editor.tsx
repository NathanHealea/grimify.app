'use client'

import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Eye } from 'lucide-react'

import { cn } from '@/lib/utils'
import { MarkdownRenderer } from '@/modules/markdown/components/markdown-renderer'
import { MarkdownToolbarButton } from '@/modules/markdown/components/markdown-toolbar-button'
import { MarkdownToolbarDropdown } from '@/modules/markdown/components/markdown-toolbar-dropdown'
import {
  markdownToolbarPresets,
  type MarkdownToolbarPreset,
} from '@/modules/markdown/toolbar-actions/markdown-toolbar-presets'
import type { MarkdownAction } from '@/modules/markdown/types/markdown-action'
import type { MarkdownToolbarAction } from '@/modules/markdown/types/markdown-toolbar-action'
import type { MarkdownToolbarItem } from '@/modules/markdown/types/markdown-toolbar-item'

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
  /**
   * Toolbar layout. Pass a custom array of {@link MarkdownToolbarItem}s or the
   * name of a registered preset (see {@link markdownToolbarPresets}).
   * Defaults to the `'default'` preset.
   */
  toolbar?: MarkdownToolbarItem[] | MarkdownToolbarPreset
}

/** Type guard — toolbar items with an `items` array are dropdown groups. */
function isGroup(
  item: MarkdownToolbarItem,
): item is Extract<MarkdownToolbarItem, { items: MarkdownToolbarAction[] }> {
  return 'items' in item
}

/**
 * Lightweight WYSIWYG-style markdown editor — a configurable toolbar above an
 * uncontrolled textarea, with a Preview button that swaps the textarea for a
 * {@link MarkdownRenderer}.
 *
 * Toolbar entries can be standalone {@link MarkdownToolbarAction}s or
 * dropdown-grouped via {@link MarkdownToolbarGroup}. The textarea stays
 * uncontrolled so its value is read by `<form action>` via FormData on submit.
 *
 * @remarks
 * - Each toolbar action is a pure function under `src/modules/markdown/actions/`
 *   that maps a textarea snapshot to a new snapshot. The editor wires those
 *   pure functions to a single DOM-mutation helper ({@link runAction}).
 * - The component does not call `setState` on every keystroke; toolbar actions
 *   mutate the textarea value directly via the DOM and dispatch an `input`
 *   event so any framework-level listeners run.
 * - All toolbar buttons use `type="button"` to avoid submitting the parent
 *   form.
 * - In preview mode the textarea is hidden via CSS (not unmounted) so its
 *   value remains in the form's submission payload. The preview snapshot is
 *   captured into local state on toggle, then rendered through
 *   {@link MarkdownRenderer}.
 * - Keyboard shortcuts are derived from toolbar actions' `shortcut` metadata
 *   and always require Ctrl (Windows/Linux) or Cmd (macOS).
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
  toolbar = 'default',
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [previewMode, setPreviewMode] = useState(false)
  const [previewContent, setPreviewContent] = useState('')
  const [count, setCount] = useState(defaultValue?.length ?? 0)

  const items = useMemo<MarkdownToolbarItem[]>(
    () =>
      typeof toolbar === 'string'
        ? markdownToolbarPresets[toolbar]
        : toolbar,
    [toolbar],
  )

  const shortcuts = useMemo(() => {
    const map = new Map<string, MarkdownAction>()
    for (const item of items) {
      const entries = isGroup(item) ? item.items : [item]
      for (const entry of entries) {
        if (entry.shortcut) {
          map.set(entry.shortcut.key.toLowerCase(), entry.action)
        }
      }
    }
    return map
  }, [items])

  function togglePreview() {
    if (!previewMode) {
      setPreviewContent(textareaRef.current?.value ?? '')
    }
    setPreviewMode((p) => !p)
  }

  function runAction(action: MarkdownAction) {
    const ta = textareaRef.current
    if (!ta) return
    const result = action({
      value: ta.value,
      selectionStart: ta.selectionStart,
      selectionEnd: ta.selectionEnd,
    })
    ta.value = result.value
    ta.setSelectionRange(result.selectionStart, result.selectionEnd)
    ta.focus()
    ta.dispatchEvent(new Event('input', { bubbles: true }))
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (!(e.ctrlKey || e.metaKey)) return
    const action = shortcuts.get(e.key.toLowerCase())
    if (action) {
      e.preventDefault()
      runAction(action)
    }
  }

  return (
    <div>
      <div
        role="toolbar"
        aria-label="Formatting"
        className="flex flex-wrap gap-1 mb-2"
      >
        {items.map((item) =>
          isGroup(item) ? (
            <MarkdownToolbarDropdown
              key={item.label}
              group={item}
              disabled={previewMode}
              onSelect={(selected) => runAction(selected.action)}
            />
          ) : (
            <MarkdownToolbarButton
              key={item.label}
              label={item.label}
              icon={item.icon}
              disabled={previewMode}
              onClick={() => runAction(item.action)}
            />
          ),
        )}
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
