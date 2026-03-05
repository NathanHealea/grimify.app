'use client';

import { useCallback, useMemo, useState } from 'react';

import { Bars3Icon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

import BrandLegend from '@/components/BrandLegend';
import ColorWheel from '@/components/ColorWheel';
import DetailPanel from '@/components/DetailPanel';
import Sidebar, { useIsDesktop } from '@/components/Sidebar';
import { brands, paints } from '@/data/index';
import type { ColorScheme, PaintGroup, ProcessedPaint } from '@/types/paint';
import { hexToHsl, isMatchingScheme, paintToWheelPosition, WHEEL_RADIUS } from '@/utils/colorUtils';

export default function Home() {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isDesktop = useIsDesktop();
  const [sidebarOpen, setSidebarOpen] = useState<boolean | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<PaintGroup | null>(null);
  const [selectedPaint, setSelectedPaint] = useState<ProcessedPaint | null>(null);
  const [hoveredGroup, setHoveredGroup] = useState<PaintGroup | null>(null);
  const [showBrandRing, setShowBrandRing] = useState(false);
  const [brandFilter, setBrandFilter] = useState<Set<string>>(new Set());
  const [colorScheme, setColorScheme] = useState<ColorScheme>('none');
  const [searchQuery, setSearchQuery] = useState('');

  const uniqueColorCount = useMemo(() => new Set(paints.map((p) => p.hex.toLowerCase())).size, []);

  // null = user hasn't toggled yet, derive from screen size
  const effectiveSidebarOpen = sidebarOpen ?? isDesktop;

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
      return (
        p.name.toLowerCase().includes(q) || p.hex.toLowerCase().includes(q) || brandName.toLowerCase().includes(q)
      );
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
  const isAnyFilterActive = isFiltered || isSearching || isSchemeActive;

  const filteredPaintCount = useMemo(() => {
    if (!isAnyFilterActive) return paints.length;
    return processedPaints.filter((p) => {
      const matchesBrand = !isFiltered || brandFilter.has(p.brand);
      const matchesSearch = !isSearching || searchMatchIds.has(p.id);
      const matchesScheme = !isSchemeActive || isSchemeMatching(p);
      return matchesBrand && matchesSearch && matchesScheme;
    }).length;
  }, [processedPaints, brandFilter, isFiltered, isSearching, searchMatchIds, isAnyFilterActive, isSchemeActive, isSchemeMatching]);

  const filteredColorCount = useMemo(() => {
    if (!isAnyFilterActive) return uniqueColorCount;
    return paintGroups.filter((g) =>
      g.paints.some((p) => {
        const matchesBrand = !isFiltered || brandFilter.has(p.brand);
        const matchesSearch = !isSearching || searchMatchIds.has(p.id);
        const matchesScheme = !isSchemeActive || isSchemeMatching(p);
        return matchesBrand && matchesSearch && matchesScheme;
      }),
    ).length;
  }, [paintGroups, brandFilter, isFiltered, isSearching, searchMatchIds, uniqueColorCount, isAnyFilterActive, isSchemeActive, isSchemeMatching]);

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
            onClick={() => setSidebarOpen(!effectiveSidebarOpen)}
            aria-label={effectiveSidebarOpen ? 'Close menu' : 'Open menu'}>
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
                setSearchQuery(e.target.value)
                setSelectedGroup(null)
                setSelectedPaint(null)
              }}
            />
            {searchQuery && (
              <button
                className='btn btn-circle btn-ghost btn-xs'
                onClick={() => {
                  setSearchQuery('')
                  setSelectedGroup(null)
                  setSelectedPaint(null)
                }}
                aria-label='Clear search'>
                <XMarkIcon className='size-3' />
              </button>
            )}
          </label>
        </div>

      </nav>

      <div className='flex flex-1 overflow-hidden'>
        <Sidebar isOpen={effectiveSidebarOpen} onClose={() => setSidebarOpen(false)}>
          {/* Brand Ring Toggle */}
          <section>
            <button
              className={`btn btn-sm w-full ${showBrandRing ? 'btn-active' : ''}`}
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
                className='btn btn-sm justify-start'
                style={
                  !isFiltered
                    ? { backgroundColor: '#888', borderColor: '#888', color: '#fff' }
                    : { borderColor: '#888', color: '#888' }
                }
                onClick={() => handleBrandFilter('all')}>
                All Brands
              </button>
              {brands.map((brand) => (
                <button
                  key={brand.id}
                  className='btn btn-sm justify-start'
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
                  { label: 'No Scheme', value: 'none', color: '#888' },
                  { label: 'Complementary', value: 'complementary', color: '#4fc3f7' },
                  { label: 'Split Complementary', value: 'split', color: '#ffee58' },
                  { label: 'Analogous', value: 'analogous', color: '#81c784' },
                ] as const
              ).map(({ label, value, color }) => (
                <button
                  key={value}
                  className='btn btn-sm justify-start'
                  style={
                    colorScheme === value
                      ? { backgroundColor: color, borderColor: color, color: '#fff' }
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
            />
          </section>
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
          />

          {/* Stats overlay */}
          <div className='absolute top-4 left-4 flex gap-2'>
            <span className='badge badge-sm bg-base-300/50 backdrop-blur-sm'>
              {!isAnyFilterActive ? paints.length : `${filteredPaintCount} / ${paints.length}`} paints
            </span>
            <span className='badge badge-sm bg-base-300/50 backdrop-blur-sm'>
              {!isAnyFilterActive ? uniqueColorCount : `${filteredColorCount} / ${uniqueColorCount}`} colors
            </span>
            <span className='badge badge-sm bg-base-300/50 backdrop-blur-sm'>{brands.length} brands</span>
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
