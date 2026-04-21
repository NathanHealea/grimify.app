'use client'

import { MoreHorizontal, Trash2 } from 'lucide-react'
import { useTransition } from 'react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { removePaintFromCollection } from '@/modules/admin/actions/remove-paint-from-collection'
import { PaintCard } from '@/modules/paints/components/paint-card'

/**
 * A paint card for the admin collection view, with an ellipsis dropdown
 * that allows removing the paint from the target user's collection.
 *
 * Wraps {@link PaintCard} in a `relative` container and absolutely positions
 * an ellipsis trigger button at the top-right — matching the positioning
 * pattern used in `PaintCardWithToggle`.
 *
 * @param props.userId - UUID of the target user (collection owner).
 * @param props.id - The paint's database UUID.
 * @param props.name - The display name of the paint.
 * @param props.hex - The hex color value for the swatch.
 * @param props.brand - The brand name.
 * @param props.paintType - The paint type.
 */
export function AdminCollectionPaintCard({
  userId,
  id,
  name,
  hex,
  brand,
  paintType,
}: {
  userId: string
  id: string
  name: string
  hex: string
  brand?: string
  paintType?: string | null
}) {
  const [isPending, startTransition] = useTransition()

  function handleRemove() {
    startTransition(async () => {
      await removePaintFromCollection(userId, id)
    })
  }

  return (
    <div className="relative flex">
      <PaintCard
        id={id}
        name={name}
        hex={hex}
        brand={brand}
        paintType={paintType}
        className="grow"
      />
      <DropdownMenu>
        <DropdownMenuTrigger
          className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-md bg-background/80 text-muted-foreground backdrop-blur-sm hover:bg-background hover:text-foreground disabled:opacity-50"
          disabled={isPending}
          aria-label="Paint options"
          onClick={(e) => e.preventDefault()}
        >
          <MoreHorizontal className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={handleRemove}
            disabled={isPending}
          >
            <Trash2 className="mr-2 size-3.5" />
            Remove from collection
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
