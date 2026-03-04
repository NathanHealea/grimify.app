'use client'

import { useCallback, useEffect, useState } from 'react'

import { Bars3Icon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

import ColorWheel from '@/components/ColorWheel'
import Sidebar from '@/components/Sidebar'
import { brands, paints } from '@/data/index'

export default function Home() {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Default closed on mobile, open on desktop
  useEffect(() => {
    setSidebarOpen(window.matchMedia('(min-width: 768px)').matches)
  }, [])

  const handleReset = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}>
        {/* Search */}
        <section>
          <label className="input w-full">
            <MagnifyingGlassIcon className="size-4 opacity-50" />
            <input type="text" placeholder="Search paints..." disabled />
          </label>
        </section>

        <div className="divider" />

        {/* Brand Filter */}
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase text-base-content/60">Brand Filter</h3>
          <div className="flex flex-col gap-2">
            {brands.map((brand) => (
              <label key={brand.id} className="flex cursor-not-allowed items-center gap-2">
                <input type="checkbox" className="checkbox checkbox-sm" checked disabled readOnly />
                <span className="text-sm">
                  {brand.icon} {brand.name}
                </span>
              </label>
            ))}
          </div>
        </section>

        <div className="divider" />

        {/* Brand Ring Toggle */}
        <section>
          <label className="flex cursor-not-allowed items-center justify-between">
            <span className="text-xs font-semibold uppercase text-base-content/60">Brand Ring</span>
            <input type="checkbox" className="toggle toggle-sm" disabled />
          </label>
        </section>

        <div className="divider" />

        {/* Header Stats */}
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase text-base-content/60">Stats</h3>
          <div className="flex flex-wrap gap-2">
            <span className="badge badge-sm">{paints.length} paints</span>
            <span className="badge badge-sm">{brands.length} brands</span>
          </div>
        </section>

        <div className="divider" />

        {/* Color Scheme Mode */}
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase text-base-content/60">Color Scheme</h3>
          <div className="flex flex-wrap gap-1">
            {['None', 'Complementary', 'Split-Comp', 'Analogous'].map((mode) => (
              <button key={mode} className="btn btn-sm" disabled>
                {mode}
              </button>
            ))}
          </div>
        </section>

        <div className="divider" />

        {/* Color Details */}
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase text-base-content/60">Color Details</h3>
          <p className="text-sm text-base-content/40">Select a paint to see details</p>
        </section>
      </Sidebar>

      <main className="relative flex-1">
        {/* Sidebar toggle */}
        {!sidebarOpen && (
          <button
            className="btn btn-ghost absolute left-3 top-3 z-10"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Bars3Icon className="size-6" />
          </button>
        )}

        <ColorWheel paints={paints} zoom={zoom} pan={pan} onZoomChange={setZoom} onPanChange={setPan} />

        {/* Reset button */}
        <button
          onClick={handleReset}
          className="btn btn-ghost btn-sm absolute right-4 bottom-4 bg-base-300/50 backdrop-blur-sm"
        >
          Reset View
        </button>

        {/* Zoom indicator */}
        <div className="absolute bottom-4 left-4 text-xs text-base-content/40">{zoom.toFixed(1)}x</div>
      </main>
    </div>
  )
}
