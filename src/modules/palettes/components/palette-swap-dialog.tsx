'use client'

import { useEffect, useRef, useState, useTransition } from 'react'

import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'
import { getHueSwapCandidates } from '@/modules/palettes/actions/get-hue-swap-candidates'
import { swapPalettePaint } from '@/modules/palettes/actions/swap-palette-paint'
import { PaletteSwapCandidateCard } from '@/modules/palettes/components/palette-swap-candidate-card'
import { PaletteSwapSliders } from '@/modules/palettes/components/palette-swap-sliders'
import { filterPaintsByHslRange } from '@/modules/palettes/utils/filter-paints-by-hsl-range'
import { rankPaintsByDeltaE } from '@/modules/palettes/utils/rank-paints-by-delta-e'

/**
 * Modal dialog for replacing a palette slot's paint with a same-hue candidate.
 *
 * On open, fetches same-hue candidates from the server. Saturation and
 * lightness sliders narrow the set; candidates are re-ranked by CIE76 ΔE
 * entirely client-side after the initial fetch. Selecting a candidate calls
 * {@link swapPalettePaint} and notifies the parent via `onSwapped`.
 *
 * @param props.paletteId - UUID of the owning palette.
 * @param props.position - 0-based slot index to swap.
 * @param props.paint - The current slot's paint (must have non-null `hue_id`).
 * @param props.open - Whether the dialog is visible.
 * @param props.onClose - Called when the dialog closes.
 * @param props.onSwapped - Called after a successful swap (before `onClose`).
 */
export function PaletteSwapDialog({
  paletteId,
  position,
  paint,
  open,
  onClose,
  onSwapped,
}: {
  paletteId: string
  position: number
  paint: ColorWheelPaint
  open: boolean
  onClose: () => void
  onSwapped: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [isPending, startTransition] = useTransition()

  // Candidate data loaded from the server on open
  const [candidates, setCandidates] = useState<ColorWheelPaint[]>([])
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set())
  const [hueGroupName, setHueGroupName] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [swapError, setSwapError] = useState<string | null>(null)

  // Slider state — default to full range
  const [sRange, setSRange] = useState<[number, number]>([0, 100])
  const [lRange, setLRange] = useState<[number, number]>([0, 100])
  const [ownedOnly, setOwnedOnly] = useState(false)

  // Open/close the native dialog element
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  // Fetch candidates when the dialog opens
  useEffect(() => {
    if (!open) return
    let cancelled = false

    setLoading(true)
    setFetchError(null)
    setCandidates([])

    getHueSwapCandidates({ paletteId, position }).then((result) => {
      if (cancelled) return
      setLoading(false)
      if ('error' in result) {
        setFetchError(result.error)
        return
      }
      setCandidates(result.candidates)
      setOwnedIds(new Set(result.ownedIds))
      setHueGroupName(result.hueGroupName)
    })

    return () => {
      cancelled = true
    }
  }, [open, paletteId, position])

  function handleClose() {
    setSwapError(null)
    onClose()
  }

  function handleSelect(paintId: string) {
    setSwapError(null)
    startTransition(async () => {
      const result = await swapPalettePaint(paletteId, position, paintId)
      if (result?.error) {
        setSwapError(result.error)
        return
      }
      onSwapped()
      handleClose()
    })
  }

  // Compute visible candidates purely client-side
  const filtered = filterPaintsByHslRange(candidates, {
    sMin: sRange[0],
    sMax: sRange[1],
    lMin: lRange[0],
    lMax: lRange[1],
  })
  const afterOwned = ownedOnly ? filtered.filter((p) => ownedIds.has(p.id)) : filtered
  const visible = rankPaintsByDeltaE(paint.hex, afterOwned, 40)

  const showOwnedToggle = ownedIds.size > 0

  return (
    <dialog
      ref={dialogRef}
      onClose={handleClose}
      onCancel={handleClose}
      className="rounded-lg border border-border bg-popover p-0 text-popover-foreground shadow-lg backdrop:bg-black/40 w-full max-w-lg"
    >
      <div className="flex flex-col gap-4 p-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className="size-8 shrink-0 rounded-sm"
            style={{ backgroundColor: paint.hex }}
            aria-hidden
          />
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">{paint.name}</h2>
            {hueGroupName && (
              <p className="text-xs text-muted-foreground">Hue group: {hueGroupName}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="btn btn-ghost btn-xs btn-square ml-auto"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Sliders */}
        <PaletteSwapSliders
          sRange={sRange}
          lRange={lRange}
          currentS={paint.saturation}
          currentL={paint.lightness}
          onChange={({ sRange: s, lRange: l }) => {
            setSRange(s)
            setLRange(l)
          }}
        />

        {/* Owned-only toggle */}
        {showOwnedToggle && (
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={ownedOnly}
              onChange={(e) => setOwnedOnly(e.target.checked)}
              className="checkbox checkbox-sm"
            />
            Owned only
          </label>
        )}

        {/* Swap error */}
        {swapError && (
          <div
            role="alert"
            aria-live="polite"
            className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {swapError}
          </div>
        )}

        {/* Candidate grid */}
        <div className="max-h-80 overflow-y-auto">
          {loading && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          )}

          {!loading && fetchError && (
            <p className="text-sm text-destructive">{fetchError}</p>
          )}

          {!loading && !fetchError && visible.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {ownedOnly
                ? 'No paints in your collection match these ranges.'
                : 'No same-hue paints match these ranges. Try widening saturation or lightness.'}
            </p>
          )}

          {!loading && !fetchError && visible.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {visible.map(({ paint: candidate, deltaE }) => (
                <PaletteSwapCandidateCard
                  key={candidate.id}
                  paint={candidate}
                  deltaE={deltaE}
                  isOwned={ownedIds.has(candidate.id)}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="btn btn-sm btn-ghost"
          >
            Cancel
          </button>
        </div>
      </div>
    </dialog>
  )
}
