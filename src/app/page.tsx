'use client'

import { useCallback, useState } from 'react'

import ColorWheel from '@/components/ColorWheel'
import { brands, paints } from '@/data/index'

export default function Home() {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })

  const handleReset = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  return (
    <main className="relative h-screen w-screen">
      <ColorWheel paints={paints} zoom={zoom} pan={pan} onZoomChange={setZoom} onPanChange={setPan} />

      {/* Reset button */}
      <button
        onClick={handleReset}
        className="absolute right-4 bottom-4 rounded-lg bg-white/10 px-4 py-2 text-sm text-white/80 backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white"
      >
        Reset View
      </button>

      {/* Zoom indicator */}
      <div className="absolute bottom-4 left-4 text-xs text-white/40">{zoom.toFixed(1)}x</div>
    </main>
  )
}
