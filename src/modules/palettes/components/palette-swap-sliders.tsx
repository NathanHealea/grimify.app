'use client'

import { Slider } from '@/components/ui/slider'

/**
 * A pair of dual-thumb range sliders for filtering paint candidates by
 * saturation range and lightness range (both 0–100).
 *
 * Each control uses the shadcn {@link Slider} (Radix UI) with two thumbs.
 * A static tick mark shows the source paint's current value on each track.
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
  return (
    <div className="flex flex-col gap-4">
      <SliderControl
        label="Saturation"
        range={sRange}
        currentValue={currentS}
        onChange={(next) => onChange({ sRange: next, lRange })}
      />
      <SliderControl
        label="Lightness"
        range={lRange}
        currentValue={currentL}
        onChange={(next) => onChange({ sRange, lRange: next })}
      />
    </div>
  )
}

function SliderControl({
  label,
  range,
  currentValue,
  onChange,
}: {
  label: string
  range: [number, number]
  currentValue: number
  onChange: (next: [number, number]) => void
}) {
  const [min, max] = range

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">
          {min}–{max}
        </span>
      </div>

      {/* Track wrapper positions the tick mark relative to the slider track */}
      <div className="relative">
        {/* Tick mark for the source paint's current value */}
        <div
          className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 rounded-full bg-primary/50 pointer-events-none z-10"
          style={{ left: `${currentValue}%` }}
          aria-hidden
        />
        <Slider
          min={0}
          max={100}
          step={1}
          value={range}
          onValueChange={(v) => {
            if (v.length === 2) onChange([v[0], v[1]])
          }}
          aria-label={label}
        />
      </div>
    </div>
  )
}
