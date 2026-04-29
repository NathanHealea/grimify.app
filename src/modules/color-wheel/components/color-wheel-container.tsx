'use client'

import { useState } from 'react'

import { cn } from '@/lib/utils'
import type { ColorWheelHue } from '@/modules/color-wheel/types/color-wheel-hue'
import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'
import { HslColorWheel } from './hsl-color-wheel'
import { MunsellColorWheel } from './munsell-color-wheel'

type WheelView = 'munsell' | 'hsl'

/**
 * Client wrapper that hosts both the Munsell and HSL color wheel variants and
 * provides a toggle button to switch between them.
 *
 * Paint and hue data are fetched once on the server and passed as props here.
 * Switching views is purely client-side — no navigation or data reload occurs.
 *
 * @param paints - All paints to plot on the wheel, fetched server-side.
 * @param hues - Munsell hue tree for the Munsell wheel, fetched server-side.
 */
export function ColorWheelContainer({
  paints,
  hues,
}: {
  paints: ColorWheelPaint[]
  hues: ColorWheelHue[]
}) {
  const [view, setView] = useState<WheelView>('munsell')

  return (
    <div className="flex h-full w-full flex-col items-center gap-4 p-4">
      <div className="flex gap-1 rounded-lg border border-border p-1">
        <button
          type="button"
          onClick={() => setView('munsell')}
          className={cn('btn btn-sm', view === 'munsell' ? 'btn-primary' : 'btn-ghost')}
        >
          Munsell
        </button>
        <button
          type="button"
          onClick={() => setView('hsl')}
          className={cn('btn btn-sm', view === 'hsl' ? 'btn-primary' : 'btn-ghost')}
        >
          HSL
        </button>
      </div>

      {view === 'munsell' ? (
        <MunsellColorWheel paints={paints} hues={hues} />
      ) : (
        <HslColorWheel paints={paints} />
      )}
    </div>
  )
}
