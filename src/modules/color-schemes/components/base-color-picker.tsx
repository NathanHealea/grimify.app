'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'
import { hexToHsl } from '@/modules/color-wheel/utils/hex-to-hsl'
import { PaintCombobox } from '@/modules/paints/components/paint-combobox'
import type { BaseColor } from '@/modules/color-schemes/types/base-color'

const HEX_RE = /^#?([0-9a-fA-F]{6})$/

type Mode = 'search' | 'custom'

/**
 * Dual-mode color picker for selecting a scheme base color.
 *
 * Supports two input modes toggled by a button group:
 * - **Search Paints** — shows {@link PaintCombobox} until a paint is chosen, then
 *   displays the selection inline with a clear button.
 * - **Custom Color** — accepts a 6-digit hex value and derives HSL via {@link hexToHsl}.
 *
 * @param props.paints - Full paint list to search against.
 * @param props.value - Currently selected base color, or null.
 * @param props.onChange - Called with the new {@link BaseColor} on selection, or null to clear.
 */
export function BaseColorPicker({
  paints,
  value,
  onChange,
}: {
  paints: ColorWheelPaint[]
  value: BaseColor | null
  onChange: (color: BaseColor | null) => void
}) {
  const [mode, setMode] = useState<Mode>('search')
  const [hexInput, setHexInput] = useState('')

  function selectPaint(paint: ColorWheelPaint) {
    onChange({
      hue: paint.hue,
      saturation: paint.saturation,
      lightness: paint.lightness,
      hex: paint.hex,
      name: paint.name,
    })
  }

  function handleHexChange(raw: string) {
    setHexInput(raw)
    const match = HEX_RE.exec(raw)
    if (!match) return
    const hex = `#${match[1].toLowerCase()}`
    const { h, s, l } = hexToHsl(hex)
    onChange({ hue: h, saturation: s, lightness: l, hex })
  }

  const hexPreviewColor = (() => {
    const match = HEX_RE.exec(hexInput)
    return match ? `#${match[1]}` : null
  })()

  return (
    <div className="flex flex-col gap-3">
      {/* Mode toggle */}
      <div className="flex gap-1">
        <Button
          className={mode === 'search' ? 'btn-primary' : 'btn-ghost'}
          onClick={() => setMode('search')}
        >
          Search Paints
        </Button>
        <Button
          className={mode === 'custom' ? 'btn-primary' : 'btn-ghost'}
          onClick={() => setMode('custom')}
        >
          Custom Color
        </Button>
      </div>

      {mode === 'search' && (
        value ? (
          <InputGroup>
            <InputGroupAddon>
              <span
                className="inline-block size-4 rounded border border-border shrink-0"
                style={{ backgroundColor: value.hex }}
                aria-hidden="true"
              />
            </InputGroupAddon>
            <InputGroupInput value={value.name ?? value.hex} readOnly />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                aria-label="Clear selection"
                title="Clear"
                size="icon-xs"
                onClick={() => onChange(null)}
              >
                <X className="size-4" />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        ) : (
          <PaintCombobox paints={paints} onSelect={selectPaint} />
        )
      )}

      {mode === 'custom' && (
        <div className="flex items-center gap-3">
          <Input
            type="text"
            placeholder="#RRGGBB"
            value={hexInput}
            onChange={(e) => handleHexChange(e.target.value)}
            className="max-w-40 font-mono"
          />
          {hexPreviewColor && (
            <span
              className="inline-block size-8 rounded border border-border"
              style={{ backgroundColor: hexPreviewColor }}
              aria-label={`Preview: ${hexPreviewColor}`}
            />
          )}
        </div>
      )}
    </div>
  )
}
