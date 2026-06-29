import type { CSSProperties } from 'react'
import { hexToRgb, rgbToHsl } from '@/lib/color-utils'

/**
 * Paint types that use a horizontal tint gradient (speedpaint-style: thin-to-pooled).
 *
 * Keyed against the stored `paint_type` values (lowercase, as written by `generate-seed.ts`).
 */
const SPEEDPAINT_TYPES = new Set([
  'speedpaint',
  'speedpaint metallic',
])

/**
 * Paint types that use a vertical pooling gradient (shade/wash/ink/contrast style:
 * light thin-film at top, full pool color at bottom).
 *
 * Keyed against the stored `paint_type` values (lowercase).
 */
const POOLING_TRANSLUCENT_TYPES = new Set([
  // Citadel
  'shade',
  'contrast',
  // Army Painter
  'fanatic wash',
  'warpaints wash',
  // Vallejo
  'game color ink',
  'game color wash',
  'model wash',
  'xpress color',
  // Scale75
  'inktensity',
])

/**
 * Returns a CSS `background` (gradient) or `backgroundColor` (solid) style for a paint swatch.
 *
 * Applies a CSS gradient to paints whose flat hex does not represent their
 * on-model appearance. Precedence order:
 *
 * 1. **Speedpaint family** → horizontal `90deg` gradient: 10% tint (near white) → full color.
 *    Mimics the thin-to-pooled application of a one-coat speedpaint.
 * 2. **Metallic** (`is_metallic = true`, non-speedpaint) → diagonal `135deg` sheen:
 *    highlight → base → shadow, varying lightness by ±25 / −18 points.
 * 3. **Pooling translucent** (shade, wash, ink, contrast, xpress) → vertical gradient:
 *    same hue & saturation, lightness lerped 53% toward white at the top → full
 *    pool lightness at the bottom.
 * 4. **Everything else** → unchanged solid `backgroundColor: hex`.
 *
 * Gradients degrade gracefully: lightness stops are clamped to [0, 100], and
 * a missing or invalid hex falls back to a solid background.
 *
 * @param hex - The paint's hex color string (e.g. `"#FF8C00"`).
 * @param paintType - The `paint_type` value from the database (case-insensitive), or `null`.
 * @param isMetallic - Whether the paint is flagged as metallic.
 * @returns A `CSSProperties` object suitable for a `style` prop (`{ background }` or `{ backgroundColor }`).
 *
 * @remarks
 * The 53% lightness lerp factor for pooling gradients is calibrated against:
 * Citadel Agrax Earthshade — L=21.08 → top stop ≈ 63.24 (`21.08 + 78.92 × 0.53`).
 *
 * The 10% tint blend for speedpaints is calibrated against:
 * Army Painter Speedpaint example — light stop ≈ `rgb(94.65%, 95.61%, 96.02%)` from a
 * base color of approximately `rgb(44.18%, 54.20%, 58.49%)` (i.e. `0.9 × 255 + 0.1 × channel`).
 */
export function paintSwatchBackground(
  hex: string,
  paintType: string | null,
  isMetallic: boolean,
): CSSProperties {
  const normalizedType = paintType?.toLowerCase() ?? null

  // Speedpaint family → horizontal tint gradient
  if (normalizedType && SPEEDPAINT_TYPES.has(normalizedType)) {
    const rgb = hexToRgb(hex)
    if (!rgb) return { backgroundColor: hex }
    const { r, g, b } = rgb
    const lightR = clamp(Math.round(0.9 * 255 + 0.1 * r))
    const lightG = clamp(Math.round(0.9 * 255 + 0.1 * g))
    const lightB = clamp(Math.round(0.9 * 255 + 0.1 * b))
    const lightPct = (v: number) => `${((v / 255) * 100).toFixed(2)}%`
    return {
      background: `linear-gradient(90deg, rgb(${lightPct(lightR)}, ${lightPct(lightG)}, ${lightPct(lightB)}), rgb(${lightPct(r)}, ${lightPct(g)}, ${lightPct(b)}))`,
    }
  }

  // Metallic → diagonal sheen gradient
  if (isMetallic) {
    const rgb = hexToRgb(hex)
    if (!rgb) return { backgroundColor: hex }
    const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b)
    const highlight = clamp(l + 25, 0, 100)
    const shadow = clamp(l - 18, 0, 100)
    return {
      background: `linear-gradient(135deg, hsl(${h}, ${s}%, ${highlight}%), hsl(${h}, ${s}%, ${l}%), hsl(${h}, ${s}%, ${shadow}%))`,
    }
  }

  // Pooling translucent → vertical pooling gradient
  if (normalizedType && POOLING_TRANSLUCENT_TYPES.has(normalizedType)) {
    const rgb = hexToRgb(hex)
    if (!rgb) return { backgroundColor: hex }
    const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b)
    const topL = clamp(Math.round(l + (100 - l) * 0.53))
    return {
      background: `linear-gradient(hsl(${h}, ${s}%, ${topL}%), hsl(${h}, ${s}%, ${l}%))`,
    }
  }

  // Opaque non-metallic → solid fill
  return { backgroundColor: hex }
}

function clamp(value: number, min = 0, max = 255): number {
  return Math.min(max, Math.max(min, value))
}
