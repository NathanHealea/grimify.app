import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'

/**
 * A single paint assignment on a recipe step.
 *
 * @remarks
 * `position` is the 0-based index within the step and forms part of the
 * unique constraint `(step_id, position)`.
 *
 * `paintId` references the canonical paint regardless of whether the user
 * picked the paint via the recipe's palette. `paletteSlotId` is the optional
 * back-reference to the palette slot the user picked from — when present, it
 * lets future "swap palette" features re-link this step. `paintId` and
 * `paletteSlotId` should agree when both are present (enforced in app code
 * on insert/update).
 *
 * `paint` is the embedded {@link ColorWheelPaint} loaded by hydrated reads;
 * it is absent on lightweight summaries.
 */
export type RecipeStepPaint = {
  /** UUID primary key. */
  id: string
  /** UUID of the parent step. */
  stepId: string
  /** 0-based slot index within the step. */
  position: number
  /** UUID of the referenced paint. */
  paintId: string
  /** UUID of the originating palette slot, or `null` if not chosen from a palette. */
  paletteSlotId: string | null
  /** Free-form mix ratio (e.g. `"50/50 with Lahmian Medium"`); `null` when not set. */
  ratio: string | null
  /** Per-paint note for this step; `null` when not set. Max 500 characters. */
  note: string | null
  /** Full paint data, present when loaded via {@link Recipe} hydration. */
  paint?: ColorWheelPaint
}
