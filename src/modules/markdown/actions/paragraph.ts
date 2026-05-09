import type { MarkdownAction } from '@/modules/markdown/types/markdown-action'

const HEADING_PREFIX = /^(#{1,6}) +/

/**
 * Strips a leading `#`–`######` heading marker from the current line (or every
 * selected line), turning it back into a normal paragraph. Lines without a
 * heading prefix are left untouched.
 *
 * @param input - The textarea snapshot. See {@link MarkdownAction}.
 * @returns The new textarea snapshot with heading prefixes removed.
 */
export const paragraph: MarkdownAction = ({
  value,
  selectionStart,
  selectionEnd,
}) => {
  const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1
  const nextNewline = value.indexOf('\n', Math.max(selectionEnd, selectionStart))
  const lineEnd = nextNewline === -1 ? value.length : nextNewline

  const block = value.slice(lineStart, lineEnd)
  const transformed = block
    .split('\n')
    .map((line) => line.replace(HEADING_PREFIX, ''))
    .join('\n')

  if (transformed === block) {
    return { value, selectionStart, selectionEnd }
  }

  const removedBeforeStart =
    block.slice(0, selectionStart - lineStart).length -
    block
      .slice(0, selectionStart - lineStart)
      .replace(HEADING_PREFIX, '').length
  const removedTotal = block.length - transformed.length

  return {
    value: value.slice(0, lineStart) + transformed + value.slice(lineEnd),
    selectionStart: Math.max(lineStart, selectionStart - removedBeforeStart),
    selectionEnd: Math.max(lineStart, selectionEnd - removedTotal),
  }
}
