import { createClient } from '@/lib/supabase/server'
import { getHueService } from '@/modules/hues/services/hue-service.server'
import { PaintExplorer } from '@/modules/paints/components/paint-explorer'
import { getPaintService } from '@/modules/paints/services/paint-service.server'
import { pageMetadata } from '@/modules/seo/utils/page-metadata'

export const metadata = pageMetadata({
  title: 'Paints',
  description:
    'Browse and search miniature paints across every supported brand. Filter by hue, compare swatches, and add to your collection.',
  path: '/paints',
})

/** Valid page sizes that the paginated grid supports. */
const VALID_SIZES = [25, 50, 100, 200]

export default async function PaintsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; size?: string; q?: string; hue?: string }>
}) {
  const { page, size, q, hue } = await searchParams
  const pageSize = VALID_SIZES.includes(Number(size)) ? Number(size) : 50
  const currentPage = Math.max(1, parseInt(page ?? '1', 10) || 1)
  const offset = (currentPage - 1) * pageSize
  const query = q?.trim() ?? ''
  const [parentHueName, childHueName] = (hue ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const paintService = await getPaintService()
  const hueService = await getHueService()

  const [topLevelHues] = await Promise.all([hueService.getHues()])

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
      scope: 'all',
      limit: pageSize,
      offset,
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

  // Fetch paint counts per hue group for the filter bar
  const hueCountEntries = await Promise.all(
    topLevelHues.map(async (h) => {
      const count = await paintService.getPaintCountByHueGroup(h.id)
      return [h.name.toLowerCase(), count] as const
    })
  )
  const huePaintCounts = Object.fromEntries(hueCountEntries)

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <div className="mb-8 flex flex-col gap-4">
        <h1 className="text-3xl font-bold">Paints</h1>
        <p className="text-sm text-muted-foreground">
          Browse {initialTotalCount.toLocaleString()} paints.
        </p>
      </div>

      <PaintExplorer
        initialPaints={initialPaints}
        initialTotalCount={initialTotalCount}
        hues={topLevelHues}
        huePaintCounts={huePaintCounts}
        initialQuery={query}
        initialHue={hue ?? ''}
        initialPage={currentPage}
        initialSize={pageSize}
        isAuthenticated={!!user}
        userPaintIds={userPaintIds}
      />
    </div>
  )
}
