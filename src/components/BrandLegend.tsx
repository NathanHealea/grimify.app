import type { Brand } from '@/types/paint';

interface BrandLegendProps {
  brands: Brand[];
  paintCounts: Map<string, number>;
}

export default function BrandLegend({ brands, paintCounts }: BrandLegendProps) {
  return (
    <div className='flex flex-col gap-2'>
      {brands.map((brand) => (
        <div key={brand.id} className='flex items-center gap-2'>
          <div className='size-3 rounded-full border border-base-300' style={{ backgroundColor: brand.color }} />
          <span className='text-sm'>{brand.icon}</span>
          <span className='flex-1 text-sm'>{brand.name}</span>
          <span className='text-xs text-base-content/60'>{paintCounts.get(brand.id) ?? 0}</span>
        </div>
      ))}
    </div>
  );
}
