'use client'

import { useOptimistic, useTransition } from 'react'

import { Bookmark } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'

import { cn } from '@/lib/utils'
import { addToCollection } from '@/modules/collection/actions/add-to-collection'
import { removeFromCollection } from '@/modules/collection/actions/remove-from-collection'

/**
 * A toggle button that adds or removes a paint from the user's collection.
 *
 * Uses `useOptimistic` for an instant state flip on click and reverts on error.
 * When `isAuthenticated` is false, clicking redirects to `/sign-in?next={pathname}`.
 *
 * Place this inside a `relative` wrapper with an absolute position to overlay
 * on top of a paint card `<Link>` — the click handler stops propagation so
 * the card navigation is not triggered.
 *
 * @param props.paintId - UUID of the paint to toggle.
 * @param props.isInCollection - Server-rendered initial membership state.
 * @param props.isAuthenticated - Whether the current user is signed in.
 * @param props.size - Button size: `'sm'` (default) or `'md'`.
 * @param props.revalidatePath - Optional page path to revalidate after the action.
 * @param props.className - Optional additional CSS classes for the button.
 */
export function CollectionToggle({
  paintId,
  isInCollection,
  isAuthenticated,
  size = 'sm',
  revalidatePath,
  className,
}: {
  paintId: string
  isInCollection: boolean
  isAuthenticated: boolean
  size?: 'sm' | 'md'
  revalidatePath?: string
  className?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [optimisticInCollection, setOptimisticInCollection] = useOptimistic(isInCollection)

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()

    if (!isAuthenticated) {
      router.push(`/sign-in?next=${encodeURIComponent(pathname)}`)
      return
    }

    startTransition(async () => {
      const next = !optimisticInCollection
      setOptimisticInCollection(next)

      const result = next
        ? await addToCollection(paintId, revalidatePath)
        : await removeFromCollection(paintId, revalidatePath)

      if (result.error) {
        // Revert — useOptimistic automatically resets to the server value on
        // re-render, but we trigger one explicitly by flipping back.
        setOptimisticInCollection(!next)
      }
    })
  }

  const iconSize = size === 'md' ? 20 : 16
  const btnSize = size === 'md' ? 'btn-md btn-square' : 'btn-sm btn-square'

  return (
    <button
      type="button"
      aria-pressed={optimisticInCollection}
      aria-label={optimisticInCollection ? 'Remove from collection' : 'Add to collection'}
      disabled={isPending}
      onClick={handleClick}
      className={cn(
        'btn btn-ghost',
        btnSize,
        optimisticInCollection
          ? 'text-primary'
          : 'text-muted-foreground hover:text-foreground',
        className,
      )}
    >
      <Bookmark
        size={iconSize}
        className={cn('transition-colors', optimisticInCollection && 'fill-current')}
        aria-hidden="true"
      />
    </button>
  )
}
