import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/utils'

/** Size tokens for {@link PageTitle}. */
export type PageTitleSize = 'lg' | 'md'

/** Heading level for {@link PageTitle}. Defaults to `1`. */
export type PageTitleLevel = 1 | 2

/**
 * Props for {@link PageHeader}.
 */
export interface PageHeaderProps extends HTMLAttributes<HTMLElement> {
  /**
   * Optional action slot rendered to the right of the title/subtitle column.
   * When set, the wrapper switches to a row layout. Use for title-row buttons
   * or forms (e.g. "New palette" on `/user/palettes`).
   */
  actions?: ReactNode
  children: ReactNode
}

/**
 * Heading row for a route page.
 *
 * Renders a `<header>` element. By default lays out children in a column
 * (title above subtitle). Pass `actions` to render a sibling slot on the
 * right and switch the wrapper to a row layout.
 *
 * Compose with {@link PageTitle} and {@link PageSubtitle}:
 *
 * ```tsx
 * <PageHeader>
 *   <PageTitle>Brands</PageTitle>
 *   <PageSubtitle>Browse paint brands and their product lines.</PageSubtitle>
 * </PageHeader>
 * ```
 *
 * @param props.actions   Optional action slot (button, form, etc.).
 * @param props.className Additional classes merged via {@link cn}.
 */
export function PageHeader({
  actions,
  className,
  children,
  ...rest
}: PageHeaderProps) {
  if (actions) {
    return (
      <header className={cn('page-header-row', className)} {...rest}>
        <div className="flex flex-col gap-1">{children}</div>
        <div>{actions}</div>
      </header>
    )
  }
  return (
    <header className={cn('page-header', className)} {...rest}>
      {children}
    </header>
  )
}

/**
 * Props for {@link PageTitle}.
 */
export interface PageTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  /** Heading level. Defaults to `1`. Use `2` only if the page already has another `<h1>`. */
  level?: PageTitleLevel
  /** Size token. Defaults to `'lg'` (text-3xl). Use `'md'` (text-2xl) for narrower contexts. */
  size?: PageTitleSize
  children: ReactNode
}

/**
 * Page heading rendered inside {@link PageHeader}.
 *
 * Defaults to an `<h1>` with `text-3xl font-bold`. Use `level={2}` only when
 * the page legitimately has another `<h1>` (rare). Use `size="md"` for pages
 * that previously used `text-2xl`.
 *
 * @param props.level Heading level — `1` (default) or `2`.
 * @param props.size  Size token — `'lg'` (default) or `'md'`.
 */
export function PageTitle({
  level = 1,
  size = 'lg',
  className,
  children,
  ...rest
}: PageTitleProps) {
  const Tag = (level === 2 ? 'h2' : 'h1') as 'h1' | 'h2'
  return (
    <Tag
      className={cn(size === 'md' ? 'page-title-md' : 'page-title', className)}
      {...rest}
    >
      {children}
    </Tag>
  )
}

/**
 * Props for {@link PageSubtitle}.
 */
export interface PageSubtitleProps extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode
}

/**
 * Subtitle rendered inside {@link PageHeader} below the {@link PageTitle}.
 *
 * Renders a `<p className="page-subtitle">` (text-sm, muted). Children may be
 * plain text or arbitrary ReactNodes — see `/brands/[id]` which renders an
 * external link as the subtitle.
 *
 * @param props.className Additional classes merged via {@link cn}.
 */
export function PageSubtitle({
  className,
  children,
  ...rest
}: PageSubtitleProps) {
  return (
    <p className={cn('page-subtitle', className)} {...rest}>
      {children}
    </p>
  )
}
