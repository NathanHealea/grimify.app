import * as React from 'react'

import { cn } from '@/lib/utils'

function Button({ className, ...props }: React.ComponentProps<'button'>) {
  return <button data-slot="button" className={cn('btn btn-primary', className)} {...props} />
}

export { Button }
