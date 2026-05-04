'use client'

import { Button } from '@/components/ui/button'
import type { ColorScheme } from '@/modules/color-wheel/types/color-scheme'

const SCHEMES: { value: ColorScheme; label: string }[] = [
  { value: 'complementary', label: 'Complementary' },
  { value: 'split-complementary', label: 'Split-Comp' },
  { value: 'analogous', label: 'Analogous' },
  { value: 'triadic', label: 'Triadic' },
  { value: 'tetradic', label: 'Tetradic' },
]

/**
 * Tab strip for selecting a color harmony scheme type, with an optional spread slider for analogous schemes.
 *
 * @param props.value - Currently active scheme.
 * @param props.onChange - Called when the user picks a different scheme.
 * @param props.analogousAngle - Current spread angle in degrees (15–60).
 * @param props.onAnalogousAngleChange - Called when the spread slider changes.
 */
export function SchemeTypeSelector({
  value,
  onChange,
  analogousAngle,
  onAnalogousAngleChange,
}: {
  value: ColorScheme
  onChange: (scheme: ColorScheme) => void
  analogousAngle: number
  onAnalogousAngleChange: (angle: number) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1">
        {SCHEMES.map((s) => (
          <Button
            key={s.value}
            className={value === s.value ? 'btn-primary' : 'btn-ghost'}
            onClick={() => onChange(s.value)}
          >
            {s.label}
          </Button>
        ))}
      </div>

      {value === 'analogous' && (
        <label className="flex items-center gap-3 text-sm">
          <span className="w-24 shrink-0 text-muted-foreground">
            Spread: {analogousAngle}°
          </span>
          <input
            type="range"
            min={15}
            max={60}
            step={1}
            value={analogousAngle}
            onChange={(e) => onAnalogousAngleChange(Number(e.target.value))}
            className="w-48 accent-primary"
            aria-label={`Analogous spread angle: ${analogousAngle}°`}
          />
        </label>
      )}
    </div>
  )
}
