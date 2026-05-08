import type { ElementType, HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * Width tokens for {@link Main}. Each token maps to a `.main-<token>` class
 * defined in `src/styles/main.css`.
 */
export type MainWidth =
  | '2xl'
  | '3xl'
  | '4xl'
  | '5xl'
  | '6xl'
  | 'md'
  | 'container'
  | 'full'

/**
 * Padding tokens for {@link Main}.
 *
 * - `'default'` — `px-4 py-12`
 * - `'compact'` — `px-4 py-8`
 * - `'none'` — no padding (caller supplies its own via `className`)
 */
export type MainPadding = 'default' | 'compact' | 'none'

/**
 * Props for {@link Main}.
 */
export interface MainProps extends HTMLAttributes<HTMLElement> {
  /**
   * Element to render. Defaults to `'main'`. Use `'div'` inside a route group
   * whose layout already renders a `<main>` (e.g. the admin shell) to avoid
   * nested `<main>` elements.
   */
  as?: 'main' | 'div' | 'section'
  /** Max-width token. Defaults to `'6xl'`. */
  width?: MainWidth
  /** Padding token. Defaults to `'default'`. */
  padding?: MainPadding
  children: ReactNode
}

/**
 * Centered page-shell wrapper used by every route page.
 *
 * Renders a semantic `<main>` element (or the element specified by `as`)
 * with the standard width and padding tokens for the app. Page components
 * should use this in place of bespoke `<div className="mx-auto …">` wrappers
 * so gutters, max-widths, and semantics stay consistent across routes.
 *
 * @param props.as        Element to render; defaults to `'main'`.
 * @param props.width     Max-width token; defaults to `'6xl'`.
 * @param props.padding   Padding token; defaults to `'default'`.
 * @param props.className Additional classes merged via {@link cn}.
 */
export function Main({
  as = 'main',
  width = '6xl',
  padding = 'default',
  className,
  children,
  ...rest
}: MainProps) {
  const Tag = as as ElementType
  return (
    <Tag
      className={cn(
        'main',
        `main-${width}`,
        padding === 'default' && 'main-padding',
        padding === 'compact' && 'main-padding-compact',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  )
}
