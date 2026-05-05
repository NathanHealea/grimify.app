import { hexToRgb } from './hex-to-hsl'

/** CIE L*a*b* color triple (D65 illuminant). */
export type Lab = { L: number; a: number; b: number }

/**
 * Converts a 6-digit hex color to CIE L*a*b* using the D65 white point.
 *
 * Pipeline: sRGB → linearized sRGB → XYZ (D65) → CIE Lab.
 *
 * @param hex - Hex color string (e.g. `"#FF8C00"` or `"FF8C00"`).
 * @returns CIE Lab triple.
 */
export function hexToLab(hex: string): Lab {
  const { r, g, b } = hexToRgb(hex)

  // Linearize sRGB channels (0–1)
  const linearize = (c: number): number => {
    const v = c / 255
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  const lr = linearize(r)
  const lg = linearize(g)
  const lb = linearize(b)

  // sRGB → XYZ (D65, IEC 61966-2-1)
  const x = (lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375) / 0.95047
  const y = (lr * 0.2126729 + lg * 0.7151522 + lb * 0.072175) / 1.0
  const z = (lr * 0.0193339 + lg * 0.119192 + lb * 0.9503041) / 1.08883

  // XYZ → Lab
  const f = (t: number): number =>
    t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116

  const fx = f(x)
  const fy = f(y)
  const fz = f(z)

  return {
    L: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  }
}
