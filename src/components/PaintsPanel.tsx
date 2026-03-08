'use client';

import { useMemo, useState } from 'react';

import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

import type { Brand, ProcessedPaint } from '@/types/paint';

interface PaintsPanelProps {
  ownedIds: Set<string>;
  processedPaints: ProcessedPaint[];
  brands: Brand[];
  onToggleOwned: (paintId: string) => void;
  onSelectPaint: (paint: ProcessedPaint) => void;
  ownedFilter: boolean;
  onToggleOwnedFilter: () => void;
  showOwnedRing: boolean;
  onToggleOwnedRing: () => void;
}

export default function PaintsPanel({
  ownedIds,
  processedPaints,
  brands,
  onToggleOwned,
  onSelectPaint,
  ownedFilter,
  onToggleOwnedFilter,
  showOwnedRing,
  onToggleOwnedRing,
}: PaintsPanelProps) {
  const [localSearch, setLocalSearch] = useState('');

  const ownedPaints = useMemo(() => processedPaints.filter((p) => ownedIds.has(p.id)), [processedPaints, ownedIds]);

  const filteredOwned = useMemo(() => {
    const q = localSearch.trim().toLowerCase();
    if (!q) return ownedPaints;
    return ownedPaints.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.hex.toLowerCase().includes(q) ||
        brands
          .find((b) => b.id === p.brand)
          ?.name.toLowerCase()
          .includes(q),
    );
  }, [ownedPaints, localSearch, brands]);

  return (
    <>
      {/* Toggles */}
      <section>
        <div className='flex flex-col gap-1'>
          <button
            className={`btn btn-sm w-full ${showOwnedRing ? '' : 'btn-outline'}`}
            style={
              showOwnedRing
                ? { backgroundColor: '#10b981', borderColor: '#10b981', color: '#fff' }
                : { borderColor: '#10b981', color: '#10b981' }
            }
            onClick={onToggleOwnedRing}>
            Owned Ring
          </button>
          <button
            className={`btn btn-sm w-full ${ownedFilter ? '' : 'btn-outline'}`}
            style={
              ownedFilter
                ? { backgroundColor: '#10b981', borderColor: '#10b981', color: '#fff' }
                : { borderColor: '#10b981', color: '#10b981' }
            }
            onClick={onToggleOwnedFilter}>
            Show Only Owned ({ownedIds.size})
          </button>
        </div>
      </section>

      <div className='divider' />

      {/* Collection header + search */}
      <section>
        <h3 className='mb-2 text-xs font-semibold uppercase text-base-content/60'>
          My Collection ({ownedPaints.length})
        </h3>
        {ownedPaints.length > 0 && (
          <label className='input input-sm mb-2 w-full'>
            <MagnifyingGlassIcon className='size-4 opacity-50' />
            <input
              type='text'
              placeholder='Search owned...'
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
            {localSearch && (
              <button
                className='btn btn-circle btn-ghost btn-xs'
                onClick={() => setLocalSearch('')}
                aria-label='Clear search'>
                <XMarkIcon className='size-3' />
              </button>
            )}
          </label>
        )}
      </section>

      {/* Paint list */}
      <section className='flex-1'>
        {ownedPaints.length === 0 ? (
          <p className='text-xs text-base-content/40'>
            No paints in your collection yet. Select a paint on the wheel and mark it as owned from the Filters panel.
          </p>
        ) : filteredOwned.length === 0 ? (
          <p className='text-xs text-base-content/40'>No owned paints match your search.</p>
        ) : (
          <div className='flex flex-col gap-0.5'>
            {filteredOwned.map((p) => {
              const brand = brands.find((b) => b.id === p.brand);
              return (
                <div key={p.id} className='flex items-center gap-2 rounded px-2 py-1 hover:bg-base-300'>
                  <button className='flex min-w-0 flex-1 items-center gap-2 text-left' onClick={() => onSelectPaint(p)}>
                    <div
                      className='size-4 shrink-0 rounded border border-base-300'
                      style={{ backgroundColor: p.hex }}
                    />
                    <span className='truncate text-sm'>{p.name}</span>
                    <span className='ml-auto text-[10px] text-base-content/40'>{brand?.icon}</span>
                  </button>
                  <button
                    className='btn btn-ghost btn-xs'
                    onClick={() => onToggleOwned(p.id)}
                    aria-label={`Remove ${p.name} from collection`}>
                    <XMarkIcon className='size-3' />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
