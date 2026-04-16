/**
 * Cross-references paintpad.app hue assignments with our paint JSON data
 * and generates a hue override map for generate-seed.ts.
 *
 * Matches paintpad paints to our database by paint name + brand, then
 * applies the paintpad-sourced sub-hue assignment when it differs from
 * the algorithmically computed one.
 *
 * Outputs: scripts/data/hue-overrides.json
 *
 * Usage: npx tsx scripts/apply-paintpad-hue-overrides.ts
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = resolve(__dirname, 'data')

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PaintpadAssignment {
  paintName: string
  brand: string | null
  productLine: string | null
  paintpadPage: string
  paintpadSection: string
  paintpadSectionHex: string | null
  dbSubHueSlug: string
  dbPrincipalHue: string
}

interface PaintpadData {
  totalPaints: number
  assignments: PaintpadAssignment[]
  sectionMappings: Record<
    string,
    { paintpadSection: string; sampleHex: string | null; dbSubHue: string }[]
  >
}

interface PaintJson {
  id: string
  name: string
  hex: string
  type: string
  description: string
  comparable: { id: string; name: string }[]
}

// ---------------------------------------------------------------------------
// Brand name mapping: paintpad brand names → our brand slugs
// ---------------------------------------------------------------------------

/**
 * Map normalized paintpad brand names to our brand slugs.
 * Keys are normalized (lowercase, no non-breaking spaces).
 */
const PAINTPAD_BRAND_MAP: Record<string, string> = {
  // Citadel
  'citadel painting system': 'citadel',
  // Army Painter
  'the army painter masterclass': 'army-painter',
  'the army painter speedpaint 2.0': 'army-painter',
  'the army painter warpaints': 'army-painter',
  'the army painter warpaints air': 'army-painter',
  'the army painter warpaints fanatic': 'army-painter',
  // Vallejo
  'vallejo auxiliaries': 'vallejo',
  'vallejo game air': 'vallejo',
  'vallejo game color': 'vallejo',
  'vallejo hobby spray paint': 'vallejo',
  'vallejo liquid gold': 'vallejo',
  'vallejo mecha color': 'vallejo',
  'vallejo metal color': 'vallejo',
  'vallejo model air': 'vallejo',
  'vallejo model color': 'vallejo',
  'vallejo model wash': 'vallejo',
  'vallejo nocturna': 'vallejo',
  'vallejo panzer aces': 'vallejo',
  'vallejo surface primer': 'vallejo',
  'vallejo the shifters': 'vallejo',
  'vallejo xpress': 'vallejo',
  // Green Stuff World
  'green stuff world': 'green-stuff-world',
  // AK Interactive
  'ak interactive': 'ak-interactive',
  'ak interactive 3rd generation acrylics': 'ak-interactive',
  'ak interactive abteilung 502': 'ak-interactive',
  'ak interactive acrylics': 'ak-interactive',
  'ak interactive real color': 'ak-interactive',
  'amsterdam acrylic ink': 'ak-interactive',
}

/** Normalize a brand name for lookup: lowercase, collapse whitespace, strip NBSP. */
function normalizeBrand(brand: string): string {
  return brand
    .toLowerCase()
    .replace(/\u00a0/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

// ---------------------------------------------------------------------------
// Normalize strings for matching
// ---------------------------------------------------------------------------

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/\u00a0/g, ' ') // non-breaking space
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/['']/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  // Load paintpad assignments
  const paintpadData: PaintpadData = JSON.parse(
    readFileSync(resolve(DATA_DIR, 'paintpad-hue-assignments.json'), 'utf-8')
  )

  // Load our paint JSON files
  const brandFiles: Record<string, string> = {
    citadel: 'citadel.json',
    'army-painter': 'army-painter.json',
    vallejo: 'vallejo.json',
    'green-stuff-world': 'green-stuff-world.json',
    'ak-interactive': 'ak-interactive.json',
  }

  // Build a lookup: normalized "brand::name" → paint JSON entries
  const paintLookup = new Map<string, { paint: PaintJson; brandSlug: string }[]>()
  // Also build name-only lookup for fallback matching
  const nameOnlyLookup = new Map<
    string,
    { paint: PaintJson; brandSlug: string }[]
  >()

  for (const [brandSlug, file] of Object.entries(brandFiles)) {
    const paints: PaintJson[] = JSON.parse(
      readFileSync(resolve(DATA_DIR, 'paints', file), 'utf-8')
    )
    for (const paint of paints) {
      const normName = normalize(paint.name)
      const key = `${brandSlug}::${normName}`

      const existing = paintLookup.get(key) ?? []
      existing.push({ paint, brandSlug })
      paintLookup.set(key, existing)

      const nameExisting = nameOnlyLookup.get(normName) ?? []
      nameExisting.push({ paint, brandSlug })
      nameOnlyLookup.set(normName, nameExisting)
    }
  }

  // ---------------------------------------------------------------------------
  // Color helpers for conflict resolution
  // ---------------------------------------------------------------------------

  function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const h = hex.replace('#', '')
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16),
    }
  }

  function colorDistance(a: string, b: string): number {
    const ra = hexToRgb(a)
    const rb = hexToRgb(b)
    const dr = ra.r - rb.r
    const dg = ra.g - rb.g
    const db = ra.b - rb.b
    return dr * dr + dg * dg + db * db
  }

  // ---------------------------------------------------------------------------
  // Collect all candidate assignments per paint (for conflict resolution)
  // ---------------------------------------------------------------------------

  interface OverrideEntry {
    subHueSlug: string
    principalHue: string
    paintpadPage: string
    paintpadSection: string
    paintpadSectionHex: string | null
  }

  // Map paint JSON id → list of candidate assignments
  const candidates = new Map<
    string,
    { paint: PaintJson; entries: OverrideEntry[] }
  >()

  let matched = 0
  let unmatched = 0
  let skippedBrand = 0
  const unmatchedPaints: string[] = []

  for (const assignment of paintpadData.assignments) {
    // Resolve brand
    const brand = assignment.brand
    if (!brand) {
      skippedBrand++
      continue
    }

    const ourBrand = PAINTPAD_BRAND_MAP[normalizeBrand(brand)]
    if (!ourBrand) {
      skippedBrand++
      continue
    }

    const normName = normalize(assignment.paintName)

    // Try exact brand + name match first
    let matches = paintLookup.get(`${ourBrand}::${normName}`)

    // Fallback: name-only match filtered by brand
    if (!matches || matches.length === 0) {
      const nameMatches = nameOnlyLookup.get(normName)
      if (nameMatches) {
        matches = nameMatches.filter((m) => m.brandSlug === ourBrand)
      }
    }

    if (!matches || matches.length === 0) {
      unmatched++
      unmatchedPaints.push(
        `${assignment.brand}: ${assignment.paintName} (${assignment.productLine})`
      )
      continue
    }

    matched++
    const entry: OverrideEntry = {
      subHueSlug: assignment.dbSubHueSlug,
      principalHue: assignment.dbPrincipalHue,
      paintpadPage: assignment.paintpadPage,
      paintpadSection: assignment.paintpadSection,
      paintpadSectionHex: assignment.paintpadSectionHex,
    }

    for (const { paint } of matches) {
      const existing = candidates.get(paint.id)
      if (existing) {
        existing.entries.push(entry)
      } else {
        candidates.set(paint.id, { paint, entries: [entry] })
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Build DB sub-hue hex lookup for fallback color distance comparisons
  // ---------------------------------------------------------------------------

  const DB_SUB_HUE_HEX: Record<string, string> = {
    // Red
    'vivid-red': '#BE0032', 'strong-red': '#BC3F4A', 'deep-red': '#841B2D',
    'very-deep-red': '#5C0923', 'moderate-red': '#AB4E52', 'dark-red': '#722F37',
    'very-dark-red': '#3F1728', 'light-greyish-red': '#AD8884',
    'greyish-red': '#905D5D', 'dark-greyish-red': '#543D3F', 'blackish-red': '#2E1D21',
    // Yellow-Red
    'vivid-yellow-red': '#F38400', 'strong-yellow-red': '#E66721',
    'deep-yellow-red': '#AA381E', 'very-deep-yellow-red': '#593319',
    'moderate-yellow-red': '#F99379', 'dark-yellow-red': '#6F4E37',
    'very-dark-yellow-red': '#3E322C', 'light-greyish-yellow-red': '#FFB7A5',
    'greyish-yellow-red': '#C48379', 'dark-greyish-yellow-red': '#635147',
    'blackish-yellow-red': '#28201C',
    // Yellow
    'vivid-yellow': '#F3C300', 'strong-yellow': '#D4AF37', 'deep-yellow': '#AF8D13',
    'very-deep-yellow': '#50500B', 'moderate-yellow': '#C9AE5D',
    'dark-yellow': '#AB9144', 'very-dark-yellow': '#3B3121',
    'light-greyish-yellow': '#FBC97F', 'greyish-yellow': '#C2B280',
    'dark-greyish-yellow': '#A18F60', 'blackish-yellow': '#22221C',
    // Green-Yellow
    'vivid-green-yellow': '#DCD300', 'strong-green-yellow': '#8DB600',
    'deep-green-yellow': '#9B9400', 'very-deep-green-yellow': '#39500B',
    'moderate-green-yellow': '#E9E450', 'dark-green-yellow': '#867E36',
    'very-dark-green-yellow': '#403D21', 'light-greyish-green-yellow': '#EAE679',
    'greyish-green-yellow': '#8C8767', 'dark-greyish-green-yellow': '#5B5842',
    'blackish-green-yellow': '#25241D',
    // Green
    'vivid-green': '#008856', 'strong-green': '#007959', 'deep-green': '#00543D',
    'very-deep-green': '#00622D', 'moderate-green': '#3B7861',
    'dark-green': '#1B4D3E', 'very-dark-green': '#1C352D',
    'light-greyish-green': '#B6E5AF', 'greyish-green': '#5E716A',
    'dark-greyish-green': '#3A4B47', 'blackish-green': '#1A2421',
    // Blue-Green
    'vivid-blue-green': '#00FFFF', 'strong-blue-green': '#17CFCF',
    'deep-blue-green': '#008882', 'very-deep-blue-green': '#00443F',
    'moderate-blue-green': '#239EBA', 'dark-blue-green': '#317873',
    'very-dark-blue-green': '#002A29', 'light-greyish-blue-green': '#96DED1',
    'greyish-blue-green': '#66ADA4', 'dark-greyish-blue-green': '#415858',
    'blackish-blue-green': '#1C2222',
    // Blue
    'vivid-blue': '#00A1C2', 'strong-blue': '#0067A5', 'deep-blue': '#00416A',
    'very-deep-blue': '#0B0B50', 'moderate-blue': '#436B95', 'dark-blue': '#00304E',
    'very-dark-blue': '#171736', 'light-greyish-blue': '#A1CAF1',
    'greyish-blue': '#536878', 'dark-greyish-blue': '#36454F', 'blackish-blue': '#202830',
    // Purple-Blue
    'vivid-purple-blue': '#5500FF', 'strong-purple-blue': '#5417CF',
    'deep-purple-blue': '#380F8A', 'very-deep-purple-blue': '#272458',
    'moderate-purple-blue': '#9065CA', 'dark-purple-blue': '#30267A',
    'very-dark-purple-blue': '#252440', 'light-greyish-purple-blue': '#B3BCE2',
    'greyish-purple-blue': '#6C79B8', 'dark-greyish-purple-blue': '#4E5180',
    'blackish-purple-blue': '#1E1C22',
    // Purple
    'vivid-purple': '#9A4EAE', 'strong-purple': '#875692', 'deep-purple': '#602F6B',
    'very-deep-purple': '#401A4C', 'moderate-purple': '#86608E',
    'dark-purple': '#563C5C', 'very-dark-purple': '#301934',
    'light-greyish-purple': '#D399E6', 'greyish-purple': '#796878',
    'dark-greyish-purple': '#50404D', 'blackish-purple': '#291E29',
    // Red-Purple
    'vivid-red-purple': '#FF0080', 'strong-red-purple': '#CF1773',
    'deep-red-purple': '#870074', 'very-deep-red-purple': '#54133B',
    'moderate-red-purple': '#E4717A', 'dark-red-purple': '#702963',
    'very-dark-red-purple': '#341731', 'light-greyish-red-purple': '#FFB5BA',
    'greyish-red-purple': '#C08081', 'dark-greyish-red-purple': '#5D3954',
    'blackish-red-purple': '#221C1F',
    // Neutral
    'white': '#FFFFFF', 'near-white': '#F5F5F5', 'light-grey': '#B9B8B5',
    'medium-grey': '#848482', 'dark-grey': '#555555', 'near-black': '#1A1A1A',
    'black': '#000000', 'brown': '#8B4513', 'dark-brown': '#422518',
    'light-brown': '#A67B5B', 'ivory': '#FFFFF0',
  }

  /**
   * Get the comparison hex for an override entry.
   * Uses the paintpad section hex when available, falls back to the
   * DB sub-hue reference hex so neutral entries with no sampleHex
   * (e.g., "black" page) still participate in distance comparison.
   */
  function entryComparisonHex(entry: OverrideEntry): string | null {
    return entry.paintpadSectionHex ?? DB_SUB_HUE_HEX[entry.subHueSlug] ?? null
  }

  // ---------------------------------------------------------------------------
  // Resolve conflicts: pick best assignment per paint
  //
  // When a paint appears on multiple pages with different sub-hue assignments,
  // pick the one whose section sample hex (or DB sub-hue fallback hex) is
  // closest to the paint's actual hex.
  // ---------------------------------------------------------------------------

  const overrides: Record<string, OverrideEntry> = {}
  let conflicts = 0

  for (const [paintId, { paint, entries }] of candidates) {
    // Deduplicate by sub-hue slug
    const uniqueSlugs = new Set(entries.map((e) => e.subHueSlug))

    if (uniqueSlugs.size === 1) {
      // No conflict — all assignments agree
      overrides[paintId] = entries[0]
    } else {
      conflicts++
      // Pick the entry whose comparison hex is closest to the paint's hex
      let best = entries[0]
      let bestDist = Infinity

      for (const entry of entries) {
        const cmpHex = entryComparisonHex(entry)
        if (cmpHex) {
          const dist = colorDistance(paint.hex, cmpHex)
          if (dist < bestDist) {
            bestDist = dist
            best = entry
          }
        }
      }

      overrides[paintId] = best
    }
  }

  // Write overrides
  const output = {
    generatedAt: new Date().toISOString(),
    description:
      'Hue sub-hue overrides sourced from paintpad.app by-colour pages. Keyed by paint JSON id.',
    stats: {
      totalPaintpadAssignments: paintpadData.totalPaints,
      matchedToOurPaints: matched,
      unmatchedPaints: unmatched,
      skippedNonOurBrands: skippedBrand,
      uniqueOverrides: Object.keys(overrides).length,
      conflictsResolved: conflicts,
    },
    overrides,
  }

  const outputPath = resolve(DATA_DIR, 'hue-overrides.json')
  writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8')

  console.log(`\nResults:`)
  console.log(`  Paintpad assignments: ${paintpadData.totalPaints}`)
  console.log(`  Matched to our paints: ${matched}`)
  console.log(`  Unmatched (our brands): ${unmatched}`)
  console.log(`  Skipped (non-our brands): ${skippedBrand}`)
  console.log(`  Unique paint overrides: ${Object.keys(overrides).length}`)
  console.log(`  Conflicts resolved: ${conflicts}`)
  console.log(`  Output: ${outputPath}`)

  // Show unmatched paints from our brands (useful for debugging name mismatches)
  if (unmatchedPaints.length > 0) {
    console.log(`\nUnmatched paints from our brands (${unmatchedPaints.length}):`)
    // Group by brand for readability
    const byBrand = new Map<string, string[]>()
    for (const p of unmatchedPaints) {
      const brand = p.split(':')[0]
      const existing = byBrand.get(brand) ?? []
      existing.push(p)
      byBrand.set(brand, existing)
    }
    for (const [brand, paints] of byBrand) {
      console.log(`  ${brand} (${paints.length}):`)
      for (const p of paints.slice(0, 10)) {
        console.log(`    - ${p}`)
      }
      if (paints.length > 10) {
        console.log(`    ... and ${paints.length - 10} more`)
      }
    }
  }

  // Also output the section mappings with sample hex colors for reference
  const sectionOutput = {
    description:
      'Paintpad.app section → DB sub-hue mapping with ISCC-NBS sample hex colors',
    mappings: paintpadData.sectionMappings,
  }
  const sectionOutputPath = resolve(DATA_DIR, 'paintpad-section-colors.json')
  writeFileSync(
    sectionOutputPath,
    JSON.stringify(sectionOutput, null, 2),
    'utf-8'
  )
  console.log(`\nSection colors: ${sectionOutputPath}`)
}

main()
