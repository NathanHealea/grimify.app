'use client';

import { useCallback, useMemo, useState } from 'react';

import { Bars3Icon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

import BrandLegend from '@/components/BrandLegend';
import CollectionPanel from '@/components/CollectionPanel';
import ColorWheel from '@/components/ColorWheel';
import DetailPanel from '@/components/DetailPanel';
import Sidebar, { useIsDesktop } from '@/components/Sidebar';
import { brands, paints } from '@/data/index';
import { useOwnedPaints } from '@/hooks/useOwnedPaints';
import type { ColorScheme, PaintGroup, ProcessedPaint } from '@/types/paint';
import { hexToHsl, isMatchingScheme, paintToWheelPosition, WHEEL_RADIUS } from '@/utils/colorUtils';

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
  const [showBrandRing, setShowBrandRing] = useState(false);
  const [brandFilter, setBrandFilter] = useState<Set<string>>(new Set());
  const [colorScheme, setColorScheme] = useState<ColorScheme>('none');
  const [searchQuery, setSearchQuery] = useState('');
  const { ownedIds, toggleOwned } = useOwnedPaints();
  const [showOwnedRing, setShowOwnedRing] = useState(false);
  const [ownedFilter, setOwnedFilter] = useState(false);

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

  const searchResults = useMemo<ProcessedPaint[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return processedPaints.filter((p) => {
      const brandName = brands.find((b) => b.id === p.brand)?.name ?? '';
      return p.name.toLowerCase().includes(q) || p.hex.toLowerCase().includes(q) || brandName.toLowerCase().includes(q);
    });
  }, [processedPaints, searchQuery]);

  const searchMatchIds = useMemo(() => new Set(searchResults.map((p) => p.id)), [searchResults]);

  const isSearching = searchQuery.trim().length > 0;

  const isFiltered = brandFilter.size > 0;

  const isSchemeMatching = useCallback(
    (paint: ProcessedPaint) => {
      if (!selectedPaint || colorScheme === 'none') return true;
      if (paint.id === selectedPaint.id) return true;
      const selectedHsl = hexToHsl(selectedPaint.hex);
      const paintHsl = hexToHsl(paint.hex);
      return isMatchingScheme(paintHsl.h, selectedHsl.h, colorScheme);
    },
    [selectedPaint, colorScheme],
  );

  const schemeMatches = useMemo<ProcessedPaint[]>(() => {
    if (colorScheme === 'none' || !selectedPaint) return [];
    return processedPaints.filter((p) => p.id !== selectedPaint.id && isSchemeMatching(p));
  }, [colorScheme, selectedPaint, processedPaints, isSchemeMatching]);

  const isSchemeActive = colorScheme !== 'none' && selectedPaint !== null;
  const isAnyFilterActive = isFiltered || isSearching || isSchemeActive || ownedFilter;

  const filteredPaintCount = useMemo(() => {
    if (!isAnyFilterActive) return paints.length;
    return processedPaints.filter((p) => {
      const matchesBrand = !isFiltered || brandFilter.has(p.brand);
      const matchesSearch = !isSearching || searchMatchIds.has(p.id);
      const matchesScheme = !isSchemeActive || isSchemeMatching(p);
      const matchesOwned = !ownedFilter || ownedIds.has(p.id);
      return matchesBrand && matchesSearch && matchesScheme && matchesOwned;
    }).length;
  }, [
    processedPaints,
    brandFilter,
    isFiltered,
    isSearching,
    searchMatchIds,
    isAnyFilterActive,
    isSchemeActive,
    isSchemeMatching,
    ownedFilter,
    ownedIds,
  ]);

  const filteredColorCount = useMemo(() => {
    if (!isAnyFilterActive) return uniqueColorCount;
    return paintGroups.filter((g) =>
      g.paints.some((p) => {
        const matchesBrand = !isFiltered || brandFilter.has(p.brand);
        const matchesSearch = !isSearching || searchMatchIds.has(p.id);
        const matchesScheme = !isSchemeActive || isSchemeMatching(p);
        const matchesOwned = !ownedFilter || ownedIds.has(p.id);
        return matchesBrand && matchesSearch && matchesScheme && matchesOwned;
      }),
    ).length;
  }, [
    paintGroups,
    brandFilter,
    isFiltered,
    isSearching,
    searchMatchIds,
    uniqueColorCount,
    isAnyFilterActive,
    isSchemeActive,
    isSchemeMatching,
    ownedFilter,
    ownedIds,
  ]);

  const handleBrandFilter = useCallback((id: string) => {
    setBrandFilter((prev) => {
      if (id === 'all') return new Set();
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setSelectedGroup(null);
    setSelectedPaint(null);
  }, []);

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
    [selectedGroup],
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
          <label className='input input-sm w-full'>
            <MagnifyingGlassIcon className='size-4 opacity-50' />
            <input
              type='text'
              placeholder='Search paints...'
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedGroup(null);
                setSelectedPaint(null);
              }}
            />
            {searchQuery && (
              <button
                className='btn btn-circle btn-ghost btn-xs'
                onClick={() => {
                  setSearchQuery('');
                  setSelectedGroup(null);
                  setSelectedPaint(null);
                }}
                aria-label='Clear search'>
                <XMarkIcon className='size-3' />
              </button>
            )}
          </label>
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
          <section>
            <button
              className={`btn btn-sm w-full ${showBrandRing ? '' : 'btn-outline'}`}
              style={
                showBrandRing
                  ? { backgroundColor: '#6366f1', borderColor: '#6366f1', color: '#fff' }
                  : { borderColor: '#6366f1', color: '#6366f1' }
              }
              onClick={() => setShowBrandRing(!showBrandRing)}>
              Brand Ring
            </button>
          </section>

          <div className='divider' />

          {/* Brand Legend */}
          <section>
            <h3 className='mb-2 text-xs font-semibold uppercase text-base-content/60'>Brands</h3>
            <BrandLegend brands={brands} paintCounts={brandPaintCounts} />
          </section>

          <div className='divider' />

          {/* Brand Filter */}
          <section>
            <h3 className='mb-2 text-xs font-semibold uppercase text-base-content/60'>Brand Filter</h3>
            <div className='flex flex-col gap-1'>
              <button
                className={`btn btn-sm justify-start ${!isFiltered ? 'btn-neutral' : 'btn-outline btn-neutral'}`}
                onClick={() => handleBrandFilter('all')}>
                All Brands
              </button>
              {brands.map((brand) => (
                <button
                  key={brand.id}
                  className={`btn btn-sm justify-start ${brandFilter.has(brand.id) ? '' : 'btn-outline'}`}
                  style={
                    brandFilter.has(brand.id)
                      ? { backgroundColor: brand.color, borderColor: brand.color, color: '#fff' }
                      : { borderColor: brand.color, color: brand.color }
                  }
                  onClick={() => handleBrandFilter(brand.id)}>
                  {brand.icon} {brand.name}
                </button>
              ))}
            </div>
          </section>

          <div className='divider' />

          {/* Color Scheme Mode */}
          <section>
            <h3 className='mb-2 text-xs font-semibold uppercase text-base-content/60'>Color Scheme</h3>
            <div className='flex flex-col gap-1'>
              {(
                [
                  { label: 'No Scheme', value: 'none', color: '#6b7280', contentColor: '#fff' },
                  { label: 'Complementary', value: 'complementary', color: '#38bdf8', contentColor: '#000' },
                  { label: 'Split Complementary', value: 'split', color: '#facc15', contentColor: '#000' },
                  { label: 'Analogous', value: 'analogous', color: '#4ade80', contentColor: '#000' },
                ] as const
              ).map(({ label, value, color, contentColor }) => (
                <button
                  key={value}
                  className={`btn btn-sm justify-start ${colorScheme === value ? '' : 'btn-outline'}`}
                  style={
                    colorScheme === value
                      ? { backgroundColor: color, borderColor: color, color: contentColor }
                      : { borderColor: color, color }
                  }
                  onClick={() => setColorScheme(value)}>
                  {label}
                </button>
              ))}
            </div>
            {colorScheme !== 'none' && !selectedPaint && (
              <p className='mt-1 text-xs text-base-content/40'>Click a paint to see its {colorScheme} colors</p>
            )}
          </section>

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
            onToggleOwnedRing={() => setShowOwnedRing(!showOwnedRing)}
            ownedFilter={ownedFilter}
            onToggleOwnedFilter={() => {
              setOwnedFilter(!ownedFilter);
              setSelectedGroup(null);
              setSelectedPaint(null);
            }}
          />
        </Sidebar>

        <main className='relative flex-1 overflow-hidden'>
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
          />

          {/* Stats overlay */}
          <div className='absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2'>
            <span className='text-xs text-base-content/40'>
              {!isAnyFilterActive ? paints.length : `${filteredPaintCount} / ${paints.length}`} paints
            </span>
            <span className='text-xs text-base-content/40'>
              {!isAnyFilterActive ? uniqueColorCount : `${filteredColorCount} / ${uniqueColorCount}`} colors
            </span>
            <span className='text-xs text-base-content/40'>{brands.length} brands</span>
          </div>

          {/* Reset button */}
          <button
            onClick={handleReset}
            className='btn btn-ghost btn-sm absolute right-4 bottom-4 bg-base-300/50 backdrop-blur-sm'>
            Reset View
          </button>

          {/* Zoom indicator */}
          <div className='absolute bottom-4 left-4 text-xs text-base-content/40'>{zoom.toFixed(1)}x</div>
        </main>
      </div>
    </div>
  );
}
