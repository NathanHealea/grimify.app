'use client';

import { useCallback, useMemo, useState } from 'react';

import { Bars3Icon } from '@heroicons/react/24/outline';

import BrandFilterPanel from '@/components/BrandFilterPanel';
import BrandLegend from '@/components/BrandLegend';
import BrandRingToggle from '@/components/BrandRingToggle';
import CollectionPanel from '@/components/CollectionPanel';
import ColorSchemePanel from '@/components/ColorSchemePanel';
import ColorWheel from '@/components/ColorWheel';
import DetailPanel from '@/components/DetailPanel';
import GridView from '@/components/GridView';
import SearchBar from '@/components/SearchBar';
import Sidebar, { useIsDesktop } from '@/components/Sidebar';
import StatsOverlay from '@/components/StatsOverlay';
import { brands, paints } from '@/data/index';
import { useDerivedFilters } from '@/hooks/useDerivedFilters';
import { useFilterState } from '@/hooks/useFilterState';
import { useOwnedPaints } from '@/hooks/useOwnedPaints';
import type { PaintGroup, ProcessedPaint } from '@/types/paint';
import { hexToHsl, paintToWheelPosition, WHEEL_RADIUS } from '@/utils/colorUtils';

type SidebarTab = 'filters' | 'collection';
type SidebarState = SidebarTab | 'closed' | null; // null = derive from screen size

export default function Home() {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isDesktop = useIsDesktop();
  const [sidebarState, setSidebarState] = useState<SidebarState>(null);
  const [lastTab, setLastTab] = useState<SidebarTab>('filters');
  const [selectedGroup, setSelectedGroup] = useState<PaintGroup | null>(null);
  const [selectedPaint, setSelectedPaint] = useState<ProcessedPaint | null>(null);
  const [hoveredGroup, setHoveredGroup] = useState<PaintGroup | null>(null);
  const [paintToRemove, setPaintToRemove] = useState<ProcessedPaint | null>(null);
  const [viewMode, setViewMode] = useState<'wheel' | 'grid'>('wheel');

  const { ownedIds, toggleOwned } = useOwnedPaints();

  const resetSelection = useCallback(() => {
    setSelectedGroup(null);
    setSelectedPaint(null);
  }, []);

  const filterState = useFilterState({ onSelectionReset: resetSelection });
  const {
    brandFilter,
    colorScheme,
    searchQuery,
    ownedFilter,
    showBrandRing,
    showOwnedRing,
    handleBrandFilter,
    setColorScheme,
    setSearchQuery,
    clearSearch,
    toggleOwnedFilter,
    toggleBrandRing,
    toggleOwnedRing,
    isFiltered,
    isSearching,
  } = filterState;

  const uniqueColorCount = useMemo(() => new Set(paints.map((p) => p.hex.toLowerCase())).size, []);

  // null = derive from screen size, 'closed' = explicitly closed
  const effectiveTab: SidebarTab | null =
    sidebarState === null ? (isDesktop ? 'filters' : null) : sidebarState === 'closed' ? null : sidebarState;

  const handleTabToggle = useCallback(
    (tab: SidebarTab) => {
      setSidebarState((prev) => {
        const current = prev === null ? (isDesktop ? 'filters' : null) : prev === 'closed' ? null : prev;
        if (current === tab) return 'closed';
        setLastTab(tab);
        return tab;
      });
    },
    [isDesktop],
  );

  const handleMenuToggle = useCallback(() => {
    setSidebarState((prev) => {
      const current = prev === null ? (isDesktop ? 'filters' : null) : prev === 'closed' ? null : prev;
      if (current !== null) return 'closed';
      const reopenTab = lastTab;
      return reopenTab;
    });
  }, [isDesktop, lastTab]);

  const processedPaints = useMemo<ProcessedPaint[]>(
    () =>
      paints.map((paint) => {
        const hsl = hexToHsl(paint.hex);
        const pos = paintToWheelPosition(hsl.h, hsl.l, WHEEL_RADIUS);
        return {
          ...paint,
          id: `${paint.brand}-${paint.name}-${paint.type}`.toLowerCase().replace(/\s+/g, '-'),
          x: pos.x,
          y: pos.y,
        };
      }),
    [],
  );

  const brandPaintCounts = useMemo(() => {
    const counts = new Map<string, number>();
    brands.forEach((b) => counts.set(b.id, 0));
    processedPaints.forEach((p) => {
      counts.set(p.brand, (counts.get(p.brand) ?? 0) + 1);
    });
    return counts;
  }, [processedPaints]);

  const paintGroups = useMemo<PaintGroup[]>(() => {
    const map = new Map<string, ProcessedPaint[]>();
    processedPaints.forEach((p) => {
      const key = p.hex.toLowerCase();
      const list = map.get(key) ?? [];
      list.push(p);
      map.set(key, list);
    });
    return Array.from(map.entries()).map(([key, paints]) => ({
      key,
      paints,
      rep: paints[0],
    }));
  }, [processedPaints]);

  const {
    searchResults,
    searchMatchIds,
    schemeMatches,
    isSchemeMatching,
    isAnyFilterActive,
    filteredPaintCount,
    filteredColorCount,
  } = useDerivedFilters({
    processedPaints,
    paintGroups,
    uniqueColorCount,
    brandFilter,
    searchQuery,
    colorScheme,
    selectedPaint,
    ownedFilter,
    ownedIds,
    isFiltered,
    isSearching,
  });

  const handleReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleGroupClick = useCallback(
    (group: PaintGroup | null) => {
      if (!group) {
        setSelectedGroup(null);
        setSelectedPaint(null);
        setColorScheme('none');
        return;
      }
      if (selectedGroup?.key === group.key) {
        setSelectedGroup(null);
        setSelectedPaint(null);
        setColorScheme('none');
      } else if (group.paints.length === 1) {
        setSelectedGroup(group);
        setSelectedPaint(group.rep);
      } else {
        setSelectedGroup(group);
        setSelectedPaint(null);
      }
    },
    [selectedGroup, setColorScheme],
  );

  const handleSelectPaintFromGroup = useCallback((paint: ProcessedPaint, group: PaintGroup) => {
    setSelectedGroup(group);
    setSelectedPaint(paint);
  }, []);

  const handleSelectSearchResult = useCallback(
    (paint: ProcessedPaint) => {
      const group = paintGroups.find((g) => g.paints.some((p) => p.id === paint.id));
      if (group) {
        setSelectedGroup(group);
        setSelectedPaint(paint);
      }
    },
    [paintGroups],
  );

  const displayGroup = hoveredGroup ?? selectedGroup;

  return (
    <div className='flex h-screen w-screen flex-col overflow-hidden'>
      {/* Top bar */}
      <nav className='navbar min-h-0 border-b border-base-300 bg-base-200 px-2 py-4'>
        <div className='navbar-start w-auto'>
          <button
            className='btn btn-ghost btn-sm'
            onClick={handleMenuToggle}
            aria-label={effectiveTab ? 'Close sidebar' : 'Open sidebar'}>
            <Bars3Icon className='size-5' />
          </button>
        </div>

        <div className='navbar-center flex-1 px-3'>
          <SearchBar searchQuery={searchQuery} onSearchChange={setSearchQuery} onClear={clearSearch} />
        </div>
      </nav>

      <div className='flex flex-1 overflow-hidden'>
        {/* Vertical tab strip */}
        <div className='flex flex-col border-r border-base-300 bg-base-200'>
          <button
            className={`flex h-24 w-10 items-center justify-center border-b border-base-300 transition-colors ${
              effectiveTab === 'filters' ? 'bg-base-300 text-base-content' : 'text-base-content/60 hover:bg-base-300/50'
            }`}
            onClick={() => handleTabToggle('filters')}
            aria-label='Toggle Filters sidebar'>
            <span className='text-xs font-semibold tracking-wider [writing-mode:vertical-lr]'>Filters</span>
          </button>
          <button
            className={`flex h-24 w-10 items-center justify-center border-b border-base-300 transition-colors ${
              effectiveTab === 'collection'
                ? 'bg-base-300 text-base-content'
                : 'text-base-content/60 hover:bg-base-300/50'
            }`}
            onClick={() => handleTabToggle('collection')}
            aria-label='Toggle Collection sidebar'>
            <span className='text-xs font-semibold tracking-wider [writing-mode:vertical-lr]'>Collection</span>
          </button>
        </div>

        {/* Filters sidebar */}
        <Sidebar isOpen={effectiveTab === 'filters'} onClose={() => setSidebarState('closed')} title='Filters'>
          {/* Brand Ring Toggle */}
          <BrandRingToggle showBrandRing={showBrandRing} onToggle={toggleBrandRing} />

          <div className='divider' />

          {/* Brand Legend */}
          <section>
            <h3 className='mb-2 text-xs font-semibold uppercase text-base-content/60'>Brands</h3>
            <BrandLegend brands={brands} paintCounts={brandPaintCounts} />
          </section>

          <div className='divider' />

          {/* Brand Filter */}
          <BrandFilterPanel
            brands={brands}
            brandFilter={brandFilter}
            isFiltered={isFiltered}
            onBrandFilter={handleBrandFilter}
          />

          <div className='divider' />

          {/* Color Scheme Mode */}
          <ColorSchemePanel colorScheme={colorScheme} onSchemeChange={setColorScheme} selectedPaint={selectedPaint} />

          <div className='divider' />

          {/* Color Details */}
          <section>
            <h3 className='mb-2 text-xs font-semibold uppercase text-base-content/60'>Color Details</h3>
            <DetailPanel
              group={displayGroup}
              selectedPaint={hoveredGroup ? null : selectedPaint}
              onSelectPaint={(paint) => {
                if (isSearching) handleSelectSearchResult(paint);
                else if (displayGroup) handleSelectPaintFromGroup(paint, displayGroup);
              }}
              onBack={() => setSelectedPaint(null)}
              brands={brands}
              matches={isSearching ? searchResults : schemeMatches}
              hasSearch={isSearching}
              scheme={colorScheme}
              ownedIds={ownedIds}
              onToggleOwned={toggleOwned}
            />
          </section>
        </Sidebar>

        {/* Collection sidebar */}
        <Sidebar isOpen={effectiveTab === 'collection'} onClose={() => setSidebarState('closed')} title='Collection'>
          <CollectionPanel
            processedPaints={processedPaints}
            ownedIds={ownedIds}
            onToggleOwned={toggleOwned}
            onSelectPaint={(paint) => {
              handleSelectSearchResult(paint);
              if (!isDesktop) setSidebarState('closed');
            }}
            brands={brands}
            showOwnedRing={showOwnedRing}
            onToggleOwnedRing={toggleOwnedRing}
            ownedFilter={ownedFilter}
            onToggleOwnedFilter={toggleOwnedFilter}
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
            <ColorWheel
              paintGroups={paintGroups}
              brandFilter={brandFilter}
              searchMatchIds={searchMatchIds}
              zoom={zoom}
              pan={pan}
              onZoomChange={setZoom}
              onPanChange={setPan}
              selectedGroup={selectedGroup}
              hoveredGroup={hoveredGroup}
              onGroupClick={handleGroupClick}
              onHoverGroup={setHoveredGroup}
              showBrandRing={showBrandRing}
              colorScheme={colorScheme}
              selectedPaint={selectedPaint}
              isSchemeMatching={isSchemeMatching}
              ownedIds={ownedIds}
              showOwnedRing={showOwnedRing}
              ownedFilter={ownedFilter}
              onToggleOwned={toggleOwned}
              onRequestRemoveOwned={setPaintToRemove}
            />
          ) : (
            <GridView
              paintGroups={paintGroups}
              selectedGroup={selectedGroup}
              hoveredGroup={hoveredGroup}
              onGroupClick={handleGroupClick}
              onHoverGroup={setHoveredGroup}
              brandFilter={brandFilter}
              searchMatchIds={searchMatchIds}
              colorScheme={colorScheme}
              isSchemeMatching={isSchemeMatching}
              selectedPaint={selectedPaint}
              showBrandRing={showBrandRing}
              showOwnedRing={showOwnedRing}
              ownedIds={ownedIds}
              ownedFilter={ownedFilter}
            />
          )}

          {/* Stats overlay */}
          <StatsOverlay
            totalPaints={paints.length}
            totalColors={uniqueColorCount}
            totalBrands={brands.length}
            filteredPaintCount={filteredPaintCount}
            filteredColorCount={filteredColorCount}
            isAnyFilterActive={isAnyFilterActive}
          />

          {/* Reset button (wheel mode only) */}
          {viewMode === 'wheel' && (
            <button
              onClick={handleReset}
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
                  toggleOwned(paintToRemove.id);
                  setPaintToRemove(null);
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
  );
}
