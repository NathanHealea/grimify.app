import Image from 'next/image'

import { cn } from '@/lib/utils'

/**
 * Visual variants of the brand logo.
 *
 * - `mark`: shield-with-palette glyph only, square footprint.
 * - `wordmark`: "Grimify" wordmark only, set in the site's display font.
 * - `full`: mark + wordmark on a single horizontal line.
 */
export type LogoVariant = 'full' | 'mark' | 'wordmark'

/**
 * Discrete size tokens for the logo.
 *
 * Heights:
 * - `sm` 24px — compact contexts (mobile nav, dense toolbars).
 * - `md` 32px — default navbar.
 * - `lg` 48px — section headers.
 * - `xl` 72px — page heroes.
 * - `2xl` 96px — auth screens, marketing modules.
 * - `3xl` 160px — splash / error / 404 pages.
 */
export type LogoSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'

/**
 * Props for the {@link Logo} component.
 *
 * @param variant - Which variant to render. Defaults to `full`.
 * @param size - Discrete height token. Defaults to `md`.
 * @param className - Additional class names merged onto the root element.
 * @param title - Accessible label override; defaults to "Grimify".
 */
export type LogoProps = {
  variant?: LogoVariant
  size?: LogoSize
  className?: string
  title?: string
}

const sizePx: Record<LogoSize, number> = {
  sm: 24,
  md: 32,
  lg: 48,
  xl: 72,
  '2xl': 96,
  '3xl': 160,
}

/**
 * Raster mark — Grimify logo PNG rendered via `next/image`.
 *
 * @param height - Pixel height (also used as width since the source is square).
 * @param title - Accessible label.
 */
function Mark({ height, title }: { height: number; title: string }) {
  return (
    <Image
      src="/branding/grimify-logo.png"
      alt={title}
      width={height}
      height={height}
      priority
    />
  )
}

/**
 * Brand logo. Renders the mark, wordmark, or both side by side.
 *
 * The mark is the Grimify logo PNG. The wordmark is plain text styled with the
 * site's display font (Geist) and inherits `currentColor`, so it themes via
 * Tailwind text utilities.
 *
 * @param props - See {@link LogoProps}.
 */
export function Logo({ variant = 'full', size = 'md', className, title = 'Grimify' }: LogoProps) {
  const height = sizePx[size]

  if (variant === 'mark') {
    return (
      <span className={cn('inline-flex items-center', className)} aria-label={title}>
        <Mark height={height} title={title} />
      </span>
    )
  }

  if (variant === 'wordmark') {
    return (
      <span
        className={cn('font-semibold tracking-tight leading-none', className)}
        style={{ fontSize: height }}
      >
        {title}
      </span>
    )
  }

  return (
    <span className={cn('inline-flex items-center gap-2', className)} aria-label={title}>
      <Mark height={height} title={title} />
      <span
        className="font-semibold tracking-tight leading-none"
        style={{ fontSize: height * 0.7 }}
      >
        {title}
      </span>
    </span>
  )
}
