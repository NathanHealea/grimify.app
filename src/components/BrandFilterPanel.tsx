'use client'

import type { Brand } from '@/types/paint'

interface BrandFilterPanelProps {
  brands: Brand[]
  brandFilter: Set<string>
  isFiltered: boolean
  onBrandFilter: (id: string) => void
}

export default function BrandFilterPanel({ brands, brandFilter, isFiltered, onBrandFilter }: BrandFilterPanelProps) {
  return (
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
  )
}
