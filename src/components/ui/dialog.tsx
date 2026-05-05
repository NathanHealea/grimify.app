'use client'

import type { ComponentProps } from 'react'
import { X } from 'lucide-react'

import * as DialogPrimitive from '@radix-ui/react-dialog'

import { cn } from '@/lib/utils'

/** Root dialog provider — wraps {@link DialogPrimitive.Root}. */
function Dialog(props: ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

/** Trigger element that opens the dialog. */
function DialogTrigger(props: ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

/** Portal — renders overlay and content into document.body. */
function DialogPortal(props: ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

/** Close button element. */
function DialogClose(props: ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

/** Semi-transparent backdrop behind the dialog content. */
function DialogOverlay({ className, ...props }: ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn('modal-overlay', className)}
      {...props}
    />
  )
}

/**
 * Dialog content panel — centered in the viewport.
 *
 * Renders into a portal with a backdrop overlay. Pass size classes via
 * `className` to control width/height (e.g. `max-w-2xl max-h-[90vh]`).
 *
 * @param props.showCloseButton - Whether to render the default ✕ close button (default `true`).
 */
function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & { showCloseButton?: boolean }) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn('modal-box', className)}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            className="btn btn-ghost btn-xs btn-square absolute right-3 top-3"
            aria-label="Close"
          >
            <X className="size-3.5" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

/** Container for the dialog title and optional description. */
function DialogHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div data-slot="dialog-header" className={cn('modal-header', className)} {...props} />
  )
}

/** Container for dialog action buttons, right-aligned. */
function DialogFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div data-slot="dialog-footer" className={cn('modal-footer', className)} {...props} />
  )
}

/**
 * Accessible dialog title — rendered as an `h2`.
 *
 * @param props - All props from {@link DialogPrimitive.Title}.
 */
function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('modal-title', className)}
      {...props}
    />
  )
}

/**
 * Accessible dialog description — rendered as a `p`.
 *
 * @param props - All props from {@link DialogPrimitive.Description}.
 */
function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('modal-description', className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
