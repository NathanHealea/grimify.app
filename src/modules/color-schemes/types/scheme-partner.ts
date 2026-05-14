import type { ColorWheelPaint } from '@/modules/color-wheel/types/color-wheel-paint'

/**
 * A non-base partner color in a scheme, paired with its value-scale paint matches.
 *
 * Partners are everything {@link generateScheme} returns *except* the entry labelled `Base`.
 *
 * @property label - The display label produced by `generateScheme` (e.g. `Complement`, `Split 1`, `Analogous −30°`).
 * @property hue - The partner's hue in degrees (0–360).
 * @property paints - Up to five catalog paints matched by `findValueScaleNearestPaints`, ordered light→dark.
 */
export type SchemePartner = {
  label: string
  hue: number
  paints: ColorWheelPaint[]
}
