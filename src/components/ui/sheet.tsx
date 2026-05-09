'use client'

import type { ComponentProps } from 'react'
import { X } from 'lucide-react'
import * as DialogPrimitive from '@radix-ui/react-dialog'

import { cn } from '@/lib/utils'

/** Root sheet provider — wraps {@link DialogPrimitive.Root}. */
function Sheet(props: ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="sheet" {...props} />
}

/** Element that opens the sheet. */
function SheetTrigger(props: ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

/** Close button element. */
function SheetClose(props: ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="sheet-close" {...props} />
}

/** Portal — renders overlay and content into document.body. */
function SheetPortal(props: ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="sheet-portal" {...props} />
}

/** Semi-transparent backdrop behind the sheet content. */
function SheetOverlay({ className, ...props }: ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn('sheet-overlay', className)}
      {...props}
    />
  )
}

/**
 * Sheet content panel — anchored to the left or right edge of the viewport.
 *
 * Renders into a portal with a backdrop overlay. Inherits focus-trap,
 * scroll-lock, overlay-click-to-close, and Escape-to-close from Radix Dialog.
 *
 * @param props.side - Which edge the sheet slides in from. Defaults to `'right'`.
 * @param props.showCloseButton - Whether to render the default ✕ close button. Defaults to `true`.
 */
function SheetContent({
  className,
  children,
  side = 'right',
  showCloseButton = true,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & {
  side?: 'left' | 'right'
  showCloseButton?: boolean
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Content
        data-slot="sheet-content"
        className={cn('sheet-content', `sheet-content-${side}`, className)}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background
              transition-opacity hover:opacity-100 focus:outline-none focus:ring-2
              focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
            aria-label="Close"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </SheetPortal>
  )
}

/** Top row inside the sheet panel — typically holds a title and close button. */
function SheetHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="sheet-header" className={cn('sheet-header', className)} {...props} />
}

/** Scrollable content area of the sheet panel. */
function SheetBody({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="sheet-body" className={cn('sheet-body', className)} {...props} />
}

/** Bottom row inside the sheet panel — typically holds auth controls or actions. */
function SheetFooter({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="sheet-footer" className={cn('sheet-footer', className)} {...props} />
}

/**
 * Accessible sheet title — rendered as a visually styled heading.
 *
 * @param props - All props from {@link DialogPrimitive.Title}.
 */
function SheetTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="sheet-title"
      className={cn('text-lg font-semibold', className)}
      {...props}
    />
  )
}

/**
 * Accessible sheet description — rendered as muted helper text.
 *
 * @param props - All props from {@link DialogPrimitive.Description}.
 */
function SheetDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="sheet-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
