'use client'

import { useCallback, useState } from 'react'

import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'

/** Return shape of {@link useWheelPaintSelection}. */
export interface WheelPaintSelectionState {
  /** The currently selected paint, or `null` when no paint is selected. */
  selectedPaint: ColorWheelPaint | null
  /** Select a paint to display in the detail panel. */
  handlePaintClick: (paint: ColorWheelPaint) => void
  /** Clear the current selection, closing the detail panel. */
  clearSelection: () => void
}

/**
 * Manages click-to-detail selection state for the color wheel.
 *
 * Pass `handlePaintClick` to each `PaintMarker`'s `onClick` prop.
 * Render `PaintDetailPanel` when `selectedPaint` is non-null, passing
 * `clearSelection` as the `onClose` handler.
 *
 * @returns {@link WheelPaintSelectionState}
 */
export function useWheelPaintSelection(): WheelPaintSelectionState {
  const [selectedPaint, setSelectedPaint] = useState<ColorWheelPaint | null>(null)

  const handlePaintClick = useCallback((paint: ColorWheelPaint) => {
    setSelectedPaint(paint)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedPaint(null)
  }, [])

  return { selectedPaint, handlePaintClick, clearSelection }
}
