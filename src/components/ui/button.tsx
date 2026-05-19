import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

/** Base button primitive. Apply a color variant class (e.g. `btn-primary`) via `className`. */
function Button({ className, ...props }: ComponentProps<'button'>) {
  return <button data-slot="button" className={cn('btn', className)} {...props} />
}

export { Button }
