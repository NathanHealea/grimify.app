import type { MarkdownAction } from '@/modules/markdown/types/markdown-action'

const LINE_PREFIX = /^(?:#{1,6} +|[-*+] +|\d+\. +)/
const BOLD = /(\*\*|__)(.+?)\1/g
const ITALIC = /(?<![*_])([*_])(?!\s)(.+?)(?<!\s)\1(?![*_])/g
const INLINE_CODE = /`([^`]+)`/g

function strip(line: string): string {
  return line
    .replace(LINE_PREFIX, '')
    .replace(BOLD, '$2')
    .replace(ITALIC, '$2')
    .replace(INLINE_CODE, '$1')
}

/**
 * Removes markdown formatting from the current selection (or the current
 * line(s) when nothing is selected). Strips bold/italic wrappers, inline code
 * backticks, heading prefixes, and bullet/numbered-list markers.
 *
 * @param input - The textarea snapshot. See {@link MarkdownAction}.
 * @returns The new textarea snapshot with markdown markers removed.
 */
export const clearFormatting: MarkdownAction = ({
  value,
  selectionStart,
  selectionEnd,
}) => {
  const hasSelection = selectionEnd > selectionStart

  const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1
  const nextNewline = value.indexOf('\n', Math.max(selectionEnd, selectionStart))
  const lineEnd = nextNewline === -1 ? value.length : nextNewline

  const rangeStart = hasSelection ? selectionStart : lineStart
  const rangeEnd = hasSelection ? selectionEnd : lineEnd

  const block = value.slice(rangeStart, rangeEnd)
  const transformed = block.split('\n').map(strip).join('\n')

  if (transformed === block) {
    return { value, selectionStart, selectionEnd }
  }

  return {
    value: value.slice(0, rangeStart) + transformed + value.slice(rangeEnd),
    selectionStart: rangeStart,
    selectionEnd: rangeStart + transformed.length,
  }
}
