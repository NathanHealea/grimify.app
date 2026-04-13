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

/** Paint file names keyed by brand slug. */
const PAINT_FILES: Record<string, string> = {
  citadel: 'citadel.json',
  'army-painter': 'army-painter.json',
  vallejo: 'vallejo.json',
  'green-stuff-world': 'green-stuff-world.json',
  'ak-interactive': 'ak-interactive.json',
}

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
 * Named colors from the itten_hues table (child rows with parent_id set,
 * seeded in migration 20260414). Each entry has the color name and hex value
 * for RGB distance matching. The seed generator uses the closest color name
 * to set `itten_hue_id` on each paint (pointing to the color-level row).
 */
const COLOR_CATALOG: { name: string; hex: string }[] = [
  // Red
  { name: 'Red',        hex: '#FF0000' },
  { name: 'Crimson',    hex: '#DC143C' },
  { name: 'Scarlet',    hex: '#FF2400' },
  { name: 'Blood Red',  hex: '#660000' },
  { name: 'Cherry',     hex: '#DE3163' },
  // Red-Orange
  { name: 'Vermillion',    hex: '#E34234' },
  { name: 'Rust',          hex: '#B7410E' },
  { name: 'Burnt Sienna',  hex: '#E97451' },
  { name: 'Terracotta',    hex: '#E2725B' },
  { name: 'Coral',         hex: '#FF7F50' },
  // Orange
  { name: 'Orange',        hex: '#FF8C00' },
  { name: 'Burnt Orange',  hex: '#CC5500' },
  { name: 'Tangerine',     hex: '#FF9966' },
  { name: 'Pumpkin',       hex: '#FF7518' },
  { name: 'Copper',        hex: '#B87333' },
  // Yellow-Orange
  { name: 'Amber',     hex: '#FFBF00' },
  { name: 'Gold',      hex: '#FFD700' },
  { name: 'Marigold',  hex: '#EAA221' },
  { name: 'Honey',     hex: '#EB9605' },
  { name: 'Saffron',   hex: '#F4C430' },
  // Yellow
  { name: 'Yellow',      hex: '#FFFF00' },
  { name: 'Lemon',       hex: '#FFF44F' },
  { name: 'Canary',      hex: '#FFEF00' },
  { name: 'Sunflower',   hex: '#FFDA03' },
  { name: 'Pale Yellow', hex: '#FFFFBF' },
  // Yellow-Green
  { name: 'Lime',         hex: '#32CD32' },
  { name: 'Chartreuse',   hex: '#7FFF00' },
  { name: 'Spring Green', hex: '#00FF7F' },
  { name: 'Olive',        hex: '#808000' },
  { name: 'Moss',         hex: '#8A9A5B' },
  // Green
  { name: 'Green',        hex: '#008000' },
  { name: 'Forest Green', hex: '#228B22' },
  { name: 'Dark Green',   hex: '#006400' },
  { name: 'Emerald',      hex: '#50C878' },
  { name: 'Hunter Green', hex: '#355E3B' },
  // Blue-Green
  { name: 'Teal',       hex: '#008080' },
  { name: 'Turquoise',  hex: '#40E0D0' },
  { name: 'Cyan',       hex: '#00FFFF' },
  { name: 'Aquamarine', hex: '#7FFFD4' },
  { name: 'Sea Green',  hex: '#2E8B57' },
  // Blue
  { name: 'Blue',       hex: '#0000FF' },
  { name: 'Navy',       hex: '#000080' },
  { name: 'Royal Blue', hex: '#4169E1' },
  { name: 'Sky Blue',   hex: '#87CEEB' },
  { name: 'Cobalt',     hex: '#0047AB' },
  // Blue-Violet
  { name: 'Indigo',        hex: '#4B0082' },
  { name: 'Ultramarine',   hex: '#3F00FF' },
  { name: 'Periwinkle',    hex: '#CCCCFF' },
  { name: 'Slate Blue',    hex: '#6A5ACD' },
  { name: 'Midnight Blue', hex: '#191970' },
  // Violet
  { name: 'Violet',   hex: '#7F00FF' },
  { name: 'Purple',   hex: '#800080' },
  { name: 'Plum',     hex: '#8E4585' },
  { name: 'Amethyst', hex: '#9966CC' },
  { name: 'Lavender', hex: '#B57EDC' },
  // Red-Violet
  { name: 'Magenta',   hex: '#FF00FF' },
  { name: 'Rose',      hex: '#FF007F' },
  { name: 'Fuchsia',   hex: '#FF77FF' },
  { name: 'Hot Pink',  hex: '#FF69B4' },
  { name: 'Raspberry', hex: '#E30B5C' },
  // Neutral
  { name: 'Black',      hex: '#000000' },
  { name: 'White',      hex: '#FFFFFF' },
  { name: 'Grey',       hex: '#808080' },
  { name: 'Dark Grey',  hex: '#404040' },
  { name: 'Light Grey', hex: '#C0C0C0' },
  { name: 'Ivory',      hex: '#FFFFF0' },
  { name: 'Bone',       hex: '#E3DAC9' },
  { name: 'Silver',     hex: '#C0C0C0' },
  { name: 'Brown',      hex: '#8B4513' },
  { name: 'Dark Brown', hex: '#3B2F2F' },
  { name: 'Tan',        hex: '#D2B48C' },
  { name: 'Beige',      hex: '#F5F5DC' },
]

/** Pre-computed RGB values for each color in the catalog. */
const COLOR_CATALOG_RGB = COLOR_CATALOG.map((c) => ({
  name: c.name,
  ...hexToRgb(c.hex),
}))

/**
 * Finds the closest named color to a given RGB value using Euclidean distance.
 *
 * @returns The name of the closest color from the catalog.
 */
function findClosestColor(r: number, g: number, b: number): string {
  let bestName = 'Grey'
  let bestDist = Infinity

  for (const c of COLOR_CATALOG_RGB) {
    const dr = r - c.r
    const dg = g - c.g
    const db = b - c.b
    const dist = dr * dr + dg * dg + db * db
    if (dist < bestDist) {
      bestDist = dist
      bestName = c.name
    }
  }

  return bestName
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
  // 2. Product Lines (derived from unique types per brand)
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
  // 3. Paints
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
      const closestColor = findClosestColor(r, g, b)

      jsonIdLookup.set(paint.id, {
        uuid,
        brandSlug: brand.id,
        paintSlug,
        typeSlug,
      })

      lines.push(
        `INSERT INTO public.paints (id, brand_paint_id, product_line_id, name, slug, hex, r, g, b, hue, saturation, lightness, itten_hue_id, is_metallic, is_discontinued, paint_type) VALUES ('${uuid}', '${esc(paint.id)}', (SELECT pl.id FROM public.product_lines pl JOIN public.brands br ON br.id = pl.brand_id WHERE br.slug = '${esc(brand.id)}' AND pl.slug = '${esc(typeSlug)}'), '${esc(paint.name)}', '${esc(paintSlug)}', '${esc(paint.hex)}', ${r}, ${g}, ${b}, ${round2(h)}, ${round2(s)}, ${round2(l)}, (SELECT id FROM public.itten_hues WHERE name = '${esc(closestColor)}' AND parent_id IS NOT NULL LIMIT 1), ${isMetallic}, false, '${esc(paintType)}');`
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
  // 4. Paint References
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
}

main()
