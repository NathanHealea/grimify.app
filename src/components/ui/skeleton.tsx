import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

/**
 * Base loading skeleton — applies the daisyUI-style `.skeleton` class.
 *
 * Renders a muted, pulsing block. Pass Tailwind utility classes via `className`
 * to control width/height/shape (e.g. `h-9 w-32`).
 *
 * @param className - Additional classes merged with the base `.skeleton` class.
 */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('skeleton', className)} {...props} />
}

/**
 * Circular skeleton — useful for avatars, color swatches, and the wheel surface.
 *
 * @param className - Additional classes merged with the base `.skeleton skeleton-circle` classes.
 */
export function SkeletonCircle({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('skeleton skeleton-circle', className)} {...props} />
}
