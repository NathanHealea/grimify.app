'use client'

import { useEffect, useRef, useState, useTransition } from 'react'

import type { Palette } from '@/modules/palettes/types/palette'
import { deletePalette } from '@/modules/palettes/actions/delete-palette'

/**
 * Destructive delete button with a type-to-confirm native dialog.
 *
 * Opens a `<dialog>` element and requires the user to type the palette name
 * before the confirm button activates. Calls {@link deletePalette} inside
 * `startTransition`; on success the action redirects to `/palettes`.
 * Surfaces any returned error inline.
 *
 * @param props.palette - The palette to delete; its `id` and `name` are used.
 */
export function DeletePaletteButton({ palette }: { palette: Palette }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)
  const [confirmValue, setConfirmValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

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

      <dialog
        ref={dialogRef}
        onClose={handleClose}
        onCancel={handleClose}
        className="rounded-lg border border-border bg-popover p-0 text-popover-foreground shadow-lg backdrop:bg-black/40"
      >
        <div className="flex w-96 max-w-full flex-col gap-4 p-6">
          <div>
            <h2 className="text-lg font-semibold">Delete palette?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Permanently delete{' '}
              <span className="font-medium">{palette.name}</span> and all its
              paint slots. This action cannot be undone.
            </p>
          </div>

          <div className="form-item">
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

          <div className="flex justify-end gap-2">
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
          </div>
        </div>
      </dialog>
    </>
  )
}
