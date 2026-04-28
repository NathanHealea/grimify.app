import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

import {
  COLOR_CATALOG,
  MUNSELL_HUES,
  SUB_HUES_PER_PARENT,
} from '../src/modules/color-wheel/data/iscc-nbs-catalog'
import {
  applyBlackPaintOverride,
  findClosestColor,
} from '../src/modules/color-wheel/utils/find-closest-hue'
import { hexToRgb, rgbToHsl } from '../src/modules/color-wheel/utils/hex-to-hsl'

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
      `INSERT INTO public.brands (name, slug, website_url) VALUES ('${esc(brand.name)}', '${esc(brand.id)}', ${websiteSql}) ON CONFLICT (slug) DO NOTHING;`
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

  // Principal hues (conflict on slug since IDs are stable but slug is the logical key)
  for (const hue of MUNSELL_HUES) {
    lines.push(
      `INSERT INTO public.hues (id, name, slug, hex_code, sort_order) VALUES ('${hue.id}', '${esc(hue.name)}', '${esc(hue.slug)}', '${hue.hex}', ${hue.sortOrder}) ON CONFLICT (slug) WHERE parent_id IS NULL DO NOTHING;`
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
          `INSERT INTO public.product_lines (brand_id, name, slug) VALUES ((SELECT id FROM public.brands WHERE slug = '${esc(brand.id)}'), '${esc(paint.type)}', '${esc(typeSlug)}') ON CONFLICT (brand_id, slug) DO NOTHING;`
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
      const baseSlug = override ? override.subHueSlug : findClosestColor(r, g, b, h, s)
      if (override) overrideCount++
      else algorithmicCount++

      const closestColorSlug = applyBlackPaintOverride(baseSlug, paint.name, l)

      jsonIdLookup.set(paint.id, {
        uuid,
        brandSlug: brand.id,
        paintSlug,
        typeSlug,
      })

      lines.push(
        `INSERT INTO public.paints (id, brand_paint_id, product_line_id, name, slug, hex, r, g, b, hue, saturation, lightness, hue_id, is_metallic, is_discontinued, paint_type) VALUES ('${uuid}', '${esc(paint.id)}', (SELECT pl.id FROM public.product_lines pl JOIN public.brands br ON br.id = pl.brand_id WHERE br.slug = '${esc(brand.id)}' AND pl.slug = '${esc(typeSlug)}'), '${esc(paint.name)}', '${esc(paintSlug)}', '${esc(paint.hex)}', ${r}, ${g}, ${b}, ${round2(h)}, ${round2(s)}, ${round2(l)}, (SELECT id FROM public.hues WHERE slug = '${esc(closestColorSlug)}' AND parent_id IS NOT NULL LIMIT 1), ${isMetallic}, false, '${esc(paintType)}') ON CONFLICT (product_line_id, slug) DO NOTHING;`
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
      `INSERT INTO public.paint_references (paint_id, related_paint_id, relationship, similarity_score) VALUES ('${source.uuid}', '${target.uuid}', 'alternative', NULL) ON CONFLICT (paint_id, related_paint_id, relationship) DO NOTHING;`
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
