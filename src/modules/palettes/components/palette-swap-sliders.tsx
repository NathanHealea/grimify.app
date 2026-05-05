'use client'

import { useId } from 'react'

/**
 * A pair of dual-thumb range sliders for filtering paint candidates by
 * saturation range and lightness range (both 0–100).
 *
 * Each "dual-thumb" control is implemented with two overlapping
 * `<input type="range">` elements sharing the same track via CSS.
 * No external slider dependency is required.
 *
 * @param props.sRange - Current saturation range `[min, max]`.
 * @param props.lRange - Current lightness range `[min, max]`.
 * @param props.currentS - Source paint's saturation (renders a tick mark on the track).
 * @param props.currentL - Source paint's lightness (renders a tick mark on the track).
 * @param props.onChange - Called with updated ranges when either slider moves.
 */
export function PaletteSwapSliders({
  sRange,
  lRange,
  currentS,
  currentL,
  onChange,
}: {
  sRange: [number, number]
  lRange: [number, number]
  currentS: number
  currentL: number
  onChange: (next: { sRange: [number, number]; lRange: [number, number] }) => void
}) {
  const sId = useId()
  const lId = useId()

  return (
    <div className="flex flex-col gap-4">
      <SliderControl
        id={sId}
        label="Saturation"
        range={sRange}
        currentValue={currentS}
        onChange={(next) => onChange({ sRange: next, lRange })}
      />
      <SliderControl
        id={lId}
        label="Lightness"
        range={lRange}
        currentValue={currentL}
        onChange={(next) => onChange({ sRange, lRange: next })}
      />
    </div>
  )
}

function SliderControl({
  id,
  label,
  range,
  currentValue,
  onChange,
}: {
  id: string
  label: string
  range: [number, number]
  currentValue: number
  onChange: (next: [number, number]) => void
}) {
  const [min, max] = range
  const tickPercent = currentValue

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <label htmlFor={`${id}-min`} className="text-xs font-medium text-muted-foreground">
          {label}
        </label>
        <span className="text-xs text-muted-foreground">
          {min}–{max}
        </span>
      </div>

      {/* Track container — positions two range inputs on top of each other */}
      <div className="relative h-5" style={{ position: 'relative' }}>
        {/* Tick mark for the source paint's current value */}
        <div
          className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 rounded-full bg-primary/60 pointer-events-none z-10"
          style={{ left: `${tickPercent}%` }}
          aria-hidden
        />

        {/* Min thumb */}
        <input
          id={`${id}-min`}
          type="range"
          min={0}
          max={100}
          value={min}
          onChange={(e) => {
            const v = Number(e.target.value)
            onChange([Math.min(v, max), max])
          }}
          className="range-thumb absolute inset-0 w-full appearance-none bg-transparent"
          aria-label={`${label} minimum`}
        />

        {/* Max thumb */}
        <input
          id={`${id}-max`}
          type="range"
          min={0}
          max={100}
          value={max}
          onChange={(e) => {
            const v = Number(e.target.value)
            onChange([min, Math.max(v, min)])
          }}
          className="range-thumb absolute inset-0 w-full appearance-none bg-transparent"
          aria-label={`${label} maximum`}
        />
      </div>
    </div>
  )
}
