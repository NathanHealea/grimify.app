'use client'

import { useEffect, useState, useTransition } from 'react'
import { Info } from 'lucide-react'

import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { getHueSwapCandidates } from '@/modules/palettes/actions/get-hue-swap-candidates'
import { swapPalettePaint } from '@/modules/palettes/actions/swap-palette-paint'
import { PaletteSwapCandidateCard } from '@/modules/palettes/components/palette-swap-candidate-card'
import { PaletteSwapSliders } from '@/modules/palettes/components/palette-swap-sliders'
import { filterPaintsByHslRange } from '@/modules/palettes/utils/filter-paints-by-hsl-range'
import { rankPaintsByDeltaE } from '@/modules/palettes/utils/rank-paints-by-delta-e'

type FetchState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'success'
      candidates: ColorWheelPaint[]
      ownedIds: Set<string>
      hueGroupName: string
    }

/**
 * Full-screen modal dialog for replacing a palette slot's paint with a same-hue candidate.
 *
 * Rendered only while the swap UI is open — the parent conditionally mounts this
 * component so state resets automatically on each open. The dialog opens immediately
 * on mount via a controlled `open` prop set to `true`.
 *
 * On mount, fetches same-hue candidates from the server. Saturation and lightness
 * sliders narrow the set; candidates are re-ranked by CIE76 ΔE entirely client-side.
 * An info popover explains how the filters and ΔE score work.
 *
 * @param props.paletteId - UUID of the owning palette.
 * @param props.position - 0-based slot index to swap.
 * @param props.paint - The current slot's paint (must have non-null `hue_id`).
 * @param props.onClose - Called when the dialog closes.
 * @param props.onSwapped - Called after a successful swap (before `onClose`).
 */
export function PaletteSwapDialog({
  paletteId,
  position,
  paint,
  onClose,
  onSwapped,
}: {
  paletteId: string
  position: number
  paint: ColorWheelPaint
  onClose: () => void
  onSwapped: () => void
}) {
  const [isPending, startTransition] = useTransition()

  const [fetchState, setFetchState] = useState<FetchState>({ status: 'loading' })
  const [swapError, setSwapError] = useState<string | null>(null)

  const [sRange, setSRange] = useState<[number, number]>([0, 100])
  const [lRange, setLRange] = useState<[number, number]>([0, 100])
  const [ownedOnly, setOwnedOnly] = useState(false)

  // Fetch candidates on mount — setState only in the async callback, never synchronously
  useEffect(() => {
    let cancelled = false

    getHueSwapCandidates({ paletteId, position }).then((result) => {
      if (cancelled) return
      if ('error' in result) {
        setFetchState({ status: 'error', message: result.error })
      } else {
        setFetchState({
          status: 'success',
          candidates: result.candidates,
          ownedIds: new Set(result.ownedIds),
          hueGroupName: result.hueGroupName,
        })
      }
    })

    return () => {
      cancelled = true
    }
  }, [paletteId, position])

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

  const hueGroupName = fetchState.status === 'success' ? fetchState.hueGroupName : ''
  const candidates = fetchState.status === 'success' ? fetchState.candidates : []
  const ownedIds = fetchState.status === 'success' ? fetchState.ownedIds : new Set<string>()

  const filtered = filterPaintsByHslRange(candidates, {
    sMin: sRange[0],
    sMax: sRange[1],
    lMin: lRange[0],
    lMax: lRange[1],
  })
  const afterOwned = ownedOnly ? filtered.filter((p) => ownedIds.has(p.id)) : filtered
  const visible = rankPaintsByDeltaE(paint.hex, afterOwned, 40)

  return (
    <Dialog open onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-full h-full rounded-none sm:rounded-lg sm:max-w-2xl sm:h-[90vh] p-0"
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-4 shrink-0">
          <div
            className="size-9 shrink-0 rounded-md"
            style={{ backgroundColor: paint.hex }}
            aria-hidden
          />
          <DialogHeader className="min-w-0 flex-1">
            <DialogTitle className="truncate">{paint.name}</DialogTitle>
            {hueGroupName && (
              <p className="text-xs text-muted-foreground">Hue group: {hueGroupName}</p>
            )}
          </DialogHeader>
          <button
            type="button"
            onClick={handleClose}
            className="btn btn-ghost btn-xs btn-square shrink-0"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4 flex-1">
          {/* Filter controls */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Filters
              </span>
              <SliderInfoPopover />
            </div>

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

            {ownedIds.size > 0 && (
              <label className="flex cursor-pointer select-none items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={ownedOnly}
                  onChange={(e) => setOwnedOnly(e.target.checked)}
                  className="checkbox checkbox-sm"
                />
                Owned only
              </label>
            )}
          </div>

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
          <div>
            {fetchState.status === 'loading' && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            )}

            {fetchState.status === 'error' && (
              <p className="text-sm text-destructive">{fetchState.message}</p>
            )}

            {fetchState.status === 'success' && visible.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {ownedOnly
                  ? 'No paints in your collection match these ranges.'
                  : 'No same-hue paints match these ranges. Try widening saturation or lightness.'}
              </p>
            )}

            {fetchState.status === 'success' && visible.length > 0 && (
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
        </div>

        {/* Footer */}
        <DialogFooter className="border-t border-border px-5 py-3 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="btn btn-sm btn-ghost"
          >
            Cancel
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Info popover explaining how the saturation/lightness sliders and ΔE score work.
 */
function SliderInfoPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="btn btn-ghost btn-xs btn-square"
          aria-label="How filters work"
        >
          <Info className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="left" align="start" className="w-80">
        <div className="flex flex-col gap-3 text-sm">
          <div>
            <p className="font-medium">Saturation &amp; Lightness</p>
            <p className="mt-1 text-muted-foreground">
              Each slider has two handles defining a range. Drag the left handle to set the
              minimum and the right to set the maximum. Only paints whose saturation or lightness
              falls inside both ranges are shown. The tick mark on each track shows where your
              current paint sits.
            </p>
          </div>
          <div>
            <p className="font-medium">
              ΔE <span className="font-normal text-muted-foreground">(Delta E)</span>
            </p>
            <p className="mt-1 text-muted-foreground">
              A perceptual color-distance score. Lower means more similar to your current paint:
            </p>
            <ul className="mt-1.5 space-y-0.5 text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">&lt; 2</span> — nearly identical
              </li>
              <li>
                <span className="font-medium text-foreground">2–5</span> — very close match
              </li>
              <li>
                <span className="font-medium text-foreground">5–10</span> — noticeable but similar
              </li>
              <li>
                <span className="font-medium text-foreground">&gt; 10</span> — clearly different
              </li>
            </ul>
            <p className="mt-2 text-muted-foreground">
              Candidates are sorted by ΔE so the closest match appears first.
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
