/**
 * Munsell principal hue.
 *
 * @remarks One of the 11 top-level rows in the `hues` table (10 chromatic + 1 Neutral).
 */
export type MunsellHue = {
  /** Stable UUID matching the row in `public.hues` (parent_id IS NULL). */
  id: string
  /** Display name (e.g. "Yellow-Red"). */
  name: string
  /** URL-safe slug (e.g. "yellow-red"). */
  slug: string
  /** Reference hex for the principal hue. */
  hex: string
  /** 1-based ordering used for `hues.sort_order`. */
  sortOrder: number
}

/** ISCC-NBS sub-hue reference entry — slug + reference hex used for distance matching. */
export type IsccNbsCatalogEntry = {
  /** Sub-hue slug (e.g. "vivid-red", "white"). */
  slug: string
  /** ISCC-NBS reference hex. */
  hex: string
}

/**
 * Munsell principal hues — top-level rows in the `hues` table.
 *
 * Order is significant: the first 10 entries are the chromatic hues (indices 0–9)
 * and index 10 is Neutral. {@link IsccNbsCatalogEntry} entries in {@link COLOR_CATALOG}
 * are stored in the same order in groups of {@link SUB_HUES_PER_PARENT}.
 */
export const MUNSELL_HUES: MunsellHue[] = [
  { id: 'c77d1779-90c7-4011-89ac-178c9bbbf697', name: 'Red', slug: 'red', hex: '#FF0000', sortOrder: 1 },
  { id: '6724a2fe-600e-44d2-8d13-6483622c162e', name: 'Yellow-Red', slug: 'yellow-red', hex: '#FF8C00', sortOrder: 2 },
  { id: '459269d1-bbe4-42af-b021-f031193ac558', name: 'Yellow', slug: 'yellow', hex: '#FFFF00', sortOrder: 3 },
  { id: '541969d8-4dc1-406d-90f4-035376c3eadc', name: 'Green-Yellow', slug: 'green-yellow', hex: '#9ACD32', sortOrder: 4 },
  { id: 'f08b9676-84eb-4497-b137-a412dc1d384b', name: 'Green', slug: 'green', hex: '#008000', sortOrder: 5 },
  { id: '50f50da8-f6f2-495c-a4fb-ff3fa4ed29b8', name: 'Blue-Green', slug: 'blue-green', hex: '#008080', sortOrder: 6 },
  { id: '7b915eb5-64a3-46f6-9f31-09d78090b8b1', name: 'Blue', slug: 'blue', hex: '#0000FF', sortOrder: 7 },
  { id: 'cdc7e05d-2f37-4d49-8fba-79cbadf032dd', name: 'Purple-Blue', slug: 'purple-blue', hex: '#4B0082', sortOrder: 8 },
  { id: 'a9b6dc8b-c8c4-4e39-b685-3084ab1a6564', name: 'Purple', slug: 'purple', hex: '#800080', sortOrder: 9 },
  { id: '9394e72f-2744-4258-8158-a2673b331f33', name: 'Red-Purple', slug: 'red-purple', hex: '#FF00FF', sortOrder: 10 },
  { id: 'a73fca87-fb09-4924-90a2-4564c0310657', name: 'Neutral', slug: 'neutral', hex: '#808080', sortOrder: 11 },
]

/** Number of ISCC-NBS sub-hues per principal hue. */
export const SUB_HUES_PER_PARENT = 11

/**
 * ISCC-NBS sub-hues with reference hex values (sourced from paintpad.app).
 *
 * Stored in {@link MUNSELL_HUES} order, in groups of {@link SUB_HUES_PER_PARENT}.
 * Use {@link findClosestColor} to map an arbitrary RGB color to the closest
 * sub-hue slug.
 */
export const COLOR_CATALOG: IsccNbsCatalogEntry[] = [
  // Red sub-hues
  { slug: 'vivid-red', hex: '#BE0032' },
  { slug: 'strong-red', hex: '#BC3F4A' },
  { slug: 'deep-red', hex: '#841B2D' },
  { slug: 'very-deep-red', hex: '#5C0923' },
  { slug: 'moderate-red', hex: '#AB4E52' },
  { slug: 'dark-red', hex: '#722F37' },
  { slug: 'very-dark-red', hex: '#3F1728' },
  { slug: 'light-greyish-red', hex: '#AD8884' },
  { slug: 'greyish-red', hex: '#905D5D' },
  { slug: 'dark-greyish-red', hex: '#543D3F' },
  { slug: 'blackish-red', hex: '#2E1D21' },
  // Yellow-Red sub-hues
  { slug: 'vivid-yellow-red', hex: '#F38400' },
  { slug: 'strong-yellow-red', hex: '#E66721' },
  { slug: 'deep-yellow-red', hex: '#AA381E' },
  { slug: 'very-deep-yellow-red', hex: '#593319' },
  { slug: 'moderate-yellow-red', hex: '#F99379' },
  { slug: 'dark-yellow-red', hex: '#6F4E37' },
  { slug: 'very-dark-yellow-red', hex: '#3E322C' },
  { slug: 'light-greyish-yellow-red', hex: '#FFB7A5' },
  { slug: 'greyish-yellow-red', hex: '#C48379' },
  { slug: 'dark-greyish-yellow-red', hex: '#635147' },
  { slug: 'blackish-yellow-red', hex: '#28201C' },
  // Yellow sub-hues
  { slug: 'vivid-yellow', hex: '#F3C300' },
  { slug: 'strong-yellow', hex: '#D4AF37' },
  { slug: 'deep-yellow', hex: '#AF8D13' },
  { slug: 'very-deep-yellow', hex: '#50500B' },
  { slug: 'moderate-yellow', hex: '#C9AE5D' },
  { slug: 'dark-yellow', hex: '#AB9144' },
  { slug: 'very-dark-yellow', hex: '#3B3121' },
  { slug: 'light-greyish-yellow', hex: '#FBC97F' },
  { slug: 'greyish-yellow', hex: '#C2B280' },
  { slug: 'dark-greyish-yellow', hex: '#A18F60' },
  { slug: 'blackish-yellow', hex: '#22221C' },
  // Green-Yellow sub-hues
  { slug: 'vivid-green-yellow', hex: '#DCD300' },
  { slug: 'strong-green-yellow', hex: '#8DB600' },
  { slug: 'deep-green-yellow', hex: '#9B9400' },
  { slug: 'very-deep-green-yellow', hex: '#39500B' },
  { slug: 'moderate-green-yellow', hex: '#E9E450' },
  { slug: 'dark-green-yellow', hex: '#867E36' },
  { slug: 'very-dark-green-yellow', hex: '#403D21' },
  { slug: 'light-greyish-green-yellow', hex: '#EAE679' },
  { slug: 'greyish-green-yellow', hex: '#8C8767' },
  { slug: 'dark-greyish-green-yellow', hex: '#5B5842' },
  { slug: 'blackish-green-yellow', hex: '#25241D' },
  // Green sub-hues
  { slug: 'vivid-green', hex: '#008856' },
  { slug: 'strong-green', hex: '#007959' },
  { slug: 'deep-green', hex: '#00543D' },
  { slug: 'very-deep-green', hex: '#00622D' },
  { slug: 'moderate-green', hex: '#3B7861' },
  { slug: 'dark-green', hex: '#1B4D3E' },
  { slug: 'very-dark-green', hex: '#1C352D' },
  { slug: 'light-greyish-green', hex: '#B6E5AF' },
  { slug: 'greyish-green', hex: '#5E716A' },
  { slug: 'dark-greyish-green', hex: '#3A4B47' },
  { slug: 'blackish-green', hex: '#1A2421' },
  // Blue-Green sub-hues
  { slug: 'vivid-blue-green', hex: '#00FFFF' },
  { slug: 'strong-blue-green', hex: '#17CFCF' },
  { slug: 'deep-blue-green', hex: '#008882' },
  { slug: 'very-deep-blue-green', hex: '#00443F' },
  { slug: 'moderate-blue-green', hex: '#239EBA' },
  { slug: 'dark-blue-green', hex: '#317873' },
  { slug: 'very-dark-blue-green', hex: '#002A29' },
  { slug: 'light-greyish-blue-green', hex: '#96DED1' },
  { slug: 'greyish-blue-green', hex: '#66ADA4' },
  { slug: 'dark-greyish-blue-green', hex: '#415858' },
  { slug: 'blackish-blue-green', hex: '#1C2222' },
  // Blue sub-hues
  { slug: 'vivid-blue', hex: '#00A1C2' },
  { slug: 'strong-blue', hex: '#0067A5' },
  { slug: 'deep-blue', hex: '#00416A' },
  { slug: 'very-deep-blue', hex: '#0B0B50' },
  { slug: 'moderate-blue', hex: '#436B95' },
  { slug: 'dark-blue', hex: '#00304E' },
  { slug: 'very-dark-blue', hex: '#171736' },
  { slug: 'light-greyish-blue', hex: '#A1CAF1' },
  { slug: 'greyish-blue', hex: '#536878' },
  { slug: 'dark-greyish-blue', hex: '#36454F' },
  { slug: 'blackish-blue', hex: '#202830' },
  // Purple-Blue sub-hues
  { slug: 'vivid-purple-blue', hex: '#5500FF' },
  { slug: 'strong-purple-blue', hex: '#5417CF' },
  { slug: 'deep-purple-blue', hex: '#380F8A' },
  { slug: 'very-deep-purple-blue', hex: '#272458' },
  { slug: 'moderate-purple-blue', hex: '#9065CA' },
  { slug: 'dark-purple-blue', hex: '#30267A' },
  { slug: 'very-dark-purple-blue', hex: '#252440' },
  { slug: 'light-greyish-purple-blue', hex: '#B3BCE2' },
  { slug: 'greyish-purple-blue', hex: '#6C79B8' },
  { slug: 'dark-greyish-purple-blue', hex: '#4E5180' },
  { slug: 'blackish-purple-blue', hex: '#1E1C22' },
  // Purple sub-hues
  { slug: 'vivid-purple', hex: '#9A4EAE' },
  { slug: 'strong-purple', hex: '#875692' },
  { slug: 'deep-purple', hex: '#602F6B' },
  { slug: 'very-deep-purple', hex: '#401A4C' },
  { slug: 'moderate-purple', hex: '#86608E' },
  { slug: 'dark-purple', hex: '#563C5C' },
  { slug: 'very-dark-purple', hex: '#301934' },
  { slug: 'light-greyish-purple', hex: '#D399E6' },
  { slug: 'greyish-purple', hex: '#796878' },
  { slug: 'dark-greyish-purple', hex: '#50404D' },
  { slug: 'blackish-purple', hex: '#291E29' },
  // Red-Purple sub-hues
  { slug: 'vivid-red-purple', hex: '#FF0080' },
  { slug: 'strong-red-purple', hex: '#CF1773' },
  { slug: 'deep-red-purple', hex: '#870074' },
  { slug: 'very-deep-red-purple', hex: '#54133B' },
  { slug: 'moderate-red-purple', hex: '#E4717A' },
  { slug: 'dark-red-purple', hex: '#702963' },
  { slug: 'very-dark-red-purple', hex: '#341731' },
  { slug: 'light-greyish-red-purple', hex: '#FFB5BA' },
  { slug: 'greyish-red-purple', hex: '#C08081' },
  { slug: 'dark-greyish-red-purple', hex: '#5D3954' },
  { slug: 'blackish-red-purple', hex: '#221C1F' },
  // Neutral sub-hues
  { slug: 'white', hex: '#FFFFFF' },
  { slug: 'near-white', hex: '#F5F5F5' },
  { slug: 'light-grey', hex: '#B9B8B5' },
  { slug: 'medium-grey', hex: '#848482' },
  { slug: 'dark-grey', hex: '#555555' },
  { slug: 'near-black', hex: '#1A1A1A' },
  { slug: 'black', hex: '#000000' },
  { slug: 'brown', hex: '#8B4513' },
  { slug: 'dark-brown', hex: '#422518' },
  { slug: 'light-brown', hex: '#A67B5B' },
  { slug: 'ivory', hex: '#FFFFF0' },
]

/** HSL hue-angle range mapping to a Munsell principal hue index. */
export type HueAngleRange = {
  /** Inclusive lower bound in degrees. */
  min: number
  /** Exclusive upper bound in degrees. */
  max: number
  /** Index into {@link MUNSELL_HUES}. */
  hueIndex: number
}

/**
 * HSL hue-angle ranges mapping to Munsell principal hue indices.
 *
 * Each range is a half-open interval [min, max) in degrees. Red wraps around
 * 360°/0° and is handled separately in {@link findPrincipalHueIndex}.
 */
export const HUE_ANGLE_RANGES: HueAngleRange[] = [
  { min: 14, max: 44, hueIndex: 1 }, // Yellow-Red
  { min: 44, max: 74, hueIndex: 2 }, // Yellow
  { min: 74, max: 105, hueIndex: 3 }, // Green-Yellow
  { min: 105, max: 157, hueIndex: 4 }, // Green
  { min: 157, max: 200, hueIndex: 5 }, // Blue-Green
  { min: 200, max: 258, hueIndex: 6 }, // Blue
  { min: 258, max: 280, hueIndex: 7 }, // Purple-Blue
  { min: 280, max: 320, hueIndex: 8 }, // Purple
  { min: 320, max: 350, hueIndex: 9 }, // Red-Purple
]

/** HSL saturation (%) below which a color is classified as Neutral. */
export const NEUTRAL_SATURATION_THRESHOLD = 15
