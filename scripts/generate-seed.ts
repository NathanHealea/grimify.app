import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

// ---------------------------------------------------------------------------
// Types for the JSON data structures
// ---------------------------------------------------------------------------

interface BrandJson {
  id: string
  name: string
  icon: string
  color: string
  types: string[]
}

interface ComparableJson {
  id: string
  name: string
}

interface PaintJson {
  id: string
  name: string
  hex: string
  type: string
  description: string
  comparable: ComparableJson[]
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = resolve(__dirname, 'data')
const OUTPUT_FILE = resolve(__dirname, '..', 'supabase', 'seed.sql')

/** Brand website URLs (not present in the JSON data). */
const BRAND_WEBSITES: Record<string, string> = {
  citadel: 'https://www.games-workshop.com',
  'army-painter': 'https://thearmypainter.com',
  vallejo: 'https://acrylicosvallejo.com',
  'green-stuff-world': 'https://www.greenstuffworld.com',
  'ak-interactive': 'https://ak-interactive.com',
}

/**
 * Paintpad.app-sourced hue overrides keyed by paint JSON id.
 * When present, the sub-hue slug from paintpad takes precedence over
 * the algorithmic `findClosestColor()` result.
 */
interface HueOverride {
  subHueSlug: string
  principalHue: string
  paintpadPage: string
  paintpadSection: string
  paintpadSectionHex: string | null
}

interface HueOverridesFile {
  overrides: Record<string, HueOverride>
}

const HUE_OVERRIDES_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  'data',
  'hue-overrides.json'
)

let hueOverrides: Record<string, HueOverride> = {}
try {
  const overridesData: HueOverridesFile = JSON.parse(
    readFileSync(HUE_OVERRIDES_PATH, 'utf-8')
  )
  hueOverrides = overridesData.overrides
  console.log(
    `Loaded ${Object.keys(hueOverrides).length} paintpad hue overrides`
  )
} catch {
  console.warn('No hue-overrides.json found, using algorithmic hue assignment only')
}

/** Paint file names keyed by brand slug. */
const PAINT_FILES: Record<string, string> = {
  citadel: 'citadel.json',
  'army-painter': 'army-painter.json',
  vallejo: 'vallejo.json',
  'green-stuff-world': 'green-stuff-world.json',
  'ak-interactive': 'ak-interactive.json',
}

/** Munsell principal hues (top-level rows in the hues table). */
const MUNSELL_HUES: {
  id: string
  name: string
  slug: string
  hex: string
  sortOrder: number
}[] = [
  { id: '10000000-0000-0000-0000-000000000001', name: 'Red', slug: 'red', hex: '#FF0000', sortOrder: 1 },
  { id: '10000000-0000-0000-0000-000000000002', name: 'Yellow-Red', slug: 'yellow-red', hex: '#FF8C00', sortOrder: 2 },
  { id: '10000000-0000-0000-0000-000000000003', name: 'Yellow', slug: 'yellow', hex: '#FFFF00', sortOrder: 3 },
  { id: '10000000-0000-0000-0000-000000000004', name: 'Green-Yellow', slug: 'green-yellow', hex: '#9ACD32', sortOrder: 4 },
  { id: '10000000-0000-0000-0000-000000000005', name: 'Green', slug: 'green', hex: '#008000', sortOrder: 5 },
  { id: '10000000-0000-0000-0000-000000000006', name: 'Blue-Green', slug: 'blue-green', hex: '#008080', sortOrder: 6 },
  { id: '10000000-0000-0000-0000-000000000007', name: 'Blue', slug: 'blue', hex: '#0000FF', sortOrder: 7 },
  { id: '10000000-0000-0000-0000-000000000008', name: 'Purple-Blue', slug: 'purple-blue', hex: '#4B0082', sortOrder: 8 },
  { id: '10000000-0000-0000-0000-000000000009', name: 'Purple', slug: 'purple', hex: '#800080', sortOrder: 9 },
  { id: '10000000-0000-0000-0000-00000000000a', name: 'Red-Purple', slug: 'red-purple', hex: '#FF00FF', sortOrder: 10 },
  { id: '10000000-0000-0000-0000-00000000000b', name: 'Neutral', slug: 'neutral', hex: '#808080', sortOrder: 11 },
]

/** Number of ISCC-NBS sub-hues per principal hue. */
const SUB_HUES_PER_PARENT = 11

// ---------------------------------------------------------------------------
// Color conversion helpers
// ---------------------------------------------------------------------------

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  }
}

function rgbToHsl(
  r: number,
  g: number,
  b: number
): { h: number; s: number; l: number } {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b)
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

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/** Convert a name string to a URL-safe slug. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Escape single quotes for SQL string literals. */
function esc(value: string): string {
  return value.replace(/'/g, "''")
}

/** Round a number to 2 decimal places. */
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Derive the human-readable name for a sub-hue from its slug and parent hue.
 *
 * Chromatic hues follow the pattern "{Modifier} {Parent Name}" (e.g. "Vivid Red",
 * "Light Greyish Yellow-Red"). Neutral sub-hues are standalone names derived
 * directly from the slug (e.g. "White", "Dark Brown").
 */
function subHueName(
  subSlug: string,
  parentSlug: string,
  parentName: string
): string {
  if (parentSlug === 'neutral') {
    return subSlug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  }
  const modifierSlug = subSlug.slice(0, -(parentSlug.length + 1))
  const modifier = modifierSlug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
  return `${modifier} ${parentName}`
}

/**
 * ISCC-NBS sub-hues from the hues table (child rows with parent_id set,
 * seeded in migration 20260415). Each entry has the sub-hue slug and hex value
 * for RGB distance matching. The seed generator uses the closest sub-hue slug
 * to set `hue_id` on each paint (pointing to the sub-hue row).
 */
const COLOR_CATALOG: { slug: string; hex: string }[] = [
  // Red sub-hues (ISCC-NBS reference colors from paintpad.app)
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
  // Yellow-Red sub-hues (ISCC-NBS reference colors from paintpad.app)
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
  // Yellow sub-hues (ISCC-NBS reference colors from paintpad.app)
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
  // Green-Yellow sub-hues (ISCC-NBS reference colors from paintpad.app)
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
  // Green sub-hues (ISCC-NBS reference colors from paintpad.app)
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
  // Blue-Green sub-hues (ISCC-NBS reference colors from paintpad.app where available)
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
  // Blue sub-hues (ISCC-NBS reference colors from paintpad.app)
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
  // Purple-Blue sub-hues (ISCC-NBS reference colors from paintpad.app where available)
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
  // Purple sub-hues (ISCC-NBS reference colors from paintpad.app)
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
  // Red-Purple sub-hues (ISCC-NBS reference colors from paintpad.app where available)
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

/** Pre-computed RGB values for each color in the catalog. */
const COLOR_CATALOG_RGB = COLOR_CATALOG.map((c) => ({
  slug: c.slug,
  ...hexToRgb(c.hex),
}))

/**
 * HSL hue-angle ranges mapping to Munsell principal hue indices.
 *
 * Each range is a half-open interval [min, max) in degrees. Red wraps around
 * 360°/0° and is handled separately in {@link findPrincipalHueIndex}.
 */
const HUE_ANGLE_RANGES: { min: number; max: number; hueIndex: number }[] = [
  { min: 14, max: 44, hueIndex: 1 },   // Yellow-Red
  { min: 44, max: 74, hueIndex: 2 },   // Yellow
  { min: 74, max: 105, hueIndex: 3 },  // Green-Yellow
  { min: 105, max: 157, hueIndex: 4 }, // Green
  { min: 157, max: 200, hueIndex: 5 }, // Blue-Green
  { min: 200, max: 258, hueIndex: 6 }, // Blue
  { min: 258, max: 280, hueIndex: 7 }, // Purple-Blue
  { min: 280, max: 320, hueIndex: 8 }, // Purple
  { min: 320, max: 350, hueIndex: 9 }, // Red-Purple
]

/** HSL saturation (%) below which a color is classified as Neutral. */
const NEUTRAL_SATURATION_THRESHOLD = 15

/**
 * Determines which Munsell principal hue family a color belongs to
 * based on its HSL hue angle and saturation.
 *
 * @returns Index into {@link MUNSELL_HUES} (0–9 chromatic, 10 Neutral).
 */
function findPrincipalHueIndex(h: number, s: number): number {
  if (s < NEUTRAL_SATURATION_THRESHOLD) return 10

  // Red wraps around 0°/360°
  if (h >= 350 || h < 14) return 0

  for (const range of HUE_ANGLE_RANGES) {
    if (h >= range.min && h < range.max) return range.hueIndex
  }

  return 10 // fallback
}

/**
 * Finds the closest ISCC-NBS sub-hue for a paint color using a two-step approach:
 *
 * 1. Determine the principal hue family from HSL hue angle and saturation.
 * 2. Find the closest sub-hue within that family by RGB Euclidean distance.
 *
 * This ensures paints stay in the correct hue family (e.g. a green paint is always
 * matched to a Green sub-hue) while still picking the best lightness/chroma variant.
 *
 * @returns The slug of the closest sub-hue from the catalog.
 */
function findClosestColor(
  r: number,
  g: number,
  b: number,
  h: number,
  s: number
): string {
  const parentIdx = findPrincipalHueIndex(h, s)
  const startIdx = parentIdx * SUB_HUES_PER_PARENT
  const endIdx = startIdx + SUB_HUES_PER_PARENT

  let bestSlug = COLOR_CATALOG[startIdx].slug
  let bestDist = Infinity

  for (let i = startIdx; i < endIdx; i++) {
    const c = COLOR_CATALOG_RGB[i]
    const dr = r - c.r
    const dg = g - c.g
    const db = b - c.b
    const dist = dr * dr + dg * dg + db * db
    if (dist < bestDist) {
      bestDist = dist
      bestSlug = c.slug
    }
  }

  return bestSlug
}

/**
 * Deduplicate slugs within a product line by appending the brand paint ID
 * suffix when collisions are detected.
 */
function deduplicateSlugs(
  paints: PaintJson[]
): Map<string, string> {
  // Group paints by (type, slug) to find collisions
  const byTypeAndSlug = new Map<string, PaintJson[]>()
  for (const paint of paints) {
    const key = `${paint.type}::${slugify(paint.name)}`
    const existing = byTypeAndSlug.get(key) ?? []
    existing.push(paint)
    byTypeAndSlug.set(key, existing)
  }

  // Build jsonId -> final slug mapping
  const result = new Map<string, string>()
  for (const [, group] of byTypeAndSlug) {
    if (group.length === 1) {
      result.set(group[0].id, slugify(group[0].name))
    } else {
      // Collision: append the brand paint ID to disambiguate
      for (const paint of group) {
        result.set(paint.id, `${slugify(paint.name)}-${paint.id}`)
      }
    }
  }

  return result
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

function main(): void {
  const brands: BrandJson[] = JSON.parse(
    readFileSync(resolve(DATA_DIR, 'brands.json'), 'utf-8')
  )

  const lines: string[] = []

  lines.push('-- ==========================================================')
  lines.push('-- Seed data for paint tables')
  lines.push('-- Auto-generated by scripts/generate-seed.ts')
  lines.push('-- ==========================================================')
  lines.push('')

  // ------------------------------------------------------------------
  // 1. Brands
  // ------------------------------------------------------------------
  lines.push('-- ----------------------------------------------------------')
  lines.push('-- Brands')
  lines.push('-- ----------------------------------------------------------')
  lines.push('')

  for (const brand of brands) {
    const websiteUrl = BRAND_WEBSITES[brand.id] ?? null
    const websiteSql = websiteUrl ? `'${esc(websiteUrl)}'` : 'NULL'
    lines.push(
      `INSERT INTO public.brands (name, slug, website_url) VALUES ('${esc(brand.name)}', '${esc(brand.id)}', ${websiteSql});`
    )
  }
  lines.push('')

  // ------------------------------------------------------------------
  // 2. Hues (Munsell principal hues + ISCC-NBS sub-hues)
  // ------------------------------------------------------------------
  lines.push('-- ----------------------------------------------------------')
  lines.push('-- Hues (11 Munsell principal hues + 121 ISCC-NBS sub-hues)')
  lines.push('-- ----------------------------------------------------------')
  lines.push('')

  // Principal hues (ON CONFLICT safe when migration already seeded them)
  for (const hue of MUNSELL_HUES) {
    lines.push(
      `INSERT INTO public.hues (id, name, slug, hex_code, sort_order) VALUES ('${hue.id}', '${esc(hue.name)}', '${esc(hue.slug)}', '${hue.hex}', ${hue.sortOrder}) ON CONFLICT (id) DO NOTHING;`
    )
  }
  lines.push('')

  // Sub-hues (11 per principal hue)
  for (let i = 0; i < MUNSELL_HUES.length; i++) {
    const parent = MUNSELL_HUES[i]
    const startIdx = i * SUB_HUES_PER_PARENT
    const subHues = COLOR_CATALOG.slice(startIdx, startIdx + SUB_HUES_PER_PARENT)

    lines.push(`-- ${parent.name} sub-hues`)
    for (let j = 0; j < subHues.length; j++) {
      const sub = subHues[j]
      const name = subHueName(sub.slug, parent.slug, parent.name)
      lines.push(
        `INSERT INTO public.hues (parent_id, name, slug, hex_code, sort_order) VALUES ('${parent.id}', '${esc(name)}', '${esc(sub.slug)}', '${sub.hex}', ${j + 1}) ON CONFLICT (parent_id, slug) WHERE parent_id IS NOT NULL DO NOTHING;`
      )
    }
  }
  lines.push('')

  // ------------------------------------------------------------------
  // 3. Product Lines (derived from unique types per brand)
  // ------------------------------------------------------------------
  lines.push('-- ----------------------------------------------------------')
  lines.push('-- Product Lines')
  lines.push('-- ----------------------------------------------------------')
  lines.push('')

  for (const brand of brands) {
    const paintFile = PAINT_FILES[brand.id]
    if (!paintFile) continue
    const paints: PaintJson[] = JSON.parse(
      readFileSync(resolve(DATA_DIR, 'paints', paintFile), 'utf-8')
    )

    const typesSeen = new Set<string>()
    for (const paint of paints) {
      if (!typesSeen.has(paint.type)) {
        typesSeen.add(paint.type)
        const typeSlug = slugify(paint.type)
        lines.push(
          `INSERT INTO public.product_lines (brand_id, name, slug) VALUES ((SELECT id FROM public.brands WHERE slug = '${esc(brand.id)}'), '${esc(paint.type)}', '${esc(typeSlug)}');`
        )
      }
    }
  }
  lines.push('')

  // ------------------------------------------------------------------
  // 4. Paints
  // ------------------------------------------------------------------
  lines.push('-- ----------------------------------------------------------')
  lines.push('-- Paints')
  lines.push('-- ----------------------------------------------------------')
  lines.push('')

  // Build a lookup: JSON id -> { uuid, brandSlug, paintSlug, typeSlug } for references
  const jsonIdLookup = new Map<
    string,
    { uuid: string; brandSlug: string; paintSlug: string; typeSlug: string }
  >()

  // Collect all comparable entries for step 4
  const references: Array<{
    sourceJsonId: string
    targetJsonId: string
  }> = []

  let totalPaints = 0
  let overrideCount = 0
  let algorithmicCount = 0

  for (const brand of brands) {
    const paintFile = PAINT_FILES[brand.id]
    if (!paintFile) continue
    const paints: PaintJson[] = JSON.parse(
      readFileSync(resolve(DATA_DIR, 'paints', paintFile), 'utf-8')
    )

    // Deduplicate slugs within this brand
    const slugMap = deduplicateSlugs(paints)

    lines.push(`-- ${brand.name} (${paints.length} paints)`)

    for (const paint of paints) {
      const paintSlug = slugMap.get(paint.id) ?? slugify(paint.name)
      const typeSlug = slugify(paint.type)
      const uuid = randomUUID()
      const { r, g, b } = hexToRgb(paint.hex)
      const { h, s, l } = rgbToHsl(r, g, b)
      const isMetallic =
        paint.type.toLowerCase().includes('metallic') ||
        paint.type.toLowerCase().includes('metal')
      const paintType = paint.type.toLowerCase()
      // Use paintpad override if available, otherwise fall back to algorithmic matching
      const override = hueOverrides[paint.id]
      let closestColorSlug = override
        ? override.subHueSlug
        : findClosestColor(r, g, b, h, s)
      if (override) overrideCount++
      else algorithmicCount++

      // Force very dark paints named "Black" / "Black Wash" / "Black Primer" etc.
      // to the neutral "black" sub-hue regardless of slight color tints in their hex.
      // Painters expect these under Neutral, not under a chromatic hue.
      const nameLower = paint.name.toLowerCase()
      if (
        l < 25 &&
        (nameLower === 'black' ||
          nameLower.startsWith('black ') ||
          nameLower.endsWith(' black')) &&
        closestColorSlug !== 'black' &&
        closestColorSlug !== 'near-black'
      ) {
        closestColorSlug = l < 10 ? 'black' : 'near-black'
      }

      jsonIdLookup.set(paint.id, {
        uuid,
        brandSlug: brand.id,
        paintSlug,
        typeSlug,
      })

      lines.push(
        `INSERT INTO public.paints (id, brand_paint_id, product_line_id, name, slug, hex, r, g, b, hue, saturation, lightness, hue_id, is_metallic, is_discontinued, paint_type) VALUES ('${uuid}', '${esc(paint.id)}', (SELECT pl.id FROM public.product_lines pl JOIN public.brands br ON br.id = pl.brand_id WHERE br.slug = '${esc(brand.id)}' AND pl.slug = '${esc(typeSlug)}'), '${esc(paint.name)}', '${esc(paintSlug)}', '${esc(paint.hex)}', ${r}, ${g}, ${b}, ${round2(h)}, ${round2(s)}, ${round2(l)}, (SELECT id FROM public.hues WHERE slug = '${esc(closestColorSlug)}' AND parent_id IS NOT NULL LIMIT 1), ${isMetallic}, false, '${esc(paintType)}');`
      )

      // Collect references
      if (paint.comparable && paint.comparable.length > 0) {
        for (const comp of paint.comparable) {
          references.push({
            sourceJsonId: paint.id,
            targetJsonId: comp.id,
          })
        }
      }

      totalPaints++
    }
    lines.push('')
  }

  // ------------------------------------------------------------------
  // 5. Paint References
  // ------------------------------------------------------------------
  lines.push('-- ----------------------------------------------------------')
  lines.push(`-- Paint References (${references.length} cross-brand alternatives)`)
  lines.push('-- ----------------------------------------------------------')
  lines.push('')

  let refCount = 0
  for (const ref of references) {
    const source = jsonIdLookup.get(ref.sourceJsonId)
    const target = jsonIdLookup.get(ref.targetJsonId)

    if (!source || !target) {
      console.warn(
        `Warning: Could not resolve reference ${ref.sourceJsonId} -> ${ref.targetJsonId}, skipping`
      )
      continue
    }

    lines.push(
      `INSERT INTO public.paint_references (paint_id, related_paint_id, relationship, similarity_score) VALUES ('${source.uuid}', '${target.uuid}', 'alternative', NULL);`
    )
    refCount++
  }
  lines.push('')

  // ------------------------------------------------------------------
  // Summary
  // ------------------------------------------------------------------
  lines.push(`-- ==========================================================`)
  lines.push(`-- Summary: ${brands.length} brands, ${totalPaints} paints, ${refCount} references`)
  lines.push(`-- ==========================================================`)

  writeFileSync(OUTPUT_FILE, lines.join('\n') + '\n', 'utf-8')
  console.log(`Seed file written to: ${OUTPUT_FILE}`)
  console.log(`  Brands: ${brands.length}`)
  console.log(`  Paints: ${totalPaints}`)
  console.log(`  References: ${refCount}`)
  console.log(`  Hue assignments: ${overrideCount} paintpad overrides, ${algorithmicCount} algorithmic`)
}

main()
