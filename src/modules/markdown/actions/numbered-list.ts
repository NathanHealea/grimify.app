import type { MarkdownAction } from '@/modules/markdown/types/markdown-action'

/**
 * Prefixes the current line (or every selected line) with `1. `, `2. `, … to
 * turn it into a numbered list. Empty lines are left untouched and do not
 * advance the counter.
 *
 * @param input - The textarea snapshot. See {@link MarkdownAction}.
 * @returns The new textarea snapshot with numbered-list markers applied.
 */
export const numberedList: MarkdownAction = ({
  value,
  selectionStart,
  selectionEnd,
}) => {
  const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1
  const nextNewline = value.indexOf('\n', selectionEnd)
  const lineEnd = nextNewline === -1 ? value.length : nextNewline
  const block = value.slice(lineStart, lineEnd)
  const transformed = block
    .split('\n')
    .map((line, index) => (line.length > 0 ? `${index + 1}. ${line}` : line))
    .join('\n')
  return {
    value: value.slice(0, lineStart) + transformed + value.slice(lineEnd),
    selectionStart: lineStart,
    selectionEnd: lineStart + transformed.length,
  }
}
