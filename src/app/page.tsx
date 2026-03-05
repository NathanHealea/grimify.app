'use client';

import { useCallback, useMemo, useState } from 'react';

import { Bars3Icon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

import BrandLegend from '@/components/BrandLegend';
import ColorWheel from '@/components/ColorWheel';
import DetailPanel from '@/components/DetailPanel';
import Sidebar, { useIsDesktop } from '@/components/Sidebar';
import { brands, paints } from '@/data/index';
import type { ColorScheme, PaintGroup, ProcessedPaint } from '@/types/paint';
import { getSchemeMatches, hexToHsl, paintToWheelPosition, WHEEL_RADIUS } from '@/utils/colorUtils';

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

  const isFiltered = brandFilter.size > 0;

  const filteredPaintCount = useMemo(
    () => (!isFiltered ? paints.length : processedPaints.filter((p) => brandFilter.has(p.brand)).length),
    [processedPaints, brandFilter, isFiltered],
  );

  const filteredColorCount = useMemo(
    () =>
      !isFiltered ? uniqueColorCount : paintGroups.filter((g) => g.paints.some((p) => brandFilter.has(p.brand))).length,
    [paintGroups, brandFilter, isFiltered, uniqueColorCount],
  );

  const schemeMatches = useMemo<ProcessedPaint[]>(() => {
    if (colorScheme === 'none' || !selectedPaint) return [];
    const hsl = hexToHsl(selectedPaint.hex);
    const matches = getSchemeMatches(hsl.h, processedPaints, colorScheme);
    return processedPaints.filter((_, i) => matches[i]);
  }, [colorScheme, selectedPaint, processedPaints]);

  const schemeMatchIds = useMemo(() => new Set(schemeMatches.map((p) => p.id)), [schemeMatches]);

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
          <label className='input input-sm w-full max-w-sm'>
            <MagnifyingGlassIcon className='size-4 opacity-50' />
            <input type='text' placeholder='Search paints...' disabled />
          </label>
        </div>

        <div className='navbar-end w-auto justify-end gap-2'>
          <span className='badge badge-sm'>
            {!isFiltered ? paints.length : `${filteredPaintCount} / ${paints.length}`} paints
          </span>
          <span className='badge badge-sm'>
            {!isFiltered ? uniqueColorCount : `${filteredColorCount} / ${uniqueColorCount}`} colors
          </span>
          <span className='badge badge-sm'>{brands.length} brands</span>
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
            <div className='flex flex-wrap gap-1'>
              {(
                [
                  { label: 'None', value: 'none' },
                  { label: 'Complementary', value: 'complementary' },
                  { label: 'Split-Comp', value: 'split-complementary' },
                  { label: 'Analogous', value: 'analogous' },
                ] as const
              ).map(({ label, value }) => (
                <button
                  key={value}
                  className={`btn btn-sm ${colorScheme === value ? 'btn-active' : ''}`}
                  disabled={!selectedPaint}
                  onClick={() => setColorScheme(value)}>
                  {label}
                </button>
              ))}
            </div>
          </section>

          <div className='divider' />

          {/* Color Details */}
          <section>
            <h3 className='mb-2 text-xs font-semibold uppercase text-base-content/60'>Color Details</h3>
            <DetailPanel
              group={displayGroup}
              selectedPaint={hoveredGroup ? null : selectedPaint}
              onSelectPaint={(paint) => {
                if (displayGroup) handleSelectPaintFromGroup(paint, displayGroup);
              }}
              onBack={() => setSelectedPaint(null)}
              brands={brands}
              matches={schemeMatches}
              hasSearch={false}
              scheme={colorScheme === 'none' ? 'None' : colorScheme}
            />
          </section>
        </Sidebar>

        <main className='relative flex-1 overflow-hidden'>
          <ColorWheel
            paintGroups={paintGroups}
            brandFilter={brandFilter}
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
            schemeMatchIds={schemeMatchIds}
          />

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
