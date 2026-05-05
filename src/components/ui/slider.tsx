'use client'

import type { ComponentProps } from 'react'

import * as SliderPrimitive from '@radix-ui/react-slider'

import { cn } from '@/lib/utils'

/**
 * Accessible range slider built on Radix UI Slider.
 *
 * Supports single and multi-thumb (range) configurations. For a range slider,
 * pass a two-element array to `value` / `defaultValue`.
 *
 * Styled with `.range`, `.range-track`, `.range-range`, and `.range-thumb`
 * CSS classes from `src/styles/slider.css`. Pass size or color modifier classes
 * (e.g. `range-sm`, `range-primary`) via `className` on the root.
 *
 * @param props - All props from {@link SliderPrimitive.Root}.
 */
function Slider({ className, ...props }: ComponentProps<typeof SliderPrimitive.Root>) {
  const thumbCount = Array.isArray(props.value)
    ? props.value.length
    : Array.isArray(props.defaultValue)
      ? props.defaultValue.length
      : 1

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn('range', className)}
      {...props}
    >
      <SliderPrimitive.Track className="range-track">
        <SliderPrimitive.Range className="range-range" />
      </SliderPrimitive.Track>
      {Array.from({ length: thumbCount }).map((_, i) => (
        <SliderPrimitive.Thumb key={i} className="range-thumb" />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
