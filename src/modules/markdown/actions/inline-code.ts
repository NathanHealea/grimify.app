import type { MarkdownAction } from '@/modules/markdown/types/markdown-action'

/**
 * Wraps the current selection with backticks to mark it as inline code. When
 * nothing is selected, inserts `` `code` `` and selects the placeholder so the
 * user can overtype it.
 *
 * @param input - The textarea snapshot. See {@link MarkdownAction}.
 * @returns The new textarea snapshot with inline-code markers applied.
 */
export const inlineCode: MarkdownAction = ({
  value,
  selectionStart,
  selectionEnd,
}) => {
  const wrap = '`'
  const selected = value.slice(selectionStart, selectionEnd)
  const inner = selected.length > 0 ? selected : 'code'
  const next =
    value.slice(0, selectionStart) + wrap + inner + wrap + value.slice(selectionEnd)
  return {
    value: next,
    selectionStart: selectionStart + wrap.length,
    selectionEnd: selectionStart + wrap.length + inner.length,
  }
}
