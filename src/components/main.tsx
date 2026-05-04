import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

type DefaultProps = {
  variant?: 'default'
  /** Additional classes merged on top of the default layout styles. */
  className?: string
  children?: ReactNode
}

type CustomProps = {
  variant: 'custom'
  /** Required when variant is "custom" — replaces all default styles. */
  className: string
  children?: ReactNode
}

type BlankProps = {
  variant: 'blank'
  children?: ReactNode
}

type MainProps = DefaultProps | CustomProps | BlankProps

/**
 * Page-level `<main>` wrapper with three layout variants.
 *
 * - **default** — applies `mx-auto w-full max-w-6xl space-y-10 px-4 py-12`; accepts an optional `className` to extend.
 * - **custom** — removes all default styles; `className` is required and applied as-is.
 * - **blank** — renders `<main>` with no className at all.
 *
 * @param props.variant - Layout mode (default: `"default"`).
 * @param props.className - CSS classes; required for `"custom"`, optional for `"default"`, absent for `"blank"`.
 * @param props.children - Page content.
 */
export function Main(props: MainProps) {
  if (props.variant === 'blank') {
    return <main>{props.children}</main>
  }

  if (props.variant === 'custom') {
    return <main className={props.className}>{props.children}</main>
  }

  return <main className={cn('mx-auto w-full max-w-6xl space-y-10 px-4 py-12', props.className)}>{props.children}</main>
}
