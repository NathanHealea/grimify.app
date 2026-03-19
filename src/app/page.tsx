'use client'

import { useMemo } from 'react'

import { Bars3Icon } from '@heroicons/react/24/outline'

import BrandFilterPanel from '@/components/BrandFilterPanel'
import BrandLegend from '@/components/BrandLegend'
import BrandRingToggle from '@/components/BrandRingToggle'
import CollectionPanel from '@/components/CollectionPanel'
import ColorSchemePanel from '@/components/ColorSchemePanel'
import ColorWheel from '@/components/ColorWheel'
import DetailPanel from '@/components/DetailPanel'
import GridView from '@/components/GridView'
import SearchBar from '@/components/SearchBar'
import Sidebar, { useIsDesktop } from '@/components/Sidebar'
import StatsOverlay from '@/components/StatsOverlay'
import { paints } from '@/data/index'
import { useBrandPaintCounts, usePaintGroups, useProcessedPaints } from '@/hooks/useDerivedPaints'
import { useFilteredCounts, useSchemeMatching, useSearchResults } from '@/hooks/useFilteredPaints'
import { useCollectionStore } from '@/stores/useCollectionStore'
import { selectIsSearching, useFilterStore } from '@/stores/useFilterStore'
import { usePaintStore } from '@/stores/usePaintStore'
import { getEffectiveTabFromState, useUIStore } from '@/stores/useUIStore'

export default function Home() {
  const isDesktop = useIsDesktop()

  // Store state
  const selectedGroup = usePaintStore((s) => s.selectedGroup)
  const selectedPaint = usePaintStore((s) => s.selectedPaint)
  const hoveredGroup = usePaintStore((s) => s.hoveredGroup)
  const paintToRemove = usePaintStore((s) => s.paintToRemove)
  const viewMode = usePaintStore((s) => s.viewMode)
  const setViewMode = usePaintStore((s) => s.setViewMode)
  const selectPaint = usePaintStore((s) => s.selectPaint)
  const selectSearchResult = usePaintStore((s) => s.selectSearchResult)
  const setPaintToRemove = usePaintStore((s) => s.setPaintToRemove)

  const colorScheme = useFilterStore((s) => s.colorScheme)
  const isSearching = useFilterStore(selectIsSearching)

  const sidebarState = useUIStore((s) => s.sidebarState)
  const toggleTab = useUIStore((s) => s.toggleTab)
  const toggleMenu = useUIStore((s) => s.toggleMenu)
  const closeSidebar = useUIStore((s) => s.closeSidebar)
  const zoom = useUIStore((s) => s.zoom)
  const resetView = useUIStore((s) => s.resetView)

  const toggleOwned = useCollectionStore((s) => s.toggleOwned)

  // Derived data
  const processedPaints = useProcessedPaints()
  const paintGroups = usePaintGroups(processedPaints)
  const brandPaintCounts = useBrandPaintCounts(processedPaints)
  const uniqueColorCount = useMemo(() => new Set(paints.map((p) => p.hex.toLowerCase())).size, [])

  const { searchResults, searchMatchIds } = useSearchResults(processedPaints)
  const { isSchemeMatching, schemeMatches } = useSchemeMatching(processedPaints)
  const { filteredPaintCount, filteredColorCount, isAnyFilterActive } = useFilteredCounts(
    processedPaints,
    paintGroups,
    uniqueColorCount,
    searchMatchIds,
    isSchemeMatching,
  )

  const effectiveTab = getEffectiveTabFromState(sidebarState, isDesktop)
  const displayGroup = hoveredGroup ?? selectedGroup

  return (
    <div className='flex h-screen w-screen flex-col overflow-hidden'>
      {/* Top bar */}
      <nav className='navbar min-h-0 border-b border-base-300 bg-base-200 px-2 py-4'>
        <div className='navbar-start w-auto'>
          <button
            className='btn btn-ghost btn-sm'
            onClick={() => toggleMenu(isDesktop)}
            aria-label={effectiveTab ? 'Close sidebar' : 'Open sidebar'}>
            <Bars3Icon className='size-5' />
          </button>
        </div>

        <div className='navbar-center flex-1 px-3'>
          <SearchBar />
        </div>
      </nav>

      <div className='flex flex-1 overflow-hidden'>
        {/* Vertical tab strip */}
        <div className='flex flex-col border-r border-base-300 bg-base-200'>
          <button
            className={`flex h-24 w-10 items-center justify-center border-b border-base-300 transition-colors ${
              effectiveTab === 'filters' ? 'bg-base-300 text-base-content' : 'text-base-content/60 hover:bg-base-300/50'
            }`}
            onClick={() => toggleTab('filters', isDesktop)}
            aria-label='Toggle Filters sidebar'>
            <span className='text-xs font-semibold tracking-wider [writing-mode:vertical-lr]'>Filters</span>
          </button>
          <button
            className={`flex h-24 w-10 items-center justify-center border-b border-base-300 transition-colors ${
              effectiveTab === 'collection'
                ? 'bg-base-300 text-base-content'
                : 'text-base-content/60 hover:bg-base-300/50'
            }`}
            onClick={() => toggleTab('collection', isDesktop)}
            aria-label='Toggle Collection sidebar'>
            <span className='text-xs font-semibold tracking-wider [writing-mode:vertical-lr]'>Collection</span>
          </button>
        </div>

        {/* Filters sidebar */}
        <Sidebar isOpen={effectiveTab === 'filters'} onClose={closeSidebar} title='Filters'>
          {/* Brand Ring Toggle */}
          <BrandRingToggle />

          <div className='divider' />

          {/* Brand Legend */}
          <section>
            <h3 className='mb-2 text-xs font-semibold uppercase text-base-content/60'>Brands</h3>
            <BrandLegend paintCounts={brandPaintCounts} />
          </section>

          <div className='divider' />

          {/* Brand Filter */}
          <BrandFilterPanel />

          <div className='divider' />

          {/* Color Scheme Mode */}
          <ColorSchemePanel />

          <div className='divider' />

          {/* Color Details */}
          <section>
            <h3 className='mb-2 text-xs font-semibold uppercase text-base-content/60'>Color Details</h3>
            <DetailPanel
              group={displayGroup}
              selectedPaint={hoveredGroup ? null : selectedPaint}
              onSelectPaint={(paint) => {
                if (isSearching) selectSearchResult(paint, paintGroups)
                else if (displayGroup) selectPaint(paint, displayGroup)
              }}
              onBack={() => usePaintStore.setState({ selectedPaint: null })}
              matches={isSearching ? searchResults : schemeMatches}
              hasSearch={isSearching}
              scheme={colorScheme}
            />
          </section>
        </Sidebar>

        {/* Collection sidebar */}
        <Sidebar isOpen={effectiveTab === 'collection'} onClose={closeSidebar} title='Collection'>
          <CollectionPanel
            processedPaints={processedPaints}
            onSelectPaint={(paint) => {
              selectSearchResult(paint, paintGroups)
              if (!isDesktop) closeSidebar()
            }}
          />
        </Sidebar>

        <main className='relative flex-1 overflow-hidden'>
          {/* View mode toggle */}
          <div className='absolute top-4 right-4 z-10'>
            <div className='join'>
              <button
                className={`join-item btn btn-sm ${viewMode === 'wheel' ? 'btn-active' : ''}`}
                onClick={() => setViewMode('wheel')}>
                Wheel
              </button>
              <button
                className={`join-item btn btn-sm ${viewMode === 'grid' ? 'btn-active' : ''}`}
                onClick={() => setViewMode('grid')}>
                Grid
              </button>
            </div>
          </div>

          {viewMode === 'wheel' ? (
            <ColorWheel paintGroups={paintGroups} searchMatchIds={searchMatchIds} isSchemeMatching={isSchemeMatching} />
          ) : (
            <GridView paintGroups={paintGroups} searchMatchIds={searchMatchIds} isSchemeMatching={isSchemeMatching} />
          )}

          {/* Stats overlay */}
          <StatsOverlay
            filteredPaintCount={filteredPaintCount}
            filteredColorCount={filteredColorCount}
            isAnyFilterActive={isAnyFilterActive}
          />

          {/* Reset button (wheel mode only) */}
          {viewMode === 'wheel' && (
            <button
              onClick={resetView}
              className='btn btn-ghost btn-sm absolute right-4 bottom-4 bg-base-300/50 backdrop-blur-sm'>
              Reset View
            </button>
          )}

          {/* Zoom indicator (wheel mode only) */}
          {viewMode === 'wheel' && (
            <div className='absolute bottom-4 left-4 text-xs text-base-content/40'>{zoom.toFixed(1)}x</div>
          )}
        </main>
      </div>

      {/* Remove from collection confirmation dialog */}
      {paintToRemove && (
        <dialog className='modal modal-open'>
          <div className='modal-box'>
            <h3 className='text-lg font-bold'>Remove from Collection</h3>
            <p className='py-4'>
              Remove <strong>{paintToRemove.name}</strong> from your collection?
            </p>
            <div className='modal-action'>
              <button className='btn btn-outline' onClick={() => setPaintToRemove(null)}>
                Cancel
              </button>
              <button
                className='btn btn-error'
                onClick={() => {
                  toggleOwned(paintToRemove.id)
                  setPaintToRemove(null)
                }}>
                Remove
              </button>
            </div>
          </div>
          <form method='dialog' className='modal-backdrop'>
            <button onClick={() => setPaintToRemove(null)}>close</button>
          </form>
        </dialog>
      )}
    </div>
  )
}
