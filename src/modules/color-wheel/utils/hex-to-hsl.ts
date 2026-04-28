/** RGB color triple with each channel in 0–255. */
export type Rgb = { r: number; g: number; b: number }

/** HSL color triple with hue 0–360, saturation 0–100, lightness 0–100. */
export type Hsl = { h: number; s: number; l: number }

/**
 * Parses a 6-digit hex color (with or without leading `#`) into 0–255 RGB channels.
 *
 * @param hex - Hex color string (e.g. `"#FF8C00"` or `"FF8C00"`).
 * @returns RGB channel values.
 */
export function hexToRgb(hex: string): Rgb {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  }
}

/**
 * Converts 0–255 RGB channels to HSL.
 *
 * Hue is reported in degrees on [0, 360); saturation and lightness are
 * percentages on [0, 100].
 *
 * @param r - Red channel (0–255).
 * @param g - Green channel (0–255).
 * @param b - Blue channel (0–255).
 * @returns HSL representation of the color.
 */
export function rgbToHsl(r: number, g: number, b: number): Hsl {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l: l * 100 }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return { h: h * 360, s: s * 100, l: l * 100 }
}

/**
 * Convenience wrapper that converts a hex color directly to HSL plus its
 * intermediate RGB channels (useful when callers also need RGB for distance
 * comparisons against the {@link COLOR_CATALOG}).
 *
 * @param hex - Hex color string.
 * @returns Combined RGB + HSL representation.
 */
export function hexToHsl(hex: string): Rgb & Hsl {
  const rgb = hexToRgb(hex)
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
  return { ...rgb, ...hsl }
}
