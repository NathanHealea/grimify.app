import BrandLegend from '@/components/BrandLegend';
import DetailPanel from '@/components/DetailPanel';
import type { Brand, ColorScheme, PaintGroup, ProcessedPaint } from '@/types/paint';

interface FiltersPanelProps {
  showBrandRing: boolean;
  onToggleBrandRing: () => void;
  showOwnedRing: boolean;
  onToggleOwnedRing: () => void;
  brands: Brand[];
  brandPaintCounts: Map<string, number>;
  brandFilter: Set<string>;
  isFiltered: boolean;
  onBrandFilter: (id: string) => void;
  colorScheme: ColorScheme;
  onColorScheme: (scheme: ColorScheme) => void;
  selectedPaint: ProcessedPaint | null;
  displayGroup: PaintGroup | null;
  hoveredGroup: PaintGroup | null;
  onSelectPaint: (paint: ProcessedPaint) => void;
  onBack: () => void;
  matches: ProcessedPaint[];
  isSearching: boolean;
  ownedIds: Set<string>;
  onToggleOwned: (paintId: string) => void;
}

const SCHEME_OPTIONS = [
  { label: 'No Scheme', value: 'none', color: '#6b7280', contentColor: '#fff' },
  { label: 'Complementary', value: 'complementary', color: '#38bdf8', contentColor: '#000' },
  { label: 'Split Complementary', value: 'split', color: '#facc15', contentColor: '#000' },
  { label: 'Analogous', value: 'analogous', color: '#4ade80', contentColor: '#000' },
] as const;

export default function FiltersPanel({
  showBrandRing,
  onToggleBrandRing,
  showOwnedRing,
  onToggleOwnedRing,
  brands,
  brandPaintCounts,
  brandFilter,
  isFiltered,
  onBrandFilter,
  colorScheme,
  onColorScheme,
  selectedPaint,
  displayGroup,
  hoveredGroup,
  onSelectPaint,
  onBack,
  matches,
  isSearching,
  ownedIds,
  onToggleOwned,
}: FiltersPanelProps) {
  return (
    <>
      {/* Ring Toggles */}
      <section>
        <div className='flex gap-1'>
          <button
            className={`btn btn-sm flex-1 ${showBrandRing ? '' : 'btn-outline'}`}
            style={
              showBrandRing
                ? { backgroundColor: '#6366f1', borderColor: '#6366f1', color: '#fff' }
                : { borderColor: '#6366f1', color: '#6366f1' }
            }
            onClick={onToggleBrandRing}>
            Brand Ring
          </button>
          <button
            className={`btn btn-sm flex-1 ${showOwnedRing ? '' : 'btn-outline'}`}
            style={
              showOwnedRing
                ? { backgroundColor: '#10b981', borderColor: '#10b981', color: '#fff' }
                : { borderColor: '#10b981', color: '#10b981' }
            }
            onClick={onToggleOwnedRing}>
            Owned Ring
          </button>
        </div>
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
            onClick={() => onBrandFilter('all')}>
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
              onClick={() => onBrandFilter(brand.id)}>
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
          {SCHEME_OPTIONS.map(({ label, value, color, contentColor }) => (
            <button
              key={value}
              className={`btn btn-sm justify-start ${colorScheme === value ? '' : 'btn-outline'}`}
              style={
                colorScheme === value
                  ? { backgroundColor: color, borderColor: color, color: contentColor }
                  : { borderColor: color, color }
              }
              onClick={() => onColorScheme(value)}>
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
          onSelectPaint={onSelectPaint}
          onBack={onBack}
          brands={brands}
          matches={matches}
          hasSearch={isSearching}
          scheme={colorScheme}
          ownedIds={ownedIds}
          onToggleOwned={onToggleOwned}
        />
      </section>
    </>
  );
}
