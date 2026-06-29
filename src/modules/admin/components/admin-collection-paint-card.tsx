'use client'

import { Trash2 } from 'lucide-react'
import { useTransition } from 'react'
import { toast } from 'sonner'

import { removePaintFromCollection } from '@/modules/admin/actions/remove-paint-from-collection'
import { PaintCard } from '@/modules/paints/components/paint-card'

export function AdminCollectionPaintCard({
  userId,
  id,
  name,
  hex,
  brand,
  paintType,
  isMetallic = false,
}: {
  userId: string
  id: string
  name: string
  hex: string
  brand?: string
  paintType?: string | null
  isMetallic?: boolean
}) {
  const [isPending, startTransition] = useTransition()

  function handleRemove() {
    startTransition(async () => {
      const result = await removePaintFromCollection(userId, id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(`Removed '${name}'`)
    })
  }

  return (
    <div className="relative h-full w-full">
      <PaintCard
        size="lg"
        id={id}
        name={name}
        hex={hex}
        brand={brand}
        paintType={paintType}
        isMetallic={isMetallic}
      />
      <button
        className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-md bg-background/80 text-muted-foreground backdrop-blur-sm hover:bg-background hover:text-destructive disabled:opacity-50"
        disabled={isPending}
        aria-label="Remove from collection"
        onClick={handleRemove}
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  )
}
