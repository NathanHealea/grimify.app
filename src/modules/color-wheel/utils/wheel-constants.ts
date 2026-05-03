/** Outer radius of the paint content area in SVG units. */
export const WHEEL_RADIUS = 450

/** Outer edge of the light (innermost) band — one-third of {@link WHEEL_RADIUS}. */
export const LIGHT_RADIUS = WHEEL_RADIUS / 3

/** Outer edge of the medium band — two-thirds of {@link WHEEL_RADIUS}. */
export const MEDIUM_RADIUS = (WHEEL_RADIUS * 2) / 3

/** Width of the saturated hue ring in SVG units. */
export const RING_WIDTH = 20

/** Inner edge of the hue ring — flush against the paint content area. */
export const RING_INNER = WHEEL_RADIUS

/** Outer edge of the hue ring. */
export const RING_OUTER = WHEEL_RADIUS + RING_WIDTH

/** Desired gap in SVG units from ring outer edge to the nearest text edge. */
export const LABEL_GAP = 24

/** Approximate SVG units per character at fontSize 14 (used for radial clearance math). */
export const LABEL_CHAR_WIDTH = 8

/** Half-height of a fontSize-14 label in SVG units. */
export const LABEL_HALF_HEIGHT = 7

export const DEG_TO_RAD = Math.PI / 180

/** SVG viewBox at zoom 1: a 1300×1300 square centred on the origin. */
export const VIEW_BOX: [number, number, number, number] = [-650, -650, 1300, 1300]
