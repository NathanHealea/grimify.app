/**
 * Recalculates per-paint color data in the `paints` table so it agrees with
 * the color-wheel module's classification logic and the paintpad.app
 * sub-hue overrides.
 *
 * For every paint row, the script:
 *   1. Recomputes `r`, `g`, `b` from `hex` via {@link hexToRgb}.
 *   2. Recomputes `hue`, `saturation`, `lightness` via {@link rgbToHsl},
 *      rounded to two decimal places to match `generate-seed.ts`.
 *   3. Determines the target ISCC-NBS sub-hue slug:
 *        - if `scripts/data/hue-overrides.json` has an entry keyed by the
 *          paint's `brand_paint_id`, that slug wins;
 *        - otherwise {@link findClosestColor} picks the slug from the
 *          ISCC-NBS catalog by Munsell hue family + RGB distance.
 *   4. Applies {@link applyBlackPaintOverride} so very dark named-Black
 *      paints land on `black` / `near-black` rather than a chromatic slug.
 *   5. Resolves the final slug to `hue_id` via a single up-front fetch of
 *      the sub-hues table.
 *
 * Rows are updated only when at least one of `r`, `g`, `b`, `hue`,
 * `saturation`, `lightness`, `hue_id` differs from the recomputed value.
 *
 * Run with:
 *   npm run db:paints:recalculate           — apply changes
 *   npm run db:paints:recalculate -- --dry  — report changes without writing
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createClient } from '@supabase/supabase-js'

import {
  applyBlackPaintOverride,
  findClosestColor,
} from '../src/modules/color-wheel/utils/find-closest-hue'
import { hexToRgb, rgbToHsl } from '../src/modules/color-wheel/utils/hex-to-hsl'

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

interface PaintRow {
  id: string
  brand_paint_id: string
  name: string
  hex: string
  r: number
  g: number
  b: number
  hue: number
  saturation: number
  lightness: number
  hue_id: string | null
}

interface SubHueRow {
  id: string
  slug: string
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const HUE_OVERRIDES_PATH = resolve(__dirname, 'data', 'hue-overrides.json')

const PAGE_SIZE = 1000
const DRY_RUN = process.argv.includes('--dry') || process.argv.includes('--dry-run')

const round2 = (n: number): number => Math.round(n * 100) / 100

function loadHueOverrides(): Record<string, HueOverride> {
  try {
    const file: HueOverridesFile = JSON.parse(readFileSync(HUE_OVERRIDES_PATH, 'utf-8'))
    return file.overrides
  } catch {
    console.warn('No hue-overrides.json found; falling back to algorithmic hue assignment only')
    return {}
  }
}

async function main(): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SECRET_KEY
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY. Run with `node --env-file=.env npx tsx ...` or via the npm script.'
    )
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const overrides = loadHueOverrides()
  console.log(`Loaded ${Object.keys(overrides).length} paintpad hue overrides`)

  const { data: subHues, error: subHueErr } = await supabase
    .from('hues')
    .select('id, slug')
    .not('parent_id', 'is', null)
    .returns<SubHueRow[]>()
  if (subHueErr) throw subHueErr
  if (!subHues || subHues.length === 0) {
    throw new Error('No sub-hues found in public.hues — apply migrations first.')
  }
  const slugToHueId = new Map(subHues.map((h) => [h.slug, h.id]))
  console.log(`Loaded ${slugToHueId.size} sub-hues from the database`)

  let totalScanned = 0
  let totalChanged = 0
  let totalUnchanged = 0
  let totalErrors = 0
  let overrideCount = 0
  let algorithmicCount = 0
  const missingSlugs = new Set<string>()

  for (let from = 0; ; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1
    const { data: paints, error } = await supabase
      .from('paints')
      .select('id, brand_paint_id, name, hex, r, g, b, hue, saturation, lightness, hue_id')
      .order('id', { ascending: true })
      .range(from, to)
      .returns<PaintRow[]>()
    if (error) throw error
    if (!paints || paints.length === 0) break

    for (const paint of paints) {
      totalScanned++

      const { r, g, b } = hexToRgb(paint.hex)
      const { h, s, l } = rgbToHsl(r, g, b)
      const hue = round2(h)
      const saturation = round2(s)
      const lightness = round2(l)

      const override = overrides[paint.brand_paint_id]
      const baseSlug = override ? override.subHueSlug : findClosestColor(r, g, b, h, s)
      if (override) overrideCount++
      else algorithmicCount++

      const targetSlug = applyBlackPaintOverride(baseSlug, paint.name, l)
      const targetHueId = slugToHueId.get(targetSlug)
      if (!targetHueId) {
        missingSlugs.add(targetSlug)
        totalErrors++
        continue
      }

      const changed =
        paint.r !== r ||
        paint.g !== g ||
        paint.b !== b ||
        paint.hue !== hue ||
        paint.saturation !== saturation ||
        paint.lightness !== lightness ||
        paint.hue_id !== targetHueId

      if (!changed) {
        totalUnchanged++
        continue
      }

      totalChanged++

      if (DRY_RUN) continue

      const { error: updateErr } = await supabase
        .from('paints')
        .update({ r, g, b, hue, saturation, lightness, hue_id: targetHueId })
        .eq('id', paint.id)
      if (updateErr) {
        console.error(`Failed to update paint ${paint.id} (${paint.name}):`, updateErr.message)
        totalErrors++
        totalChanged--
      }
    }

    if (paints.length < PAGE_SIZE) break
  }

  console.log('')
  console.log('---------------------------------------------------------------')
  console.log(DRY_RUN ? 'Recalculation complete (DRY RUN, no writes)' : 'Recalculation complete')
  console.log('---------------------------------------------------------------')
  console.log(`  Scanned:     ${totalScanned}`)
  console.log(`  Changed:     ${totalChanged}${DRY_RUN ? ' (would update)' : ''}`)
  console.log(`  Unchanged:   ${totalUnchanged}`)
  console.log(`  Errors:      ${totalErrors}`)
  console.log(`  Overrides:   ${overrideCount} paintpad / ${algorithmicCount} algorithmic`)
  if (missingSlugs.size > 0) {
    console.log(`  Missing sub-hue slugs (not in hues table): ${[...missingSlugs].join(', ')}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
