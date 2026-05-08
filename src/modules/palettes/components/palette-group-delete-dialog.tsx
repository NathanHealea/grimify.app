'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'

import type { PaletteGroup } from '@/modules/palettes/types/palette-group'
import { deletePaletteGroup } from '@/modules/palettes/actions/delete-palette-group'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/**
 * Confirmation dialog for deleting a palette group.
 *
 * Deletion is non-destructive — member paints become ungrouped rather than
 * removed. A single confirm click is sufficient (no type-to-confirm). Calls
 * {@link deletePaletteGroup} inside `useTransition`; on error the dialog stays
 * open and the failure is surfaced via a Sonner toast.
 *
 * @param props.paletteId - UUID of the parent palette.
 * @param props.group - The group to delete.
 * @param props.open - Controls dialog visibility.
 * @param props.onOpenChange - Called when the dialog requests a visibility change.
 */
export function PaletteGroupDeleteDialog({
  paletteId,
  group,
  open,
  onOpenChange,
}: {
  paletteId: string
  group: PaletteGroup
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      const result = await deletePaletteGroup(paletteId, group.id)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !isPending && onOpenChange(o)}>
      <DialogContent className="w-full max-w-sm p-6">
        <DialogHeader>
          <DialogTitle>Delete group?</DialogTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Delete the group <span className="font-medium">"{group.name}"</span>? Paints in this
            group will become ungrouped — they won't be removed from the palette.
          </p>
        </DialogHeader>

        <DialogFooter className="mt-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="btn btn-sm btn-ghost"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className="btn btn-sm btn-destructive"
          >
            {isPending ? 'Deleting…' : 'Delete group'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
