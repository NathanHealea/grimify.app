'use client'

import { useState, useTransition } from 'react'

import type { Palette } from '@/modules/palettes/types/palette'
import { deletePalette } from '@/modules/palettes/actions/delete-palette'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/**
 * Destructive delete button with a type-to-confirm dialog.
 *
 * Opens a centered {@link Dialog} and requires the user to type the palette
 * name before the confirm button activates. Calls {@link deletePalette} inside
 * `startTransition`; on success the action redirects to `/palettes`.
 * Surfaces any returned error inline.
 *
 * @param props.palette - The palette to delete; its `id` and `name` are used.
 */
export function DeletePaletteButton({ palette }: { palette: Palette }) {
  const [open, setOpen] = useState(false)
  const [confirmValue, setConfirmValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleClose() {
    setConfirmValue('')
    setError(null)
    setOpen(false)
  }

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      const result = await deletePalette(palette.id)
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  const canConfirm = confirmValue === palette.name && !isPending

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-sm btn-destructive"
      >
        Delete palette
      </button>

      <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
        <DialogContent className="w-full max-w-sm p-6">
          <DialogHeader>
            <DialogTitle>Delete palette?</DialogTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Permanently delete{' '}
              <span className="font-medium">{palette.name}</span> and all its
              paint slots. This action cannot be undone.
            </p>
          </DialogHeader>

          <div className="form-item mt-2">
            <label className="form-label text-sm" htmlFor="confirm-palette-name">
              Type <span className="font-medium">{palette.name}</span> to confirm
            </label>
            <input
              id="confirm-palette-name"
              type="text"
              value={confirmValue}
              onChange={(e) => setConfirmValue(e.target.value)}
              className="input input-sm w-full"
              placeholder={palette.name}
              autoComplete="off"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <DialogFooter className="mt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isPending}
              className="btn btn-sm btn-ghost"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="btn btn-sm btn-destructive"
            >
              {isPending ? 'Deleting…' : 'Delete palette'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
