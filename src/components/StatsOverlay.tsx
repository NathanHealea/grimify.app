'use client';

interface StatsOverlayProps {
  totalPaints: number;
  totalColors: number;
  totalBrands: number;
  filteredPaintCount: number;
  filteredColorCount: number;
  isAnyFilterActive: boolean;
}

export default function StatsOverlay({
  totalPaints,
  totalColors,
  totalBrands,
  filteredPaintCount,
  filteredColorCount,
  isAnyFilterActive,
}: StatsOverlayProps) {
  return (
    <div className='absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2'>
      <span className='text-xs text-base-content/40'>
        {!isAnyFilterActive ? totalPaints : `${filteredPaintCount} / ${totalPaints}`} paints
      </span>
      <span className='text-xs text-base-content/40'>
        {!isAnyFilterActive ? totalColors : `${filteredColorCount} / ${totalColors}`} colors
      </span>
      <span className='text-xs text-base-content/40'>{totalBrands} brands</span>
    </div>
  );
}
