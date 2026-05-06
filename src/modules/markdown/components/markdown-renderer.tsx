import type { ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'

import { cn } from '@/lib/utils'

const ALLOWED = [
  'p',
  'strong',
  'em',
  'code',
  'h2',
  'h3',
  'ul',
  'ol',
  'li',
] as const

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
  code: (props: { children?: ReactNode }) => (
    <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm">
      {props.children}
    </code>
  ),
  h2: (props: { children?: ReactNode }) => (
    <h2 className="mt-4 mb-2 text-xl font-bold first:mt-0">{props.children}</h2>
  ),
  h3: (props: { children?: ReactNode }) => (
    <h3 className="mt-3 mb-1 text-lg font-semibold first:mt-0">
      {props.children}
    </h3>
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
 * Renders a constrained subset of markdown — bold, italic, inline code,
 * H2/H3 headings, and unordered/ordered lists — as HTML.
 *
 * The renderer pairs with {@link MarkdownEditor} — the toolbar actions
 * exposed by the editor are the only markdown surface this component
 * supports. Anything outside the allow-list (links, code blocks, raw HTML,
 * H1/H4+, etc.) is unwrapped to plain text.
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
