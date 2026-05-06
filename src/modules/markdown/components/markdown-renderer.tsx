import type { ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'

import { cn } from '@/lib/utils'

const ALLOWED = ['p', 'strong', 'em', 'ul', 'ol', 'li'] as const

const COMPONENTS = {
  p: (props: { children?: ReactNode }) => (
    <p className="mb-2 last:mb-0">{props.children}</p>
  ),
  strong: (props: { children?: ReactNode }) => (
    <strong className="font-bold">{props.children}</strong>
  ),
  em: (props: { children?: ReactNode }) => (
    <em className="italic">{props.children}</em>
  ),
  ul: (props: { children?: ReactNode }) => (
    <ul className="mb-2 ml-6 list-disc last:mb-0">{props.children}</ul>
  ),
  ol: (props: { children?: ReactNode }) => (
    <ol className="mb-2 ml-6 list-decimal last:mb-0">{props.children}</ol>
  ),
  li: (props: { children?: ReactNode }) => (
    <li className="mb-0.5">{props.children}</li>
  ),
}

/**
 * Props accepted by {@link MarkdownRenderer}.
 *
 * @remarks
 * Pass the raw markdown string in `content`. When the value is `null`,
 * `undefined`, or whitespace-only, the component renders nothing — callers do
 * not need to guard for empty values.
 */
export type MarkdownRendererProps = {
  /** Raw markdown source. When `null`/empty the component renders `null`. */
  content: string | null | undefined
  /** Optional class applied to the wrapping `<div>`. */
  className?: string
}

/**
 * Renders a constrained subset of markdown (`bold`, `italic`, `ul`, `ol`, `li`)
 * as HTML.
 *
 * The renderer pairs with {@link MarkdownEditor} — the four toolbar actions
 * exposed by the editor are the only markdown surface this component supports
 * for v1. Anything outside that allow-list (headings, links, code, raw HTML)
 * is unwrapped to plain text.
 *
 * @remarks
 * - Safe by default: `react-markdown` does not use `dangerouslySetInnerHTML`,
 *   and the explicit `allowedElements` allow-list strips any other tags.
 * - Works in both RSC and client components — no `'use client'` directive.
 *
 * @param props - See {@link MarkdownRendererProps}.
 */
export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  if (!content || content.trim().length === 0) return null

  return (
    <div className={cn(className)}>
      <ReactMarkdown
        allowedElements={[...ALLOWED]}
        unwrapDisallowed
        components={COMPONENTS}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
