'use client'

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/**
 * Confirmation dialog shown before applying a sort to a palette's paint list.
 *
 * Warns the user that the current paint order will be replaced. Sorting is
 * reversible via drag-and-drop, so no type-to-confirm is required.
 *
 * @param props.open - Controls dialog visibility.
 * @param props.onConfirm - Called when the user clicks "Apply sort".
 * @param props.onCancel - Called when the user cancels or closes the dialog.
 * @param props.isPending - When true, disables buttons and shows "Sorting…" label.
 */
export function PaletteSortConfirmDialog({
  open,
  onConfirm,
  onCancel,
  isPending,
}: {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  isPending?: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="w-full max-w-sm p-6">
        <DialogHeader>
          <DialogTitle>Reorder paints?</DialogTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Applying this sort will replace your current paint order. You can still drag and drop
            paints after sorting.
          </p>
        </DialogHeader>

        <DialogFooter className="mt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="btn btn-sm btn-ghost"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="btn btn-sm btn-primary"
          >
            {isPending ? 'Sorting…' : 'Apply sort'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
