import type { MarkdownAction } from '@/modules/markdown/types/markdown-action'

/**
 * Prepends `## ` to the current line (or every selected line) to mark it as a
 * level-2 heading. On an empty line with no selection, inserts `## Heading`
 * and selects the placeholder.
 *
 * @param input - The textarea snapshot. See {@link MarkdownAction}.
 * @returns The new textarea snapshot with the heading prefix applied.
 */
export const heading2: MarkdownAction = ({
  value,
  selectionStart,
  selectionEnd,
}) => {
  const prefix = '## '
  const selected = value.slice(selectionStart, selectionEnd)
  const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1

  if (selected.length > 0) {
    const nextNewline = value.indexOf('\n', selectionEnd)
    const lineEnd = nextNewline === -1 ? value.length : nextNewline
    const block = value.slice(lineStart, lineEnd)
    const transformed = block
      .split('\n')
      .map((line) => (line.length > 0 ? prefix + line : line))
      .join('\n')
    return {
      value: value.slice(0, lineStart) + transformed + value.slice(lineEnd),
      selectionStart: lineStart,
      selectionEnd: lineStart + transformed.length,
    }
  }

  const currentLineEndIndex = value.indexOf('\n', selectionStart)
  const currentLineEnd =
    currentLineEndIndex === -1 ? value.length : currentLineEndIndex
  const currentLine = value.slice(lineStart, currentLineEnd)

  if (currentLine.length === 0) {
    const placeholder = 'Heading'
    return {
      value:
        value.slice(0, lineStart) + prefix + placeholder + value.slice(lineStart),
      selectionStart: lineStart + prefix.length,
      selectionEnd: lineStart + prefix.length + placeholder.length,
    }
  }

  return {
    value: value.slice(0, lineStart) + prefix + value.slice(lineStart),
    selectionStart: selectionStart + prefix.length,
    selectionEnd: selectionStart + prefix.length,
  }
}
