'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { ChildHueCard } from '@/modules/hues/components/child-hue-card'
import { IttenHueCard } from '@/modules/hues/components/itten-hue-card'
import { getHueService } from '@/modules/hues/services/hue-service.client'
import { PaginatedPaintGrid } from '@/modules/paints/components/paginated-paint-grid'
import { getPaintService } from '@/modules/paints/services/paint-service.client'
import type { PaintWithBrand } from '@/modules/paints/services/paint-service'
import type { IttenHue } from '@/types/color'

/**
 * Interactive paint explorer component with search, hue filtering, and pagination.
 *
 * Owns all interactive state on `/paints` and orchestrates search, hue filtering,
 * and pagination without page navigation. State syncs to URL search params for
 * shareable, bookmarkable views.
 *
 * @param props.initialPaints - First page of paints (server-rendered for hydration).
 * @param props.initialTotalCount - Total paint count for the initial unfiltered view.
 * @param props.ittenHues - All top-level Itten hues (server-fetched to avoid client round-trip).
 * @param props.huePaintCounts - Paint count per top-level hue group (server-fetched).
 */
export function PaintExplorer({
  initialPaints,
  initialTotalCount,
  ittenHues,
  huePaintCounts,
}: {
  initialPaints: PaintWithBrand[]
  initialTotalCount: number
  ittenHues: IttenHue[]
  huePaintCounts: Record<string, number>
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Parse URL params for initial state
  const initialQuery = searchParams.get('q') ?? ''
  const hueParam = searchParams.get('hue') ?? ''
  const [initialParentHueName, initialChildHueName] = hueParam
    .split(',')
    .map((s) => s.trim().toLowerCase())

  // --- Internal state ---
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery)
  const [selectedHueName, setSelectedHueName] = useState<string | null>(
    initialParentHueName || null
  )
  const [selectedChildHueName, setSelectedChildHueName] = useState<string | null>(
    initialChildHueName || null
  )
  const [childHues, setChildHues] = useState<IttenHue[]>([])
  const [childHuePaintCounts, setChildHuePaintCounts] = useState<Record<string, number>>({})
  const [gridPaints, setGridPaints] = useState<PaintWithBrand[]>(initialPaints)
  const [gridTotalCount, setGridTotalCount] = useState(initialTotalCount)
  const [isFiltering, setIsFiltering] = useState(false)

  // --- Hue name → ID resolution ---
  const resolveParentHueId = useCallback(
    (name: string | null): string | null => {
      if (!name) return null
      const hue = ittenHues.find((h) => h.name.toLowerCase() === name.toLowerCase())
      return hue?.id ?? null
    },
    [ittenHues]
  )

  const resolveChildHueId = useCallback(
    (name: string | null): string | null => {
      if (!name) return null
      const hue = childHues.find((h) => h.name.toLowerCase() === name.toLowerCase())
      return hue?.id ?? null
    },
    [childHues]
  )

  // --- URL sync ---
  const updateUrl = useCallback(
    (params: { q?: string; hue?: string; resetPage?: boolean }) => {
      const next = new URLSearchParams(searchParams.toString())

      if (params.q !== undefined) {
        if (params.q) {
          next.set('q', params.q)
        } else {
          next.delete('q')
        }
      }

      if (params.hue !== undefined) {
        if (params.hue) {
          next.set('hue', params.hue)
        } else {
          next.delete('hue')
        }
      }

      if (params.resetPage) {
        next.delete('page')
      }

      const qs = next.toString()
      router.replace(qs ? `/paints?${qs}` : '/paints', { scroll: false })
    },
    [router, searchParams]
  )

  // --- Debounce ---
  useEffect(() => {
    if (searchQuery.length > 0 && searchQuery.length < 3) return
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // --- Fetch child hues when parent hue changes ---
  useEffect(() => {
    const parentHueId = resolveParentHueId(selectedHueName)
    if (!parentHueId) {
      setChildHues([])
      setChildHuePaintCounts({})
      return
    }

    let cancelled = false

    async function fetchChildren() {
      const hueService = getHueService()
      const paintService = getPaintService()
      const children = await hueService.getChildHues(parentHueId!)

      if (cancelled) return

      setChildHues(children)

      // Fetch paint counts for each child hue in parallel
      const entries = await Promise.all(
        children.map(async (child) => {
          const count = await paintService.getPaintCountByIttenHueId(child.id)
          return [child.name.toLowerCase(), count] as const
        })
      )

      if (cancelled) return

      setChildHuePaintCounts(Object.fromEntries(entries))
    }

    fetchChildren()
    return () => {
      cancelled = true
    }
  }, [selectedHueName, resolveParentHueId])

  // --- Fetch paints when filters change ---
  // Also depends on childHues so that URL-restored child hue names can be resolved
  // once the child hue list has been fetched.
  useEffect(() => {
    const parentHueId = resolveParentHueId(selectedHueName)
    const childHueId = resolveChildHueId(selectedChildHueName)

    // If a child hue is selected but can't be resolved yet (child hues not loaded),
    // wait for the child hues effect to populate the list first.
    if (selectedChildHueName && !childHueId && selectedHueName) {
      return
    }

    // Build hue param string for URL
    let hueParam = ''
    if (selectedHueName) {
      hueParam = selectedHueName
      if (selectedChildHueName) {
        hueParam += `,${selectedChildHueName}`
      }
    }

    updateUrl({ q: debouncedQuery, hue: hueParam, resetPage: true })

    // Skip initial fetch if we already have the right data
    const isInitialState =
      !debouncedQuery && !selectedHueName && !selectedChildHueName

    if (isInitialState) {
      setGridPaints(initialPaints)
      setGridTotalCount(initialTotalCount)
      setIsFiltering(false)
      return
    }

    let cancelled = false
    setIsFiltering(true)

    async function fetchFiltered() {
      const paintService = getPaintService()

      let paints: PaintWithBrand[] = []
      let count = 0

      if (debouncedQuery) {
        // Search with optional hue scoping
        let hueIds: string[] | undefined
        let hueId: string | undefined

        if (childHueId) {
          hueId = childHueId
        } else if (parentHueId) {
          // Get all child IDs for the parent hue group
          const hueService = getHueService()
          const children = await hueService.getChildHues(parentHueId)
          hueIds = children.map((c) => c.id)
        }

        const result = await paintService.searchPaints({
          query: debouncedQuery,
          hueId,
          hueIds,
          limit: 50,
          offset: 0,
        })
        paints = result.paints
        count = result.count
      } else if (childHueId) {
        // Child hue filter only
        const [data, total] = await Promise.all([
          paintService.getPaintsByIttenHueId(childHueId, { limit: 50, offset: 0 }),
          paintService.getPaintCountByIttenHueId(childHueId),
        ])
        paints = data
        count = total
      } else if (parentHueId) {
        // Parent hue group filter only
        const [data, total] = await Promise.all([
          paintService.getPaintsByHueGroup(parentHueId, { limit: 50, offset: 0 }),
          paintService.getPaintCountByHueGroup(parentHueId),
        ])
        paints = data
        count = total
      }

      if (cancelled) return

      setGridPaints(paints)
      setGridTotalCount(count)
      setIsFiltering(false)
    }

    fetchFiltered()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, selectedHueName, selectedChildHueName, childHues])

  // --- fetchPaints callback for PaginatedPaintGrid pagination ---
  const fetchPaintsWithFilters = useCallback(
    async (options: { limit: number; offset: number }): Promise<PaintWithBrand[]> => {
      const paintService = getPaintService()
      const parentHueId = resolveParentHueId(selectedHueName)
      const childHueId = resolveChildHueId(selectedChildHueName)

      if (debouncedQuery) {
        let hueIds: string[] | undefined
        let hueId: string | undefined

        if (childHueId) {
          hueId = childHueId
        } else if (parentHueId) {
          const hueService = getHueService()
          const children = await hueService.getChildHues(parentHueId)
          hueIds = children.map((c) => c.id)
        }

        const result = await paintService.searchPaints({
          query: debouncedQuery,
          hueId,
          hueIds,
          limit: options.limit,
          offset: options.offset,
        })
        return result.paints
      } else if (childHueId) {
        return paintService.getPaintsByIttenHueId(childHueId, options)
      } else if (parentHueId) {
        return paintService.getPaintsByHueGroup(parentHueId, options)
      }

      return paintService.getAllPaints(options)
    },
    [debouncedQuery, selectedHueName, selectedChildHueName, resolveParentHueId, resolveChildHueId]
  )

  // --- Hue selection handlers ---
  const handleSelectParentHue = useCallback(
    (hueName: string) => {
      if (selectedHueName === hueName) {
        // Deselect
        setSelectedHueName(null)
        setSelectedChildHueName(null)
        setChildHues([])
        setChildHuePaintCounts({})
      } else {
        // Select new parent
        setSelectedHueName(hueName)
        setSelectedChildHueName(null)
      }
    },
    [selectedHueName]
  )

  const handleSelectChildHue = useCallback(
    (hueName: string) => {
      if (selectedChildHueName === hueName) {
        // Deselect child only
        setSelectedChildHueName(null)
      } else {
        setSelectedChildHueName(hueName)
      }
    },
    [selectedChildHueName]
  )

  // --- Clear All ---
  const handleClearAll = useCallback(() => {
    setSearchQuery('')
    setDebouncedQuery('')
    setSelectedHueName(null)
    setSelectedChildHueName(null)
    setChildHues([])
    setChildHuePaintCounts({})
    setGridPaints(initialPaints)
    setGridTotalCount(initialTotalCount)

    const next = new URLSearchParams(searchParams.toString())
    next.delete('q')
    next.delete('hue')
    next.delete('page')
    const qs = next.toString()
    router.replace(qs ? `/paints?${qs}` : '/paints', { scroll: false })
  }, [initialPaints, initialTotalCount, router, searchParams])

  const hasActiveFilters = !!searchQuery || !!selectedHueName

  // Grid key forces remount when filters change, resetting PaginatedPaintGrid internal state
  const gridKey = `${debouncedQuery}-${selectedHueName ?? ''}-${selectedChildHueName ?? ''}`

  return (
    <div className="flex flex-col gap-6">
      {/* Search + Clear All row */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Search paints by name, brand, or type..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input flex-1"
        />
        {hasActiveFilters && (
          <button onClick={handleClearAll} className="btn btn-ghost shrink-0">
            Clear All
          </button>
        )}
      </div>

      {/* Top-level hue pills */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {ittenHues.map((hue) => (
          <IttenHueCard
            key={hue.id}
            hue={hue}
            paintCount={huePaintCounts[hue.name.toLowerCase()] ?? 0}
            isSelected={selectedHueName === hue.name.toLowerCase()}
            onSelect={() => handleSelectParentHue(hue.name.toLowerCase())}
          />
        ))}
      </div>

      {/* Child hue pills (conditional) */}
      {childHues.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {childHues.map((hue) => (
            <ChildHueCard
              key={hue.id}
              hue={hue}
              paintCount={childHuePaintCounts[hue.name.toLowerCase()] ?? 0}
              isSelected={selectedChildHueName === hue.name.toLowerCase()}
              onSelect={() => handleSelectChildHue(hue.name.toLowerCase())}
            />
          ))}
        </div>
      )}

      {/* Paint grid with loading state */}
      <div className={isFiltering ? 'opacity-50 transition-opacity' : ''}>
        <PaginatedPaintGrid
          key={gridKey}
          initialPaints={gridPaints}
          totalCount={gridTotalCount}
          basePath="/paints"
          fetchPaints={fetchPaintsWithFilters}
        />
      </div>
    </div>
  )
}
