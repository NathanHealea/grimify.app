'use client';

import { useCallback, useMemo, useState } from 'react';

import { Bars3Icon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

import ColorWheel from '@/components/ColorWheel';
import Sidebar, { useIsDesktop } from '@/components/Sidebar';
import { brands, paints } from '@/data/index';
import type { ProcessedPaint } from '@/types/paint';
import { hexToHsl, paintToWheelPosition, WHEEL_RADIUS } from '@/utils/colorUtils';

function PaintDetails({ paint }: { paint: ProcessedPaint | null }) {
  if (!paint) {
    return <p className='text-sm text-base-content/40'>Select a paint to see details</p>;
  }

  const brand = brands.find((b) => b.id === paint.brand);
  const hsl = hexToHsl(paint.hex);

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex items-center gap-2'>
        <div className='size-8 rounded border border-base-300' style={{ backgroundColor: paint.hex }} />
        <div>
          <p className='text-sm font-semibold'>{paint.name}</p>
          <p className='text-xs text-base-content/60'>
            {brand?.icon} {brand?.name}
          </p>
        </div>
      </div>
      <div className='grid grid-cols-2 gap-x-4 gap-y-1 text-xs'>
        <span className='text-base-content/60'>Hex</span>
        <span className='font-mono'>{paint.hex.toUpperCase()}</span>
        <span className='text-base-content/60'>HSL</span>
        <span className='font-mono'>
          {Math.round(hsl.h)}° {Math.round(hsl.s * 100)}% {Math.round(hsl.l * 100)}%
        </span>
        <span className='text-base-content/60'>Type</span>
        <span>{paint.type}</span>
      </div>
    </div>
  );
}

export default function Home() {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isDesktop = useIsDesktop();
  const [sidebarOpen, setSidebarOpen] = useState<boolean | null>(null);
  const [selectedPaint, setSelectedPaint] = useState<ProcessedPaint | null>(null);
  const [hoveredPaint, setHoveredPaint] = useState<ProcessedPaint | null>(null);

  const uniqueColorCount = useMemo(
    () => new Set(paints.map((p) => p.hex.toLowerCase())).size,
    [],
  );

  // null = user hasn't toggled yet, derive from screen size
  const effectiveSidebarOpen = sidebarOpen ?? isDesktop;

  const processedPaints = useMemo<ProcessedPaint[]>(
    () =>
      paints.map((paint) => {
        const hsl = hexToHsl(paint.hex);
        const pos = paintToWheelPosition(hsl.h, hsl.l, WHEEL_RADIUS);
        return {
          ...paint,
          id: `${paint.brand}-${paint.name}`,
          x: pos.x,
          y: pos.y,
        };
      }),
    [],
  );

  const handleReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

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
          <span className='badge badge-sm'>{paints.length} paints</span>
          <span className='badge badge-sm'>{uniqueColorCount} colors</span>
          <span className='badge badge-sm'>{brands.length} brands</span>
        </div>
      </nav>

      <div className='flex flex-1 overflow-hidden'>
        <Sidebar isOpen={effectiveSidebarOpen} onClose={() => setSidebarOpen(false)}>
          {/* Brand Ring Toggle */}
          <section>
            <label className='flex cursor-not-allowed items-center justify-between'>
              <span className='text-xs font-semibold uppercase text-base-content/60'>Brand Ring</span>
              <input type='checkbox' className='toggle toggle-sm' disabled />
            </label>
          </section>

          <div className='divider' />

          {/* Brand Filter */}
          <section>
            <h3 className='mb-2 text-xs font-semibold uppercase text-base-content/60'>Brand Filter</h3>
            <div className='flex flex-col gap-2'>
              {brands.map((brand) => (
                <label key={brand.id} className='flex cursor-not-allowed items-center gap-2'>
                  <input type='checkbox' className='checkbox checkbox-sm' checked disabled readOnly />
                  <span className='text-sm'>
                    {brand.icon} {brand.name}
                  </span>
                </label>
              ))}
            </div>
          </section>

          <div className='divider' />

          {/* Color Scheme Mode */}
          <section>
            <h3 className='mb-2 text-xs font-semibold uppercase text-base-content/60'>Color Scheme</h3>
            <div className='flex flex-wrap gap-1'>
              {['None', 'Complementary', 'Split-Comp', 'Analogous'].map((mode) => (
                <button key={mode} className='btn btn-sm' disabled>
                  {mode}
                </button>
              ))}
            </div>
          </section>

          <div className='divider' />

          {/* Color Details */}
          <section>
            <h3 className='mb-2 text-xs font-semibold uppercase text-base-content/60'>Color Details</h3>
            <PaintDetails paint={hoveredPaint ?? selectedPaint} />
          </section>
        </Sidebar>

        <main className='relative flex-1'>
          <ColorWheel
            processedPaints={processedPaints}
            zoom={zoom}
            pan={pan}
            onZoomChange={setZoom}
            onPanChange={setPan}
            selectedPaint={selectedPaint}
            hoveredPaint={hoveredPaint}
            onSelectPaint={setSelectedPaint}
            onHoverPaint={setHoveredPaint}
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
