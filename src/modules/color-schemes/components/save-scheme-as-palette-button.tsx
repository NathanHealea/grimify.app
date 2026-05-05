'use client'

import { useEffect, useRef, useState, useTransition } from 'react'

import type { BaseColor } from '@/modules/color-schemes/types/base-color'
import type { SchemeColor } from '@/modules/color-schemes/types/scheme-color'
import type { ColorScheme } from '@/modules/color-wheel/types/color-scheme'
import { buildPaletteFromScheme } from '@/modules/color-schemes/utils/build-palette-from-scheme'
import { createPaletteWithPaints } from '@/modules/palettes/actions/create-palette-with-paints'

/**
 * Button that saves the current color scheme as a new palette.
 *
 * Opens a native `<dialog>` (matching the `delete-palette-button.tsx` pattern)
 * with a name input pre-populated by {@link buildPaletteFromScheme}. Confirm
 * calls {@link createPaletteWithPaints} which redirects to the new palette's
 * edit page.
 *
 * Disabled when `schemeColors` is empty or every entry has no `nearestPaints`.
 * The disabled state is surfaced via `aria-disabled` and a `title` tooltip.
 *
 * @param props.schemeColors - The current scheme colors with nearest paint matches.
 * @param props.baseColor - The base color used to generate the scheme.
 * @param props.activeScheme - The active color harmony type.
 */
export function SaveSchemeAsPaletteButton({
  schemeColors,
  baseColor,
  activeScheme,
}: {
  schemeColors: SchemeColor[]
  baseColor: BaseColor
  activeScheme: ColorScheme
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const hasMatches = schemeColors.some((c) => c.nearestPaints.length > 0)
  const disabledReason = schemeColors.length === 0
    ? 'Pick a base color first'
    : !hasMatches
      ? 'No matching paints'
      : undefined
  const isDisabled = Boolean(disabledReason)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      const { name: defaultName } = buildPaletteFromScheme(schemeColors, baseColor, activeScheme)
      setName(defaultName)
      setError(null)
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open, schemeColors, baseColor, activeScheme])

  function handleClose() {
    setOpen(false)
    setError(null)
  }

  function handleConfirm() {
    setError(null)
    const { paintIds } = buildPaletteFromScheme(schemeColors, baseColor, activeScheme)
    startTransition(async () => {
      const result = await createPaletteWithPaints({ name, paintIds })
      if (result?.error) {
        setError(result.error)
      }
      // On success the action redirects — nothing to do here
    })
  }

  return (
    <>
      <button
        type="button"
        aria-disabled={isDisabled}
        title={disabledReason}
        onClick={() => {
          if (!isDisabled) setOpen(true)
        }}
        className="btn btn-soft btn-secondary btn-sm"
      >
        Save as palette
      </button>

      <dialog
        ref={dialogRef}
        onClose={handleClose}
        onCancel={handleClose}
        className="rounded-lg border border-border bg-popover p-0 text-popover-foreground shadow-lg backdrop:bg-black/40"
      >
        <div className="flex w-96 max-w-full flex-col gap-4 p-6">
          <div>
            <h2 className="text-lg font-semibold">Save scheme as palette</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A new palette will be created with each scheme color&apos;s top paint match.
            </p>
          </div>

          <div className="form-item">
            <label className="form-label text-sm" htmlFor="scheme-palette-name">
              Palette name
            </label>
            <input
              id="scheme-palette-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              className="input input-sm w-full"
              placeholder="My palette"
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
              disabled={isPending || !name.trim()}
              className="btn btn-sm btn-primary"
            >
              {isPending ? 'Saving…' : 'Save palette'}
            </button>
          </div>
        </div>
      </dialog>
    </>
  )
}
