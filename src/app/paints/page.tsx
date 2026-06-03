import { Main } from '@/components/main'
import { PageHeader, PageTitle, PageSubtitle } from '@/components/page-header'
import { createClient } from '@/lib/supabase/server'
import { getBrandService } from '@/modules/brands/services/brand-service.server'
import { getHueService } from '@/modules/hues/services/hue-service.server'
import { PaintExplorer } from '@/modules/paints/components/paint-explorer'
import { parseSortDir, parseSortField } from '@/modules/paints/utils/parse-sort-params'
import { getPaintService } from '@/modules/paints/services/paint-service.server'
import type { PaintFilterState } from '@/modules/paints/types/paint-filter-state'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'

export const metadata = pageMetadata({
  title: 'Paints',
  description:
    'Search Citadel, Vallejo, Army Painter, Scale75 and 10+ other brands by name, hex, or colour. Filter by brand, paint type, hue, and more. Compare swatches and track what you own.',
  path: '/paints',
  image: { url: '/og-image.png', width: 1200, height: 630, alt: 'Grimify — Find any miniature paint across every brand' },
  keywords: [
    'miniature paints',
    'Citadel paint database',
    'Vallejo paint database',
    'Army Painter paints',
    'Scale75 paints',
    'paint hex codes',
    'miniature paint search',
  ],
})

/** Valid page sizes that the paginated grid supports. */
const VALID_SIZES = [25, 50, 100, 200]

/** Parses a comma-separated string of numeric IDs into a number array. */
function parseIds(raw: string | undefined): number[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => !isNaN(n) && n > 0)
}

/** Parses a comma-separated string of type names into a lowercased string array. */
function parseTypes(raw: string | undefined): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

export default async function PaintsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string
    size?: string
    q?: string
    hue?: string
    brand?: string
    type?: string
    line?: string
    disc?: string
    metal?: string
    sort?: string
    dir?: string
  }>
}) {
  const { page, size, q, hue, brand, type, line, disc, metal, sort, dir } = await searchParams

  const pageSize = VALID_SIZES.includes(Number(size)) ? Number(size) : 50
  const currentPage = Math.max(1, parseInt(page ?? '1', 10) || 1)
  const offset = (currentPage - 1) * pageSize
  const query = q?.trim() ?? ''
  const [parentHueName, childHueName] = (hue ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
  const sortBy = parseSortField(sort)
  const sortDir = parseSortDir(dir)

  // Parse new filter params
  const brandIds = parseIds(brand)
  const paintTypes = parseTypes(type)
  const productLineIds = parseIds(line)
  const discontinued: PaintFilterState['discontinued'] =
    disc === 'exclude' || disc === 'only' ? disc : 'include'
  const metallicOnly = metal === '1'

  const initialFilters: PaintFilterState = {
    brandIds,
    paintTypes,
    productLineIds,
    discontinued,
    metallicOnly,
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const paintService = await getPaintService()
  const hueService = await getHueService()
  const brandService = await getBrandService()

  const [topLevelHues, allBrands, allBrandsWithProductLines, allPaintTypes] = await Promise.all([
    hueService.getHues(),
    brandService.getAllBrands(),
    brandService.getAllBrandsWithProductLines(),
    paintService.listDistinctPaintTypes(),
  ])

  // Flatten product lines from brands with product lines
  const allProductLines = allBrandsWithProductLines.flatMap((brand) =>
    brand.product_lines.map((pl) => ({
      id: pl.id,
      brand_id: pl.brand_id,
      name: pl.name,
    }))
  )

  // Resolve hue names from URL to IDs for the SSR prefetch
  const parentHue = parentHueName
    ? topLevelHues.find((h) => h.name.toLowerCase() === parentHueName)
    : undefined

  let hueIds: string[] | undefined

  if (parentHue) {
    const children = await hueService.getChildHues(parentHue.id)
    if (childHueName) {
      const child = children.find((h) => h.name.toLowerCase() === childHueName)
      if (child) hueIds = [child.id]
    }
    if (!hueIds) {
      hueIds = children.map((c) => c.id)
    }
  }

  // Single unified call for SSR prefetch — same logic the client hook uses
  const { paints: initialPaints, count: initialTotalCount } =
    await paintService.searchPaintsUnified({
      query: query || undefined,
      hueIds,
      brandIds: brandIds.length > 0 ? brandIds : undefined,
      paintTypes: paintTypes.length > 0 ? paintTypes : undefined,
      productLineIds: productLineIds.length > 0 ? productLineIds : undefined,
      discontinued: discontinued !== 'include' ? discontinued : undefined,
      metallicOnly: metallicOnly || undefined,
      scope: 'all',
      limit: pageSize,
      offset,
      sortBy,
      sortDir,
    })

  // Fetch user's collection paint IDs for toggle state (authenticated users only)
  let userPaintIds: Set<string> | undefined
  if (user) {
    const { data: userPaints } = await supabase
      .from('user_paints')
      .select('paint_id')
      .eq('user_id', user.id)
    userPaintIds = new Set(userPaints?.map((r) => r.paint_id) ?? [])
  }

  // Fetch paint counts per hue group and initial facet counts in parallel
  const [hueCountEntries, initialFacetCounts] = await Promise.all([
    Promise.all(
      topLevelHues.map(async (h) => {
        const count = await paintService.getPaintCountByHueGroup(h.id)
        return [h.name.toLowerCase(), count] as const
      })
    ),
    paintService.getPaintFacetCounts({
      query: query || undefined,
      hueIds,
      brandIds: brandIds.length > 0 ? brandIds : undefined,
      paintTypes: paintTypes.length > 0 ? paintTypes : undefined,
      productLineIds: productLineIds.length > 0 ? productLineIds : undefined,
      discontinued: discontinued !== 'include' ? discontinued : undefined,
      metallicOnly: metallicOnly || undefined,
    }),
  ])

  const huePaintCounts = Object.fromEntries(hueCountEntries)

  // Strip extra fields from brands to keep the client bundle small
  const brandsForClient = allBrands.map((b) => ({ id: b.id, name: b.name }))

  return (
    <Main>
      <PageHeader>
        <PageTitle>Paints</PageTitle>
        <PageSubtitle>Browse {initialTotalCount.toLocaleString()} paints.</PageSubtitle>
      </PageHeader>

      <PaintExplorer
        initialPaints={initialPaints}
        initialTotalCount={initialTotalCount}
        hues={topLevelHues}
        huePaintCounts={huePaintCounts}
        brands={brandsForClient}
        paintTypes={allPaintTypes}
        productLines={allProductLines}
        initialFilters={initialFilters}
        initialFacetCounts={initialFacetCounts}
        initialQuery={query}
        initialHue={hue ?? ''}
        initialPage={currentPage}
        initialSize={pageSize}
        initialSort={sortBy}
        initialDir={sortDir}
        isAuthenticated={!!user}
        userPaintIds={userPaintIds}
      />
    </Main>
  )
}
