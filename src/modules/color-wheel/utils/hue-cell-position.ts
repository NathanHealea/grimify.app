/**
 * Cell coordinates within the color wheel: a paint's assigned sector
 * (by Munsell parent index) and its concentric ISCC-NBS lightness band.
 */
export type HueCell = {
  /** 0-based index of the parent Munsell hue in the wheel's `hues` array. */
  parentIndex: number
  /** 0-based child band index, where 0 is the outermost (darkest) band. */
  childIndex: number
  /** Total number of child bands inside the parent slice. */
  totalChildren: number
  /** Total number of parent slices on the wheel. */
  totalParents: number
}

/**
 * Computes an SVG marker position for a paint placed inside its assigned
 * hue cell.
 *
 * The wheel is sliced into `totalParents` equal angular sectors, and each
 * sector is divided radially into `totalChildren` concentric bands. Markers
 * are placed at the cell's centroid, then jittered by a deterministic
 * pseudo-random offset derived from `paintId` so multiple paints in the
 * same cell don't pile on top of each other.
 *
 * @param cell - The paint's hue cell coordinates.
 * @param paintId - Stable id used to seed the jitter so positions are
 *   deterministic across renders.
 * @param outerRadius - Outer radius of the wheel in SVG units.
 * @returns SVG `{ x, y }` coordinates for the marker.
 */
export function hueCellPosition(
  cell: HueCell,
  paintId: string,
  outerRadius: number,
): { x: number; y: number } {
  const sliceArc = 360 / cell.totalParents
  const startAngle = cell.parentIndex * sliceArc
  const endAngle = startAngle + sliceArc

  const bandWidth = outerRadius / cell.totalChildren
  const bandOuter = outerRadius - cell.childIndex * bandWidth
  const bandInner = bandOuter - bandWidth

  const seed = hashString(paintId)
  const angleJitter = (seed[0] - 0.5) * sliceArc * 0.6
  const radialJitter = (seed[1] - 0.5) * bandWidth * 0.5

  const angleDeg = (startAngle + endAngle) / 2 + angleJitter
  const radius = (bandInner + bandOuter) / 2 + radialJitter

  const angleRad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: radius * Math.cos(angleRad),
    y: radius * Math.sin(angleRad),
  }
}

/**
 * Deterministic two-channel pseudo-random in [0, 1) seeded by a string.
 * Uses a 32-bit FNV-like mix for both channels.
 */
function hashString(input: string): [number, number] {
  let h1 = 2166136261
  let h2 = 5381
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 16777619)
    h2 = ((h2 << 5) + h2 + c) | 0
  }
  return [(h1 >>> 0) / 0xffffffff, (h2 >>> 0) / 0xffffffff]
}
