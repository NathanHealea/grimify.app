/**
 * Fetches paint data from paintpad.app/paints/by-colour/{slug} pages
 * and maps each paint to the closest ISCC-NBS sub-hue in our database.
 *
 * Outputs: scripts/data/paintpad-hue-assignments.json
 *
 * Usage: npx tsx scripts/fetch-paintpad-hues.ts
 */

import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_FILE = resolve(__dirname, 'data', 'paintpad-hue-assignments.json')

// ---------------------------------------------------------------------------
// Paintpad.app colour slugs (from /paints/by-colour index)
// ---------------------------------------------------------------------------

const COLOUR_SLUGS = [
  'pink',
  'red',
  'yellowish-pink',
  'reddish-orange',
  'reddish-brown',
  'orange',
  'brown',
  'orange-yellow',
  'yellowish-brown',
  'yellow',
  'olive-brown',
  'greenish-yellow',
  'olive',
  'yellow-green',
  'olive-green',
  'yellowish-green',
  'green',
  'bluish-green',
  'greenish-blue',
  'blue',
  'purplish-blue',
  'violet',
  'purple',
  'reddish-purple',
  'purplish-pink',
  'purplish-red',
  'white',
  'grey',
  'black',
]

// ---------------------------------------------------------------------------
// Our ISCC-NBS sub-hue catalog (must match generate-seed.ts COLOR_CATALOG)
// ---------------------------------------------------------------------------

const DB_SUB_HUES: { slug: string; hex: string; parentSlug: string }[] = [
  // Red sub-hues
  { slug: 'vivid-red', hex: '#FF0000', parentSlug: 'red' },
  { slug: 'strong-red', hex: '#CF1717', parentSlug: 'red' },
  { slug: 'deep-red', hex: '#8A0F0F', parentSlug: 'red' },
  { slug: 'very-deep-red', hex: '#500B0B', parentSlug: 'red' },
  { slug: 'moderate-red', hex: '#BF4040', parentSlug: 'red' },
  { slug: 'dark-red', hex: '#6F2A2A', parentSlug: 'red' },
  { slug: 'very-dark-red', hex: '#361717', parentSlug: 'red' },
  { slug: 'light-greyish-red', hex: '#CCB3B3', parentSlug: 'red' },
  { slug: 'greyish-red', hex: '#996666', parentSlug: 'red' },
  { slug: 'dark-greyish-red', hex: '#584141', parentSlug: 'red' },
  { slug: 'blackish-red', hex: '#221C1C', parentSlug: 'red' },
  // Yellow-Red sub-hues
  { slug: 'vivid-yellow-red', hex: '#FF8C00', parentSlug: 'yellow-red' },
  { slug: 'strong-yellow-red', hex: '#CF7C17', parentSlug: 'yellow-red' },
  { slug: 'deep-yellow-red', hex: '#8A530F', parentSlug: 'yellow-red' },
  { slug: 'very-deep-yellow-red', hex: '#50310B', parentSlug: 'yellow-red' },
  { slug: 'moderate-yellow-red', hex: '#BF8640', parentSlug: 'yellow-red' },
  { slug: 'dark-yellow-red', hex: '#6F502A', parentSlug: 'yellow-red' },
  { slug: 'very-dark-yellow-red', hex: '#362817', parentSlug: 'yellow-red' },
  { slug: 'light-greyish-yellow-red', hex: '#CCC1B3', parentSlug: 'yellow-red' },
  { slug: 'greyish-yellow-red', hex: '#998266', parentSlug: 'yellow-red' },
  { slug: 'dark-greyish-yellow-red', hex: '#584E41', parentSlug: 'yellow-red' },
  { slug: 'blackish-yellow-red', hex: '#221F1C', parentSlug: 'yellow-red' },
  // Yellow sub-hues
  { slug: 'vivid-yellow', hex: '#FFFF00', parentSlug: 'yellow' },
  { slug: 'strong-yellow', hex: '#CFCF17', parentSlug: 'yellow' },
  { slug: 'deep-yellow', hex: '#8A8A0F', parentSlug: 'yellow' },
  { slug: 'very-deep-yellow', hex: '#50500B', parentSlug: 'yellow' },
  { slug: 'moderate-yellow', hex: '#BFBF40', parentSlug: 'yellow' },
  { slug: 'dark-yellow', hex: '#6F6F2A', parentSlug: 'yellow' },
  { slug: 'very-dark-yellow', hex: '#363617', parentSlug: 'yellow' },
  { slug: 'light-greyish-yellow', hex: '#CCCCB3', parentSlug: 'yellow' },
  { slug: 'greyish-yellow', hex: '#999966', parentSlug: 'yellow' },
  { slug: 'dark-greyish-yellow', hex: '#585841', parentSlug: 'yellow' },
  { slug: 'blackish-yellow', hex: '#22221C', parentSlug: 'yellow' },
  // Green-Yellow sub-hues
  { slug: 'vivid-green-yellow', hex: '#AAFF00', parentSlug: 'green-yellow' },
  { slug: 'strong-green-yellow', hex: '#91CF17', parentSlug: 'green-yellow' },
  { slug: 'deep-green-yellow', hex: '#618A0F', parentSlug: 'green-yellow' },
  { slug: 'very-deep-green-yellow', hex: '#39500B', parentSlug: 'green-yellow' },
  { slug: 'moderate-green-yellow', hex: '#95BF40', parentSlug: 'green-yellow' },
  { slug: 'dark-green-yellow', hex: '#586F2A', parentSlug: 'green-yellow' },
  { slug: 'very-dark-green-yellow', hex: '#2B3617', parentSlug: 'green-yellow' },
  { slug: 'light-greyish-green-yellow', hex: '#C4CCB3', parentSlug: 'green-yellow' },
  { slug: 'greyish-green-yellow', hex: '#889966', parentSlug: 'green-yellow' },
  { slug: 'dark-greyish-green-yellow', hex: '#505841', parentSlug: 'green-yellow' },
  { slug: 'blackish-green-yellow', hex: '#20221C', parentSlug: 'green-yellow' },
  // Green sub-hues
  { slug: 'vivid-green', hex: '#00FF00', parentSlug: 'green' },
  { slug: 'strong-green', hex: '#17CF17', parentSlug: 'green' },
  { slug: 'deep-green', hex: '#0F8A0F', parentSlug: 'green' },
  { slug: 'very-deep-green', hex: '#0B500B', parentSlug: 'green' },
  { slug: 'moderate-green', hex: '#40BF40', parentSlug: 'green' },
  { slug: 'dark-green', hex: '#2A6F2A', parentSlug: 'green' },
  { slug: 'very-dark-green', hex: '#173617', parentSlug: 'green' },
  { slug: 'light-greyish-green', hex: '#B3CCB3', parentSlug: 'green' },
  { slug: 'greyish-green', hex: '#669966', parentSlug: 'green' },
  { slug: 'dark-greyish-green', hex: '#415841', parentSlug: 'green' },
  { slug: 'blackish-green', hex: '#1C221C', parentSlug: 'green' },
  // Blue-Green sub-hues
  { slug: 'vivid-blue-green', hex: '#00FFFF', parentSlug: 'blue-green' },
  { slug: 'strong-blue-green', hex: '#17CFCF', parentSlug: 'blue-green' },
  { slug: 'deep-blue-green', hex: '#0F8A8A', parentSlug: 'blue-green' },
  { slug: 'very-deep-blue-green', hex: '#0B5050', parentSlug: 'blue-green' },
  { slug: 'moderate-blue-green', hex: '#40BFBF', parentSlug: 'blue-green' },
  { slug: 'dark-blue-green', hex: '#2A6F6F', parentSlug: 'blue-green' },
  { slug: 'very-dark-blue-green', hex: '#173636', parentSlug: 'blue-green' },
  { slug: 'light-greyish-blue-green', hex: '#B3CCCC', parentSlug: 'blue-green' },
  { slug: 'greyish-blue-green', hex: '#669999', parentSlug: 'blue-green' },
  { slug: 'dark-greyish-blue-green', hex: '#415858', parentSlug: 'blue-green' },
  { slug: 'blackish-blue-green', hex: '#1C2222', parentSlug: 'blue-green' },
  // Blue sub-hues
  { slug: 'vivid-blue', hex: '#0000FF', parentSlug: 'blue' },
  { slug: 'strong-blue', hex: '#1717CF', parentSlug: 'blue' },
  { slug: 'deep-blue', hex: '#0F0F8A', parentSlug: 'blue' },
  { slug: 'very-deep-blue', hex: '#0B0B50', parentSlug: 'blue' },
  { slug: 'moderate-blue', hex: '#4040BF', parentSlug: 'blue' },
  { slug: 'dark-blue', hex: '#2A2A6F', parentSlug: 'blue' },
  { slug: 'very-dark-blue', hex: '#171736', parentSlug: 'blue' },
  { slug: 'light-greyish-blue', hex: '#B3B3CC', parentSlug: 'blue' },
  { slug: 'greyish-blue', hex: '#666699', parentSlug: 'blue' },
  { slug: 'dark-greyish-blue', hex: '#414158', parentSlug: 'blue' },
  { slug: 'blackish-blue', hex: '#1C1C22', parentSlug: 'blue' },
  // Purple-Blue sub-hues
  { slug: 'vivid-purple-blue', hex: '#5500FF', parentSlug: 'purple-blue' },
  { slug: 'strong-purple-blue', hex: '#5417CF', parentSlug: 'purple-blue' },
  { slug: 'deep-purple-blue', hex: '#380F8A', parentSlug: 'purple-blue' },
  { slug: 'very-deep-purple-blue', hex: '#220B50', parentSlug: 'purple-blue' },
  { slug: 'moderate-purple-blue', hex: '#6A40BF', parentSlug: 'purple-blue' },
  { slug: 'dark-purple-blue', hex: '#412A6F', parentSlug: 'purple-blue' },
  { slug: 'very-dark-purple-blue', hex: '#211736', parentSlug: 'purple-blue' },
  { slug: 'light-greyish-purple-blue', hex: '#BBB3CC', parentSlug: 'purple-blue' },
  { slug: 'greyish-purple-blue', hex: '#776699', parentSlug: 'purple-blue' },
  { slug: 'dark-greyish-purple-blue', hex: '#494158', parentSlug: 'purple-blue' },
  { slug: 'blackish-purple-blue', hex: '#1E1C22', parentSlug: 'purple-blue' },
  // Purple sub-hues
  { slug: 'vivid-purple', hex: '#FF00FF', parentSlug: 'purple' },
  { slug: 'strong-purple', hex: '#CF17CF', parentSlug: 'purple' },
  { slug: 'deep-purple', hex: '#8A0F8A', parentSlug: 'purple' },
  { slug: 'very-deep-purple', hex: '#500B50', parentSlug: 'purple' },
  { slug: 'moderate-purple', hex: '#BF40BF', parentSlug: 'purple' },
  { slug: 'dark-purple', hex: '#6F2A6F', parentSlug: 'purple' },
  { slug: 'very-dark-purple', hex: '#361736', parentSlug: 'purple' },
  { slug: 'light-greyish-purple', hex: '#CCB3CC', parentSlug: 'purple' },
  { slug: 'greyish-purple', hex: '#996699', parentSlug: 'purple' },
  { slug: 'dark-greyish-purple', hex: '#584158', parentSlug: 'purple' },
  { slug: 'blackish-purple', hex: '#221C22', parentSlug: 'purple' },
  // Red-Purple sub-hues
  { slug: 'vivid-red-purple', hex: '#FF0080', parentSlug: 'red-purple' },
  { slug: 'strong-red-purple', hex: '#CF1773', parentSlug: 'red-purple' },
  { slug: 'deep-red-purple', hex: '#8A0F4D', parentSlug: 'red-purple' },
  { slug: 'very-deep-red-purple', hex: '#500B2E', parentSlug: 'red-purple' },
  { slug: 'moderate-red-purple', hex: '#BF4080', parentSlug: 'red-purple' },
  { slug: 'dark-red-purple', hex: '#6F2A4D', parentSlug: 'red-purple' },
  { slug: 'very-dark-red-purple', hex: '#361726', parentSlug: 'red-purple' },
  { slug: 'light-greyish-red-purple', hex: '#CCB3BF', parentSlug: 'red-purple' },
  { slug: 'greyish-red-purple', hex: '#996680', parentSlug: 'red-purple' },
  { slug: 'dark-greyish-red-purple', hex: '#58414D', parentSlug: 'red-purple' },
  { slug: 'blackish-red-purple', hex: '#221C1F', parentSlug: 'red-purple' },
  // Neutral sub-hues
  { slug: 'white', hex: '#FFFFFF', parentSlug: 'neutral' },
  { slug: 'near-white', hex: '#F5F5F5', parentSlug: 'neutral' },
  { slug: 'light-grey', hex: '#C0C0C0', parentSlug: 'neutral' },
  { slug: 'medium-grey', hex: '#808080', parentSlug: 'neutral' },
  { slug: 'dark-grey', hex: '#404040', parentSlug: 'neutral' },
  { slug: 'near-black', hex: '#1A1A1A', parentSlug: 'neutral' },
  { slug: 'black', hex: '#000000', parentSlug: 'neutral' },
  { slug: 'brown', hex: '#8B4513', parentSlug: 'neutral' },
  { slug: 'dark-brown', hex: '#3B2F2F', parentSlug: 'neutral' },
  { slug: 'light-brown', hex: '#D2B48C', parentSlug: 'neutral' },
  { slug: 'ivory', hex: '#FFFFF0', parentSlug: 'neutral' },
]

// ---------------------------------------------------------------------------
// Map paintpad.app section slugs → our database sub-hue slugs
//
// Paintpad uses full ISCC-NBS naming (including near-neutral tones like
// "reddish grey", "dark reddish grey", "reddish black"). Our database uses
// a simplified 11-per-hue system. This map handles the conversions.
// ---------------------------------------------------------------------------

/**
 * Mapping of paintpad.app by-colour page slug → our Munsell principal hue slug.
 *
 * Some paintpad categories span hue boundaries; this maps to the primary hue.
 */
const PAGE_TO_PRINCIPAL_HUE: Record<string, string> = {
  'pink': 'red-purple',
  'red': 'red',
  'yellowish-pink': 'yellow-red',
  'reddish-orange': 'yellow-red',
  'reddish-brown': 'red',
  'orange': 'yellow-red',
  'brown': 'yellow-red',
  'orange-yellow': 'yellow',
  'yellowish-brown': 'yellow-red',
  'yellow': 'yellow',
  'olive-brown': 'yellow',
  'greenish-yellow': 'green-yellow',
  'olive': 'green-yellow',
  'yellow-green': 'green-yellow',
  'olive-green': 'green',
  'yellowish-green': 'green',
  'green': 'green',
  'bluish-green': 'blue-green',
  'greenish-blue': 'blue-green',
  'blue': 'blue',
  'purplish-blue': 'purple-blue',
  'violet': 'purple-blue',
  'purple': 'purple',
  'reddish-purple': 'red-purple',
  'purplish-pink': 'red-purple',
  'purplish-red': 'red-purple',
  'white': 'neutral',
  'grey': 'neutral',
  'black': 'neutral',
}

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  }
}

function rgbDistance(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number }
): number {
  const dr = a.r - b.r
  const dg = a.g - b.g
  const db = a.b - b.b
  return dr * dr + dg * dg + db * db
}

/**
 * Find the closest database sub-hue to a given hex color,
 * optionally restricting to a specific principal hue family.
 */
function findClosestSubHue(
  hex: string,
  restrictToParent?: string
): { slug: string; distance: number } {
  const target = hexToRgb(hex)
  const candidates = restrictToParent
    ? DB_SUB_HUES.filter((s) => s.parentSlug === restrictToParent)
    : DB_SUB_HUES

  let best = { slug: candidates[0].slug, distance: Infinity }
  for (const sub of candidates) {
    const d = rgbDistance(target, hexToRgb(sub.hex))
    if (d < best.distance) {
      best = { slug: sub.slug, distance: d }
    }
  }
  return best
}

// ---------------------------------------------------------------------------
// HTML parsing
// ---------------------------------------------------------------------------

interface PaintpadSection {
  /** Section h2 id slug (e.g., "vivid-red") */
  sectionSlug: string
  /** Section display name (e.g., "Vivid red") */
  sectionName: string
  /** Sub-hue sample hex from paint-sample--small span, if found */
  sampleHex: string | null
  /** Paint names in this section */
  paints: {
    name: string
    brand: string | null
    productLine: string | null
  }[]
}

interface PageResult {
  pageSlug: string
  principalHue: string
  sections: PaintpadSection[]
}

/**
 * Parse the HTML of a paintpad.app by-colour page into structured sections.
 *
 * Actual HTML structure:
 * ```html
 * <section class="page-section" id="vivid-red">
 *   <h2 class="page-section__heading">
 *     <span class="paint-sample paint-sample--small" style="background-color: #be0032"></span>
 *     <a href="#vivid-red" data-turbo="false">Vivid red</a>
 *   </h2>
 *   <ul>
 *     <li>
 *       ...
 *       <h3 class="paint-card__name">Paint Name</h3>
 *       <p class="paint-card__type">
 *         <a href="/paints/brand-slug">Brand Name</a>:
 *         Product Line
 *       </p>
 *     </li>
 *   </ul>
 * </section>
 * ```
 */
function parsePage(html: string, pageSlug: string): PageResult {
  const principalHue = PAGE_TO_PRINCIPAL_HUE[pageSlug] ?? 'neutral'
  const sections: PaintpadSection[] = []

  // Match each <section class="page-section" id="..."> ... </section>
  const sectionPattern =
    /<section\s+class="page-section"\s+id="([^"]+)">([\s\S]*?)<\/section>/gi
  const sectionMatches = [...html.matchAll(sectionPattern)]

  for (const match of sectionMatches) {
    const sectionSlug = match[1]
    const sectionHtml = match[2]

    // Extract section name from <a> inside h2
    const nameMatch = sectionHtml.match(
      /<a[^>]*data-turbo="false"[^>]*>([^<]+)<\/a>/i
    )
    const sectionName = nameMatch ? nameMatch[1].trim() : sectionSlug

    // Extract paint-sample hex color from span
    const sampleMatch = sectionHtml.match(
      /paint-sample--small"\s*style="background-color:\s*([^"]+)"/i
    )
    const sampleHex = sampleMatch ? sampleMatch[1].trim() : null

    // Extract paint names from h3.paint-card__name
    const paintNamePattern =
      /<h3\s+class="paint-card__name"[^>]*>([^<]+)<\/h3>/gi
    const paintNameMatches = [...sectionHtml.matchAll(paintNamePattern)]

    // Extract brand/product line from <p class="paint-card__type">
    // Allow whitespace/newlines between elements
    const cardPattern =
      /<h3\s+class="paint-card__name"[^>]*>([^<]+)<\/h3>\s*<p\s+class="paint-card__type">\s*<a[^>]*>([^<]*)<\/a>:\s*\n?\s*([^<\n]*)/gi
    const cardMatches = [...sectionHtml.matchAll(cardPattern)]

    const paints: PaintpadSection['paints'] = []

    if (cardMatches.length > 0) {
      for (const cm of cardMatches) {
        paints.push({
          name: cm[1].trim(),
          brand: cm[2]?.trim() ?? null,
          productLine: cm[3]?.trim() ?? null,
        })
      }
    } else {
      // Fallback: just extract paint names
      for (const pm of paintNameMatches) {
        paints.push({
          name: pm[1].trim(),
          brand: null,
          productLine: null,
        })
      }
    }

    sections.push({
      sectionSlug,
      sectionName,
      sampleHex,
      paints,
    })
  }

  return { pageSlug, principalHue, sections }
}

// ---------------------------------------------------------------------------
// Slug normalization: map paintpad section slugs to our DB sub-hue slugs
// ---------------------------------------------------------------------------

/**
 * Paintpad uses full ISCC-NBS sub-hue names as section IDs.
 * Our DB uses a simplified subset (11 per hue).
 *
 * Direct matches (e.g., "vivid-red" → "vivid-red") are used when available.
 * Near-neutral ISCC-NBS categories that don't exist in our DB are mapped
 * to the closest sub-hue by the section's sample hex color.
 */
function mapSectionToDbSubHue(
  section: PaintpadSection,
  principalHue: string
): string {
  // Check for direct match in our DB
  const directMatch = DB_SUB_HUES.find(
    (s) => s.slug === section.sectionSlug
  )
  if (directMatch) return directMatch.slug

  // If we have a sample hex, use it to find the closest sub-hue
  // within the principal hue family
  if (section.sampleHex) {
    const closest = findClosestSubHue(section.sampleHex, principalHue)
    return closest.slug
  }

  // Fallback: map common paintpad near-neutral patterns to our sub-hues
  const slug = section.sectionSlug
  if (slug.endsWith('-black') || slug.startsWith('blackish-')) {
    const family = DB_SUB_HUES.find(
      (s) => s.slug.startsWith('blackish-') && s.parentSlug === principalHue
    )
    return family?.slug ?? 'near-black'
  }
  if (slug.endsWith('-grey') && slug.startsWith('dark-')) {
    const family = DB_SUB_HUES.find(
      (s) =>
        s.slug.startsWith('dark-greyish-') && s.parentSlug === principalHue
    )
    return family?.slug ?? 'dark-grey'
  }
  if (slug.endsWith('-grey')) {
    const family = DB_SUB_HUES.find(
      (s) => s.slug.startsWith('greyish-') && s.parentSlug === principalHue
    )
    return family?.slug ?? 'medium-grey'
  }

  // Last resort: pick the moderate sub-hue for the family
  const moderate = DB_SUB_HUES.find(
    (s) => s.slug.startsWith('moderate-') && s.parentSlug === principalHue
  )
  return moderate?.slug ?? DB_SUB_HUES[0].slug
}

// ---------------------------------------------------------------------------
// Fetch with rate limiting
// ---------------------------------------------------------------------------

async function fetchPage(slug: string): Promise<string> {
  const url = `https://paintpad.app/paints/by-colour/${slug}`
  console.log(`Fetching: ${url}`)

  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; GrimifyDataBot/1.0; +https://grimify.app)',
      Accept: 'text/html',
    },
  })

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`)
  }

  return res.text()
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

interface HueAssignment {
  paintName: string
  brand: string | null
  productLine: string | null
  paintpadPage: string
  paintpadSection: string
  paintpadSectionHex: string | null
  dbSubHueSlug: string
  dbPrincipalHue: string
}

async function main(): Promise<void> {
  const allAssignments: HueAssignment[] = []
  const allPages: PageResult[] = []
  const sectionMappings: Record<
    string,
    { paintpadSection: string; sampleHex: string | null; dbSubHue: string }[]
  > = {}

  for (const slug of COLOUR_SLUGS) {
    try {
      const html = await fetchPage(slug)
      const page = parsePage(html, slug)
      allPages.push(page)

      const mappings: (typeof sectionMappings)[string] = []

      for (const section of page.sections) {
        const dbSubHue = mapSectionToDbSubHue(section, page.principalHue)

        mappings.push({
          paintpadSection: section.sectionSlug,
          sampleHex: section.sampleHex,
          dbSubHue,
        })

        for (const paint of section.paints) {
          allAssignments.push({
            paintName: paint.name,
            brand: paint.brand,
            productLine: paint.productLine,
            paintpadPage: slug,
            paintpadSection: section.sectionSlug,
            paintpadSectionHex: section.sampleHex,
            dbSubHueSlug: dbSubHue,
            dbPrincipalHue: page.principalHue,
          })
        }
      }

      sectionMappings[slug] = mappings

      console.log(
        `  → ${page.sections.length} sections, ${page.sections.reduce((sum, s) => sum + s.paints.length, 0)} paints`
      )
    } catch (err) {
      console.error(`  ✗ Error fetching ${slug}:`, err)
    }

    // Rate limit: 1 second between requests
    await sleep(1000)
  }

  // Build summary
  const output = {
    generatedAt: new Date().toISOString(),
    totalPaints: allAssignments.length,
    totalPages: allPages.length,
    totalSections: allPages.reduce((sum, p) => sum + p.sections.length, 0),
    sectionMappings,
    assignments: allAssignments,
  }

  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8')

  console.log(`\nDone!`)
  console.log(`  Pages fetched: ${allPages.length}`)
  console.log(`  Total sections: ${output.totalSections}`)
  console.log(`  Total paint assignments: ${allAssignments.length}`)
  console.log(`  Output: ${OUTPUT_FILE}`)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
