'use client';

import { useCallback, useMemo, useState } from 'react';

import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

import ColorWheel from '@/components/ColorWheel';
import FiltersPanel from '@/components/FiltersPanel';
import PaintsPanel from '@/components/PaintsPanel';
import SidePanel from '@/components/SidePanel';
import TabStrip, { type TabId } from '@/components/TabStrip';
import { brands, paints } from '@/data/index';
import { useIsDesktop } from '@/hooks/useIsDesktop';
import { useOwnedPaints } from '@/hooks/useOwnedPaints';
import type { ColorScheme, PaintGroup, ProcessedPaint } from '@/types/paint';
import { hexToHsl, isMatchingScheme, paintToWheelPosition, WHEEL_RADIUS } from '@/utils/colorUtils';

export default function Home() {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isDesktop = useIsDesktop();
  const [activeTab, setActiveTab] = useState<TabId | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<PaintGroup | null>(null);
  const [selectedPaint, setSelectedPaint] = useState<ProcessedPaint | null>(null);
  const [hoveredGroup, setHoveredGroup] = useState<PaintGroup | null>(null);
  const [showBrandRing, setShowBrandRing] = useState(false);
  const [brandFilter, setBrandFilter] = useState<Set<string>>(new Set());
  const [colorScheme, setColorScheme] = useState<ColorScheme>('none');
  const [searchQuery, setSearchQuery] = useState('');

  // Owned paint state
  const { ownedIds, toggleOwned } = useOwnedPaints();
  const [showOwnedRing, setShowOwnedRing] = useState(false);
  const [ownedFilter, setOwnedFilter] = useState(false);

  const uniqueColorCount = useMemo(() => new Set(paints.map((p) => p.hex.toLowerCase())).size, []);

  // Default to filters tab on desktop, closed on mobile
  const effectiveTab = activeTab ?? (isDesktop ? 'filters' : null);

  const handleTabClick = useCallback(
    (tab: TabId) => {
      setActiveTab((prev) => {
        const effective = prev ?? (isDesktop ? 'filters' : null);
        return effective === tab ? null : tab;
      });
    },
    [isDesktop],
  );

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
      <nav className='navbar min-h-0 border-b border-base-300 bg-base-200 px-4 py-4'>
        <div className='flex-1'>
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
        {/* Tab strip — always visible */}
        <TabStrip activeTab={effectiveTab} onTabClick={handleTabClick} ownedCount={ownedIds.size} />

        {/* Side panel — slides in/out */}
        <SidePanel
          isOpen={effectiveTab !== null}
          activeTab={effectiveTab}
          onClose={() => setActiveTab(null)}
          onTabChange={setActiveTab}>
          {effectiveTab === 'filters' && (
            <FiltersPanel
              showBrandRing={showBrandRing}
              onToggleBrandRing={() => setShowBrandRing(!showBrandRing)}
              showOwnedRing={showOwnedRing}
              onToggleOwnedRing={() => setShowOwnedRing(!showOwnedRing)}
              brands={brands}
              brandPaintCounts={brandPaintCounts}
              brandFilter={brandFilter}
              isFiltered={isFiltered}
              onBrandFilter={handleBrandFilter}
              colorScheme={colorScheme}
              onColorScheme={setColorScheme}
              selectedPaint={hoveredGroup ? null : selectedPaint}
              displayGroup={displayGroup}
              hoveredGroup={hoveredGroup}
              onSelectPaint={(paint) => {
                if (isSearching) handleSelectSearchResult(paint);
                else if (displayGroup) handleSelectPaintFromGroup(paint, displayGroup);
              }}
              onBack={() => setSelectedPaint(null)}
              matches={isSearching ? searchResults : schemeMatches}
              isSearching={isSearching}
              ownedIds={ownedIds}
              onToggleOwned={toggleOwned}
            />
          )}
          {effectiveTab === 'paints' && (
            <PaintsPanel
              ownedIds={ownedIds}
              processedPaints={processedPaints}
              brands={brands}
              onToggleOwned={toggleOwned}
              onSelectPaint={handleSelectSearchResult}
              ownedFilter={ownedFilter}
              onToggleOwnedFilter={() => setOwnedFilter(!ownedFilter)}
              showOwnedRing={showOwnedRing}
              onToggleOwnedRing={() => setShowOwnedRing(!showOwnedRing)}
            />
          )}
        </SidePanel>

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
