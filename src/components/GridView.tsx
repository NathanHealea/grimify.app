'use client';

import { useMemo } from 'react';

import { brands } from '@/data/index';
import type { ColorScheme, PaintGroup, ProcessedPaint } from '@/types/paint';
import { comparePaintGroups } from '@/utils/colorUtils';

interface GridViewProps {
  paintGroups: PaintGroup[];
  selectedGroup: PaintGroup | null;
  hoveredGroup: PaintGroup | null;
  onGroupClick: (group: PaintGroup) => void;
  onHoverGroup: (group: PaintGroup | null) => void;
  brandFilter: Set<string>;
  searchMatchIds: Set<string>;
  colorScheme: ColorScheme;
  isSchemeMatching: (paint: ProcessedPaint) => boolean;
  selectedPaint: ProcessedPaint | null;
  showBrandRing: boolean;
  showOwnedRing: boolean;
  ownedIds: Set<string>;
  ownedFilter: boolean;
}

export default function GridView({
  paintGroups,
  selectedGroup,
  onGroupClick,
  onHoverGroup,
  brandFilter,
  searchMatchIds,
  colorScheme,
  isSchemeMatching,
  selectedPaint,
  showBrandRing,
  showOwnedRing,
  ownedIds,
  ownedFilter,
}: GridViewProps) {
  const sorted = useMemo(() => [...paintGroups].sort(comparePaintGroups), [paintGroups]);

  return (
    <div
      className='grid h-full gap-[2px] overflow-y-auto p-2'
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(3rem, 1fr))' }}>
      {sorted.map((group) => {
        const matchesBrand = brandFilter.size === 0 || group.paints.some((p) => brandFilter.has(p.brand));
        const matchesSearch = searchMatchIds.size === 0 || group.paints.some((p) => searchMatchIds.has(p.id));
        const matchesOwned = !ownedFilter || group.paints.some((p) => ownedIds.has(p.id));
        const hasActiveScheme = colorScheme !== 'none' && selectedPaint !== null;
        const schemeDimmed = !group.paints.some(isSchemeMatching);
        const dimmed = !matchesBrand || !matchesOwned || (hasActiveScheme ? schemeDimmed : !matchesSearch);
        const isSelected = selectedGroup?.key === group.key;
        const isMulti = group.paints.length > 1;
        const isOwned = group.paints.some((p) => ownedIds.has(p.id));

        const brandName = brands.find((b) => b.id === group.rep.brand)?.name ?? group.rep.brand;
        const title = isMulti
          ? `${group.paints.length} paints: ${group.paints.map((p) => p.name).join(', ')}\n${group.rep.hex.toUpperCase()}`
          : `${group.rep.name}\n${brandName}\n${group.rep.hex.toUpperCase()}`;

        const uniqueBrands = showBrandRing
          ? [...new Set(group.paints.map((p) => p.brand))].map((id) => brands.find((b) => b.id === id)).filter(Boolean)
          : [];

        return (
          <button
            key={group.key}
            className={`relative cursor-pointer transition-transform hover:scale-110 ${isSelected ? 'ring-2 ring-white' : ''}`}
            style={{
              aspectRatio: '1',
              backgroundColor: group.rep.hex,
              opacity: dimmed ? (schemeDimmed && hasActiveScheme ? 0.06 : 0.15) : 1,
            }}
            title={title}
            onClick={() => onGroupClick(group)}
            onPointerEnter={() => onHoverGroup(group)}
            onPointerLeave={() => onHoverGroup(null)}>
            {/* Multi-paint count badge */}
            {isMulti && (
              <span className='absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#f0c040] text-[9px] font-extrabold text-black'>
                {group.paints.length}
              </span>
            )}

            {/* Brand indicator dots */}
            {showBrandRing && uniqueBrands.length > 0 && (
              <div className='absolute bottom-0 left-0 flex gap-px p-px'>
                {uniqueBrands.map((brand) => (
                  <span
                    key={brand!.id}
                    className='block h-1.5 w-1.5 rounded-full'
                    style={{ backgroundColor: brand!.color }}
                  />
                ))}
              </div>
            )}

            {/* Owned indicator */}
            {showOwnedRing && isOwned && !dimmed && (
              <span className='absolute top-0 left-0 flex h-3 w-3 items-center justify-center text-[8px] leading-none text-emerald-400'>
                ✓
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
