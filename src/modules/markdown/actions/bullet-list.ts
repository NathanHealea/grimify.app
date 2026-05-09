import type { MarkdownAction } from '@/modules/markdown/types/markdown-action'

/**
 * Prefixes the current line (or every selected line) with `- ` to turn it
 * into a bulleted list. Empty lines are left untouched so blank gaps are not
 * promoted into stray bullets.
 *
 * @param input - The textarea snapshot. See {@link MarkdownAction}.
 * @returns The new textarea snapshot with bullet markers applied.
 */
export const bulletList: MarkdownAction = ({
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
    .map((line) => (line.length > 0 ? `- ${line}` : line))
    .join('\n')
  return {
    value: value.slice(0, lineStart) + transformed + value.slice(lineEnd),
    selectionStart: lineStart,
    selectionEnd: lineStart + transformed.length,
  }
}
