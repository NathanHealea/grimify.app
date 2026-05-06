'use client'

import { useState } from 'react'

import { Plus } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'

import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AddToPaletteMenu } from '@/modules/palettes/components/add-to-palette-menu'

/**
 * Trigger button that opens a "Add to palette" dropdown menu.
 *
 * Two display variants:
 * - `icon` — ghost square button with a `Plus` icon; used on paint cards.
 * - `full` — soft primary button with a label; used on the paint detail page.
 *
 * Unauthenticated users are redirected to `/sign-in?next={pathname}` on click
 * (same pattern as {@link CollectionToggle}). Click events stop propagation so
 * the button can be overlaid on a card `<Link>` without triggering navigation.
 *
 * Forwards `paintName` to {@link AddToPaletteMenu} so success/error toasts can
 * name the paint, and passes a close callback so the menu can dismiss the
 * dropdown after a successful add.
 *
 * @param props.paintId - UUID of the paint to add to a palette.
 * @param props.paintName - Display name of the paint, used in toast messages.
 * @param props.variant - Display style: `'icon'` or `'full'`.
 * @param props.isAuthenticated - Whether the current user is signed in.
 * @param props.className - Optional additional CSS classes for the trigger button.
 */
export function AddToPaletteButton({
  paintId,
  paintName,
  variant = 'icon',
  isAuthenticated,
  className,
}: {
  paintId: string
  paintName: string
  variant?: 'icon' | 'full'
  isAuthenticated: boolean
  className?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  function handleTriggerClick(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()

    if (!isAuthenticated) {
      router.push(`/sign-in?next=${encodeURIComponent(pathname)}`)
      return
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Add to palette"
          onClick={handleTriggerClick}
          className={cn(
            variant === 'icon'
              ? 'btn btn-ghost btn-square btn-sm text-muted-foreground hover:text-foreground'
              : 'btn btn-soft btn-primary btn-md',
            className,
          )}
        >
          <Plus size={variant === 'icon' ? 16 : 18} aria-hidden="true" />
          {variant === 'full' && <span>Add to palette</span>}
        </button>
      </DropdownMenuTrigger>
      {isAuthenticated && (
        <DropdownMenuContent align="end" className="w-56">
          <AddToPaletteMenu
            paintId={paintId}
            paintName={paintName}
            open={open}
            onClose={() => setOpen(false)}
          />
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  )
}
